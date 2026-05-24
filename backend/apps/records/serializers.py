from __future__ import annotations

from rest_framework import serializers

from apps.records.models import AuditEvent, NormalizedRecord, RecordFlag


class RecordFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecordFlag
        fields = ["id", "record", "flag_type", "message", "auto_dismissed", "dismissed_by", "dismissed_at", "created_at"]


class AuditEventSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()

    class Meta:
        model = AuditEvent
        fields = ["id", "record", "event_type", "actor", "detail", "timestamp"]

    def get_actor(self, obj):
        if not obj.actor:
            return None
        return obj.actor.display_name() if hasattr(obj.actor, "display_name") else obj.actor.get_full_name() or obj.actor.username


class NormalizedRecordListSerializer(serializers.ModelSerializer):
    flags_count = serializers.IntegerField(read_only=True)
    latest_event = serializers.SerializerMethodField()

    class Meta:
        model = NormalizedRecord
        fields = ["id", "source_type", "description", "period_start", "period_end", "quantity", "unit", "calculated_kgco2e", "scope", "status", "flags_count", "latest_event"]

    def get_latest_event(self, obj):
        events = getattr(obj, "prefetched_audit_events", None)
        latest = None
        if events is not None:
            latest = events[0] if events else None
        else:
            latest = obj.audit_trail.order_by("-timestamp").first()
        return AuditEventSerializer(latest, context=self.context).data if latest else None


class NormalizedRecordDetailSerializer(serializers.ModelSerializer):
    raw_data = serializers.SerializerMethodField()
    flags = serializers.SerializerMethodField()
    audit_trail = serializers.SerializerMethodField()
    unit_options = serializers.SerializerMethodField()

    class Meta:
        model = NormalizedRecord
        fields = [
            "id", "raw_record", "client", "source_type", "import_job", "description", "activity_category",
            "period_start", "period_end", "quantity", "unit", "emission_factor", "emission_factor_source",
            "calculated_kgco2e", "scope", "status", "approved_by", "approved_at", "locked", "is_edited",
            "edited_by", "edited_at", "created_at", "updated_at", "raw_data", "flags", "audit_trail", "unit_options",
        ]

    def get_raw_data(self, obj):
        return getattr(getattr(obj, "raw_record", None), "raw_data", None)

    def get_flags(self, obj):
        flags = getattr(obj, "prefetched_flags", None)
        active_flags = flags if flags is not None else obj.flags.filter(dismissed_at__isnull=True)
        return RecordFlagSerializer(active_flags, many=True, context=self.context).data

    def get_audit_trail(self, obj):
        events = getattr(obj, "prefetched_audit_events", None)
        qs = events if events is not None else obj.audit_trail.all()
        return AuditEventSerializer(qs, many=True, context=self.context).data

    def get_unit_options(self, obj):
        options = {"sap": ["L", "kg", "m3", "unit", "pallet", "kWh"], "utility": ["kWh", "MWh", "kVAh (unconverted)"], "travel": ["km", "night"]}
        return options.get(obj.source_type, [])


class NormalizedRecordUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NormalizedRecord
        fields = ["description", "activity_category", "period_start", "period_end", "quantity", "unit", "emission_factor", "emission_factor_source", "scope", "status"]
        extra_kwargs = {"status": {"required": False}}

    def validate(self, attrs):
        instance = self.instance
        if instance and instance.locked:
            raise serializers.ValidationError("Locked records cannot be edited")
        return attrs