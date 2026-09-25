from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.employees.views import EmployeeProfileViewSet

router = DefaultRouter()
router.register(r'', EmployeeProfileViewSet, basename='employee')

urlpatterns = [
    path('', include(router.urls)),
]
