from __future__ import annotations

import csv
import io
from datetime import datetime
from decimal import Decimal

from django.http import HttpResponse
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.mixins import TenantQuerysetMixin
from apps.emissions.services import resolve_emission_factor
from apps.records.models import AuditEvent, NormalizedRecord, RecordComment, RecordFlag
from apps.records.serializers import (
    AuditEventSerializer,
    NormalizedRecordDetailSerializer,
    NormalizedRecordListSerializer,
    NormalizedRecordUpdateSerializer,
    RecordCommentSerializer,
    RecordFlagSerializer,
)
from apps.tenants.models import UserProfile


class NormalizedRecordViewSet(TenantQuerysetMixin, viewsets.GenericViewSet, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin):
    permission_classes = [IsAuthenticated]
    queryset = NormalizedRecord.objects.all()
    lookup_field = "pk"

    def get_queryset(self):
        client_slug = self.get_client_slug()
        audit_prefetch = Prefetch("audit_trail", queryset=AuditEvent.objects.order_by("-timestamp"), to_attr="prefetched_audit_events")
        flags_prefetch = Prefetch("flags", queryset=RecordFlag.objects.filter(dismissed_at__isnull=True), to_attr="prefetched_flags")
        comments_prefetch = Prefetch("comments", queryset=RecordComment.objects.select_related("author").order_by("created_at"), to_attr="prefetched_comments")
        queryset = (
            NormalizedRecord.objects.select_related("client", "raw_record", "import_job", "approved_by", "secondary_approved_by", "edited_by")
            .prefetch_related(audit_prefetch, flags_prefetch, comments_prefetch)
            .filter(client__slug=client_slug)
        )
        source = self.request.query_params.get("source")
        scope = self.request.query_params.get("scope")
        status_value = self.request.query_params.get("status")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if source:
            queryset = queryset.filter(source_type=source)
        if scope:
            queryset = queryset.filter(scope=scope)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if date_from:
            queryset = queryset.filter(period_end__gte=date_from)
        if date_to:
            queryset = queryset.filter(period_start__lte=date_to)
        return queryset.annotate(
            flags_count=Count("flags", filter=Q(flags__dismissed_at__isnull=True), distinct=True),
            comments_count=Count("comments", distinct=True),
        )

    def get_serializer_class(self):
        if self.action == "list":
            return NormalizedRecordListSerializer
        if self.action in {"update", "partial_update"}:
            return NormalizedRecordUpdateSerializer
        return NormalizedRecordDetailSerializer

    def _resolve_factor_snapshot(self, record, actor):
        factor = resolve_emission_factor(
            record.activity_category,
            record.unit,
            record.scope,
            region=self._record_region(record),
            as_of=record.period_end,
        )
        snapshot = {
            "factor_id": str(factor.id) if factor else None,
            "activity_category": factor.activity_category if factor else record.activity_category,
            "unit": factor.unit if factor else record.unit,
            "factor_kgco2e_per_unit": str(factor.factor_kgco2e_per_unit if factor else record.emission_factor),
            "source": factor.source if factor else record.emission_factor_source,
            "valid_from": factor.valid_from.isoformat() if factor else record.period_start.isoformat(),
            "region": factor.region if factor else self._record_region(record),
            "snapshotted_at": timezone.now().isoformat(),
            "snapshotted_by": getattr(actor, "username", ""),
        }
        warning = None
        if factor and (factor.factor_kgco2e_per_unit != record.emission_factor or factor.source != record.emission_factor_source):
            warning = "emission factor updated since normalization, snapshot reflects value at approval time"
        return snapshot, warning

    def _record_region(self, record):
        raw_data = getattr(getattr(record, "raw_record", None), "raw_data", {}) or {}
        return str(raw_data.get("region") or raw_data.get("country") or "GLOBAL")

    def _primary_approve(self, record, actor):
        snapshot, warning = self._resolve_factor_snapshot(record, actor)
        record.emission_factor_snapshot = snapshot
        record.approved_by = actor
        record.approved_at = timezone.now()
        approved_detail = {"warning": warning} if warning else {}
        if record.requires_dual_approval and record.secondary_approved_by_id is None:
            record.status = NormalizedRecord.Status.PENDING_SECONDARY_APPROVAL
            record.locked = False
            record.save(update_fields=["status", "approved_by", "approved_at", "emission_factor_snapshot", "locked", "updated_at"])
            AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.APPROVED, actor=actor, detail=approved_detail)
            return Response(
                {
                    "status": "pending_secondary_approval",
                    "message": "This record requires a second approver due to high emission value.",
                },
                status=status.HTTP_202_ACCEPTED,
            )
        record.status = NormalizedRecord.Status.APPROVED
        record.locked = True
        record.save(update_fields=["status", "approved_by", "approved_at", "emission_factor_snapshot", "locked", "updated_at"])
        AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.APPROVED, actor=actor, detail=approved_detail)
        AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.LOCKED, actor=actor, detail={})
        return Response(NormalizedRecordDetailSerializer(record, context=self.get_serializer_context()).data)

    def _is_admin_approver(self, user):
        if user.is_superuser:
            return True
        profile = getattr(user, "profile", None)
        return bool(profile and profile.role == UserProfile.Role.ADMIN)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_values = {field: getattr(instance, field) for field in serializer.validated_data.keys()}
        updated = serializer.save(edited_by=self.request.user, edited_at=timezone.now(), is_edited=True)
        changed_fields = []
        for field, old_value in old_values.items():
            new_value = getattr(updated, field)
            if old_value != new_value:
                changed_fields.append((field, old_value, new_value))
        audit_events = [AuditEvent(record=updated, event_type=AuditEvent.EventType.EDITED, actor=self.request.user, detail={"field": field, "old": str(old_value), "new": str(new_value)}) for field, old_value, new_value in changed_fields]
        if audit_events:
            AuditEvent.objects.bulk_create(audit_events)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        record = self.get_object()
        with transaction.atomic():
            if record.locked:
                raise ValidationError("Locked records cannot be modified")
            return self._primary_approve(record, request.user)

    @action(detail=True, methods=["post"], url_path="secondary-approve")
    def secondary_approve(self, request, pk=None):
        record = self.get_object()
        with transaction.atomic():
            if record.locked:
                raise ValidationError("Locked records cannot be modified")
            if record.status != NormalizedRecord.Status.PENDING_SECONDARY_APPROVAL:
                raise ValidationError("Record is not awaiting secondary approval")
            if not self._is_admin_approver(request.user):
                raise ValidationError("Secondary approval requires an admin user")
            if record.approved_by_id == request.user.id:
                raise ValidationError("The secondary approver must be different from the primary approver")
            record.secondary_approved_by = request.user
            record.secondary_approved_at = timezone.now()
            record.status = NormalizedRecord.Status.APPROVED
            record.locked = True
            record.save(update_fields=["status", "secondary_approved_by", "secondary_approved_at", "locked", "updated_at"])
            AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.LOCKED, actor=request.user, detail={})
        return Response(NormalizedRecordDetailSerializer(record, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        record = self.get_object()
        with transaction.atomic():
            if record.locked:
                raise ValidationError("Locked records cannot be modified")
            record.status = NormalizedRecord.Status.REJECTED
            record.save(update_fields=["status", "calculated_kgco2e", "updated_at"])
            AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.REJECTED, actor=request.user, detail={})
        return Response(NormalizedRecordDetailSerializer(record, context=self.get_serializer_context()).data)

    @action(detail=False, methods=["post"], url_path="bulk-approve")
    def bulk_approve(self, request):
        ids = request.data.get("ids") or []
        if not isinstance(ids, list):
            raise ValidationError({"ids": "Expected a list of record ids"})
        records = list(self.get_queryset().filter(id__in=ids))
        if len(records) != len(ids):
            raise ValidationError({"ids": "One or more records are not accessible for this client"})
        with transaction.atomic():
            approved = 0
            pending_secondary = 0
            for record in records:
                if record.locked:
                    continue
                response = self._primary_approve(record, request.user)
                if response.status_code == status.HTTP_202_ACCEPTED:
                    pending_secondary += 1
                else:
                    approved += 1
            return Response({"approved": approved, "pending_secondary_approval": pending_secondary, "errors": []})

    @action(detail=False, methods=["post"], url_path="bulk-reject")
    def bulk_reject(self, request):
        ids = request.data.get("ids") or []
        if not isinstance(ids, list):
            raise ValidationError({"ids": "Expected a list of record ids"})
        records = list(self.get_queryset().filter(id__in=ids))
        if len(records) != len(ids):
            raise ValidationError({"ids": "One or more records are not accessible for this client"})
        with transaction.atomic():
            for record in records:
                if record.locked:
                    continue
                record.status = NormalizedRecord.Status.REJECTED
                record.save(update_fields=["status", "calculated_kgco2e", "updated_at"])
                AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.REJECTED, actor=request.user, detail={})
        return Response({"rejected": len(records), "errors": []})

    @action(detail=True, methods=["delete"], url_path=r"flags/(?P<flag_id>[^/.]+)")
    def delete_flag(self, request, pk=None, flag_id=None):
        record = self.get_object()
        flag = record.flags.filter(id=flag_id).first()
        if not flag:
            raise ValidationError("Flag not found")
        with transaction.atomic():
            flag.dismissed_by = request.user
            flag.dismissed_at = timezone.now()
            flag.auto_dismissed = False
            flag.save(update_fields=["dismissed_by", "dismissed_at", "auto_dismissed"])
            AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.FLAG_DISMISSED, actor=request.user, detail={"flag_type": flag.flag_type})
            if record.status == NormalizedRecord.Status.FLAGGED and not record.flags.filter(dismissed_at__isnull=True).exclude(id=flag.id).exists():
                record.status = NormalizedRecord.Status.PENDING
                record.save(update_fields=["status", "calculated_kgco2e", "updated_at"])
        return Response(RecordFlagSerializer(flag, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        record = self.get_object()
        if request.method.lower() == "get":
            comments = getattr(record, "prefetched_comments", None)
            queryset = comments if comments is not None else record.comments.select_related("author").all()
            return Response(RecordCommentSerializer(queryset, many=True, context=self.get_serializer_context()).data)
        serializer = RecordCommentSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(record=record, author=request.user)
        if record.status == NormalizedRecord.Status.REJECTED:
            AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.EDITED, actor=request.user, detail={"action": "comment_added"})
        return Response(RecordCommentSerializer(comment, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"comments/(?P<comment_id>[^/.]+)")
    def comment_detail(self, request, pk=None, comment_id=None):
        record = self.get_object()
        comment = record.comments.filter(id=comment_id).first()
        if not comment:
            raise ValidationError("Comment not found")
        if comment.author_id != request.user.id:
            raise ValidationError("You can only edit or delete your own comments")
        if request.method.lower() == "delete":
            comment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = RecordCommentSerializer(comment, data=request.data, partial=True, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="factor-history")
    def factor_history(self, request, pk=None):
        record = self.get_object()
        snapshot = record.emission_factor_snapshot or {}
        current_factor = resolve_emission_factor(record.activity_category, record.unit, record.scope, region=self._record_region(record), as_of=record.period_end)
        current_payload = _factor_payload(current_factor)
        snapshot_payload = {
            "factor_id": snapshot.get("factor_id"),
            "activity_category": snapshot.get("activity_category"),
            "unit": snapshot.get("unit"),
            "factor_kgco2e_per_unit": snapshot.get("factor_kgco2e_per_unit"),
            "source": snapshot.get("source"),
            "valid_from": snapshot.get("valid_from"),
            "region": snapshot.get("region"),
            "snapshotted_at": snapshot.get("snapshotted_at"),
            "snapshotted_by": snapshot.get("snapshotted_by"),
        }
        snapshot_factor = {key: snapshot_payload.get(key) for key in ["factor_id", "activity_category", "unit", "factor_kgco2e_per_unit", "source", "valid_from", "region"]}
        current_factor_data = {key: current_payload.get(key) for key in ["factor_id", "activity_category", "unit", "factor_kgco2e_per_unit", "source", "valid_from", "region"]} if current_payload else None
        differs = snapshot_factor != current_factor_data
        percentage_difference = _percentage_difference(snapshot_payload.get("factor_kgco2e_per_unit"), current_payload.get("factor_kgco2e_per_unit") if current_payload else None)
        return Response({"snapshotted_factor": snapshot_payload, "current_factor": current_payload, "differs": differs, "percentage_difference": percentage_difference})


class AuditorExportView(TenantQuerysetMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        client = _client_from_request(request)
        export_format = request.query_params.get("format", "csv").lower()
        start = request.query_params.get("from")
        end = request.query_params.get("to")
        if not start or not end:
            raise ValidationError({"from": "Required", "to": "Required"})
        try:
            start_date = datetime.fromisoformat(start).date()
            end_date = datetime.fromisoformat(end).date()
        except ValueError as exc:
            raise ValidationError({"from": "Expected YYYY-MM-DD", "to": "Expected YYYY-MM-DD"}) from exc
        queryset = (
            NormalizedRecord.objects.select_related("client", "raw_record", "import_job", "approved_by")
            .prefetch_related(Prefetch("comments", queryset=RecordComment.objects.select_related("author").order_by("created_at"), to_attr="prefetched_comments"))
            .filter(client=client, locked=True, approved_at__date__gte=start_date, approved_at__date__lte=end_date)
            .order_by("approved_at", "id")
        )
        rows = [_export_row(record) for record in queryset]
        if export_format == "json":
            return Response(rows)
        if export_format != "csv":
            raise ValidationError({"format": "Expected csv or json"})
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=_EXPORT_FIELDS)
        writer.writeheader()
        writer.writerows(rows)
        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="veridian_export_{client.slug}_{end}.csv"'
        return response


def _factor_payload(factor):
    if not factor:
        return None
    return {
        "factor_id": str(factor.id),
        "activity_category": factor.activity_category,
        "unit": factor.unit,
        "factor_kgco2e_per_unit": str(factor.factor_kgco2e_per_unit),
        "source": factor.source,
        "valid_from": factor.valid_from.isoformat(),
        "region": factor.region,
    }


def _percentage_difference(snapshot_value, current_value):
    if snapshot_value in {None, ""} or current_value in {None, ""}:
        return None
    snapshot_decimal = Decimal(str(snapshot_value))
    if snapshot_decimal == 0:
        return None
    current_decimal = Decimal(str(current_value))
    return float((abs(current_decimal - snapshot_decimal) / snapshot_decimal) * 100)


_EXPORT_FIELDS = [
    "record_id",
    "source_type",
    "description",
    "activity_category",
    "period_start",
    "period_end",
    "quantity",
    "unit",
    "emission_factor",
    "emission_factor_source",
    "emission_factor_snapshotted_at",
    "calculated_kgco2e",
    "scope",
    "approved_by",
    "approved_at",
    "import_job_id",
    "was_edited",
    "analyst_comments",
]


def _export_row(record):
    snapshot = record.emission_factor_snapshot or {}
    comments = getattr(record, "prefetched_comments", None)
    public_comments = comments if comments is not None else record.comments.select_related("author").all()
    analyst_comments = "; ".join(comment.body for comment in public_comments if not comment.is_internal)
    return {
        "record_id": str(record.id),
        "source_type": record.source_type,
        "description": record.description,
        "activity_category": record.activity_category,
        "period_start": record.period_start.isoformat(),
        "period_end": record.period_end.isoformat(),
        "quantity": str(record.quantity),
        "unit": record.unit,
        "emission_factor": snapshot.get("factor_kgco2e_per_unit", str(record.emission_factor)),
        "emission_factor_source": snapshot.get("source", record.emission_factor_source),
        "emission_factor_snapshotted_at": snapshot.get("snapshotted_at", ""),
        "calculated_kgco2e": str(record.calculated_kgco2e),
        "scope": record.scope,
        "approved_by": getattr(record.approved_by, "username", ""),
        "approved_at": record.approved_at.isoformat() if record.approved_at else "",
        "import_job_id": str(record.import_job_id),
        "was_edited": record.is_edited,
        "analyst_comments": analyst_comments,
    }


def _client_from_request(request):
    slug = request.query_params.get("client") or request.data.get("client")
    if not slug:
        raise ValidationError({"client": "Required"})
    from apps.tenants.models import Client

    client = Client.objects.filter(slug=slug).first()
    if not client:
        raise ValidationError({"client": "Unknown client"})
    profile = getattr(request.user, "profile", None)
    if not (request.user.is_superuser or getattr(request.user, "is_staff", False) or (profile and profile.client_id == client.id)):
        raise ValidationError({"client": "You do not have access to this client"})
    return client