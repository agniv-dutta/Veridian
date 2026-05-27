from .base import *

DEBUG = True


def _merge_local_vite_origins(origins):
	merged = list(origins or [])
	for origin in (
		"http://localhost:5173",
		"http://127.0.0.1:5173",
		"http://localhost:5174",
		"http://127.0.0.1:5174",
	):
		if origin not in merged:
			merged.append(origin)
	return merged

# Keep local development zero-config: use SQLite by default.
DATABASES = {
	"default": {
		"ENGINE": "django.db.backends.sqlite3",
		"NAME": BASE_DIR / "db.sqlite3",
	}
}

# Allow local Vite dev servers when CORS env is not set.
CORS_ALLOWED_ORIGINS = _merge_local_vite_origins(CORS_ALLOWED_ORIGINS)
CSRF_TRUSTED_ORIGINS = _merge_local_vite_origins(CSRF_TRUSTED_ORIGINS)