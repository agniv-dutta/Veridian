import uuid

from django.conf import settings
from django.db import models


class Client(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.name


class UserProfile(models.Model):
    class Role(models.TextChoices):
        ANALYST = "analyst", "Analyst"
        ADMIN = "admin", "Admin"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="users")
    role = models.CharField(max_length=20, choices=Role.choices)

    def __str__(self) -> str:
        return f"{self.user} @ {self.client} ({self.role})"