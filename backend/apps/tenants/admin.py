from django.contrib import admin

from apps.tenants.models import Client, UserProfile


class SuperuserOnlyAdminSite(admin.AdminSite):
    def has_permission(self, request):
        return request.user.is_active and request.user.is_superuser


admin.site.__class__ = SuperuserOnlyAdminSite


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "created_at")
    search_fields = ("name", "slug")
    ordering = ("name",)

    def has_module_perms(self, request):
        return request.user.is_superuser


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "client", "role")
    list_filter = ("role", "client")
    search_fields = ("user__username", "user__email", "client__name")
    ordering = ("client__name", "user__username")

    def has_module_perms(self, request):
        return request.user.is_superuser
