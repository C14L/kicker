import os

DEBUG = bool(os.environ.get("ISDEV"))
SECRET_KEY = "thereisnosecretneededforthisapplicationthereforeit"
ALLOWED_HOSTS = ["localhost", "c14l.com"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "main",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "kicker.urls"
TEMPLATES = []
# WSGI_APPLICATION = "kicker.wsgi.application"
ASGI_APPLICATION = "kicker.asgi.application"
DATABASES = {}
AUTH_PASSWORD_VALIDATORS = []
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = False
USE_L10N = False
USE_TZ = False
STATIC_URL = "/static/"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KICKER_DIR = os.path.join(BASE_DIR, "html")
KICKER_HOME_FILE = os.path.join(KICKER_DIR, "home.html")
KICKER_HTML_FILE = os.path.join(KICKER_DIR, "index.html")
KICKER_CSS_FILE = os.path.join(KICKER_DIR, "index.css")
KICKER_JS_FILE = os.path.join(KICKER_DIR, "index.js")
