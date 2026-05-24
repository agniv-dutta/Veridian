import uuid

from django.db import models


class EmissionFactor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activity_category = models.CharField(max_length=200)
    scope = models.IntegerField(choices=[(1, 1), (2, 2), (3, 3)])
    unit = models.CharField(max_length=50)
    factor_kgco2e_per_unit = models.DecimalField(max_digits=20, decimal_places=8)
    source = models.CharField(max_length=200)
    valid_from = models.DateField()
    valid_to = models.DateField(null=True, blank=True)
    region = models.CharField(max_length=100, blank=True)

    def __str__(self) -> str:
        return f"{self.activity_category} ({self.unit})"