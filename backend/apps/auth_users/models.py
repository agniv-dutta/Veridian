from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)

    def display_name(self) -> str:
        full_name = self.get_full_name().strip()
        return full_name or self.username or self.email