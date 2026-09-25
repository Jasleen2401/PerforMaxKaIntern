from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.organization.views import DepartmentViewSet, TeamViewSet, TeamMembershipViewSet

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'teams', TeamViewSet, basename='team')
router.register(r'memberships', TeamMembershipViewSet, basename='teammembership')

urlpatterns = [
    path('', include(router.urls)),
]
