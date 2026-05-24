from rest_framework import serializers

from apps.tenants.models import Client


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ["id", "name", "slug", "created_at"]