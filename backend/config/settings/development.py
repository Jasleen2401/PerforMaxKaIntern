from .base import *

DEBUG = True
# Use lenient CORS in development if needed
CORS_ALLOW_ALL_ORIGINS = True

# Use SMTP email backend
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
