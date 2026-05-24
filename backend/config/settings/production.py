from .base import *

DEBUG = False
ADMIN_URL = config("ADMIN_URL", default="ops-admin/")
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True