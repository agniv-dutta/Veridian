from __future__ import annotations

from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404

from apps.tenants.models import Client


class TenantQuerysetMixin:
    client_query_param = "client"

    def get_client_slug(self) -> str:
        slug = self.request.query_params.get(self.client_query_param) if hasattr(self.request, "query_params") else None
        if not slug:
            raise PermissionDenied("client query parameter is required")
        return slug

    def get_client(self) -> Client:
        return get_object_or_404(Client, slug=self.get_client_slug())

    def scope_queryset_to_client(self, queryset):
        return queryset.filter(client__slug=self.get_client_slug())