from __future__ import annotations

from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.mixins import TenantQuerysetMixin
from apps.records.models import AuditEvent, NormalizedRecord, RecordFlag
from apps.records.serializers import (
    AuditEventSerializer,
    NormalizedRecordDetailSerializer,
    NormalizedRecordListSerializer,
    NormalizedRecordUpdateSerializer,
    RecordFlagSerializer,
)


class NormalizedRecordViewSet(TenantQuerysetMixin, viewsets.GenericViewSet, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin):
    permission_classes = [IsAuthenticated]
    queryset = NormalizedRecord.objects.all()
    lookup_field = "pk"

    def get_queryset(self):
        client_slug = self.get_client_slug()
        audit_prefetch = Prefetch("audit_trail", queryset=AuditEvent.objects.order_by("-timestamp"), to_attr="prefetched_audit_events")
        flags_prefetch = Prefetch("flags", queryset=RecordFlag.objects.filter(dismissed_at__isnull=True), to_attr="prefetched_flags")
        queryset = (
            NormalizedRecord.objects.select_related("client", "raw_record", "import_job", "approved_by", "edited_by")
            .prefetch_related(audit_prefetch, flags_prefetch)
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
        return queryset.annotate(flags_count=Count("flags", filter=Q(flags__dismissed_at__isnull=True), distinct=True))

    def get_serializer_class(self):
        if self.action == "list":
            return NormalizedRecordListSerializer
        if self.action in {"update", "partial_update"}:
            return NormalizedRecordUpdateSerializer
        return NormalizedRecordDetailSerializer

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
            record.status = NormalizedRecord.Status.APPROVED
            record.approved_by = request.user
            record.approved_at = timezone.now()
            record.locked = True
            record.save(update_fields=["status", "approved_by", "approved_at", "locked", "calculated_kgco2e", "updated_at"])
            AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.APPROVED, actor=request.user, detail={})
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
            for record in records:
                if record.locked:
                    continue
                record.status = NormalizedRecord.Status.APPROVED
                record.approved_by = request.user
                record.approved_at = timezone.now()
                record.locked = True
                record.save(update_fields=["status", "approved_by", "approved_at", "locked", "calculated_kgco2e", "updated_at"])
                AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.APPROVED, actor=request.user, detail={})
                AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.LOCKED, actor=request.user, detail={})
        return Response({"approved": len(records), "errors": []})

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