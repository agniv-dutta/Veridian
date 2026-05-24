from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        profile = getattr(user, "profile", None)
        token["role"] = getattr(profile, "role", "")
        token["client_slug"] = getattr(getattr(profile, "client", None), "slug", "")
        return token