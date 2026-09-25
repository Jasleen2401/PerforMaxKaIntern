from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.organization.models import Department, Team, TeamMembership
from apps.organization.serializers import (
    DepartmentSerializer,
    TeamSerializer,
    TeamMembershipSerializer,
)
from apps.accounts.permissions import IsHR

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all().prefetch_related('teams', 'employees')
    serializer_class = DepartmentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHR()]
        return [permissions.IsAuthenticated()]

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.select_related('department', 'manager').prefetch_related('memberships').all()
    serializer_class = TeamSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'manager']
    search_fields = ['name', 'description', 'department__name']
    ordering_fields = ['name', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHR()]
        return [permissions.IsAuthenticated()]

class TeamMembershipViewSet(viewsets.ModelViewSet):
    queryset = TeamMembership.objects.select_related('team', 'employee').all()
    serializer_class = TeamMembershipSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['team', 'employee', 'is_lead']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHR()]
        return [permissions.IsAuthenticated()]
