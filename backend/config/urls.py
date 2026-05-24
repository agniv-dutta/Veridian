from django.contrib import admin
from django.conf import settings
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.auth_users.views import CustomTokenObtainPairView
from apps.ingest.views import ImportJobViewSet, IngestSAPView, IngestTravelView, IngestUtilityView, SummaryView
from apps.records.views import AuditorExportView, NormalizedRecordViewSet
from apps.tenants.views import ClientViewSet

router = DefaultRouter()
router.register(r"clients", ClientViewSet, basename="client")
router.register(r"imports", ImportJobViewSet, basename="import-job")
router.register(r"records", NormalizedRecordViewSet, basename="normalized-record")

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/summary/", SummaryView.as_view(), name="summary"),
    path("api/export/", AuditorExportView.as_view(), name="export"),
    path("api/ingest/sap/", IngestSAPView.as_view(), name="ingest-sap"),
    path("api/ingest/utility/", IngestUtilityView.as_view(), name="ingest-utility"),
    path("api/ingest/travel/", IngestTravelView.as_view(), name="ingest-travel"),
    path("api/", include(router.urls)),
]