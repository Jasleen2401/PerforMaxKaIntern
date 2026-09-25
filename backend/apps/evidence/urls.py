from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.evidence.views import EvidenceSubmissionViewSet

router = DefaultRouter()
router.register(r'', EvidenceSubmissionViewSet, basename='evidencesubmission')

urlpatterns = [
    path('', include(router.urls)),
]
