from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.tenants.models import Client
from apps.tenants.serializers import ClientSerializer


class ClientViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or getattr(user, "is_staff", False):
            return Client.objects.all().order_by("name")
        profile = getattr(user, "profile", None)
        if not profile:
            return Client.objects.none()
        return Client.objects.filter(id=profile.client_id).order_by("name")