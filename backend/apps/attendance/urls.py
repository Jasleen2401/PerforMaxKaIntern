from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.attendance.views import AttendanceRecordViewSet

router = DefaultRouter()
router.register(r'', AttendanceRecordViewSet, basename='attendancerecord')

urlpatterns = [
    path('', include(router.urls)),
]
