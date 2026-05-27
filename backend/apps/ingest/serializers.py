from rest_framework import serializers

from apps.ingest.models import ImportJob, RawRecord


class ImportJobSerializer(serializers.ModelSerializer):
    grade = serializers.SerializerMethodField()
    uploaded_at = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%SZ", read_only=True)

    class Meta:
        model = ImportJob
        fields = ["id", "client", "source_type", "status", "uploaded_by", "uploaded_at", "raw_file", "total_records", "successful_records", "failed_records", "quality_score", "grade"]
        read_only_fields = ["id", "status", "uploaded_by", "uploaded_at", "total_records", "successful_records", "failed_records", "quality_score", "grade"]

    def get_grade(self, obj):
        return obj.quality_grade


class ImportJobDetailSerializer(serializers.ModelSerializer):
    class Meta(ImportJobSerializer.Meta):
        fields = ImportJobSerializer.Meta.fields + ["raw_file_preview", "error_log"]


class RawRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawRecord
        fields = ["id", "import_job", "client", "source_type", "row_index", "raw_data", "conversion_log", "parse_status", "parse_error", "created_at"]
        read_only_fields = fields