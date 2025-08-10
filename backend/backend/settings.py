
import environ
import os
from pathlib import Path
from datetime import timedelta



# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environment variables
env = environ.Env(
    # set casting, default value
    DEBUG=(bool, False)
)

# Check if we're in development or production
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# Take environment variables from .env file
if ENVIRONMENT == 'development':
    environ.Env.read_env(os.path.join(BASE_DIR, 'dev.env'))
else:
    environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# Now use env() to get your variables
DEBUG = env('DEBUG', default=True if ENVIRONMENT == 'development' else False)
SECRET_KEY = env('SECRET_KEY', default='dev-secret-key-change-in-production')

# Development vs Production settings
if ENVIRONMENT == 'development':
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']
    CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ])
else:
    ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['*'])
    CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'django_filters',
    'corsheaders',
    'geo',
    'django_extensions',

]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CORS settings
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = ENVIRONMENT == 'development'  # Only allow all origins in development

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
    'default': env.db(),  # This reads DATABASE_URL
}

# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Manila'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = env('STATIC_URL', default='/static/')

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),  # 1 hour for dev
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    # ... other settings ...
}

# CORS settings are now handled by environment-specific configuration above
from corsheaders.defaults import default_headers

import os
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Security Settings for Production
if not DEBUG:
    # HTTPS Settings
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    
    # Security Headers
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    X_FRAME_OPTIONS = 'DENY'
    
    # Session Security
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_AGE = 3600  # 1 hour
    SESSION_EXPIRE_AT_BROWSER_CLOSE = True
    
    # File Upload Limits
    FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
    DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
    
    # Performance Settings
    CONN_MAX_AGE = 60  # Database connection lifetime
