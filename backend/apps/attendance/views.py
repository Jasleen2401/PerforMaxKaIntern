from django.db.models import Q
from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.attendance.models import AttendanceRecord
from apps.attendance.serializers import AttendanceRecordSerializer
from apps.accounts.permissions import IsHR

class AttendanceRecordViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['employee', 'status', 'attendance_date']
    search_fields = ['employee__first_name', 'employee__last_name', 'remarks']
    ordering_fields = ['attendance_date', 'status']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return AttendanceRecord.objects.none()

        base_qs = AttendanceRecord.objects.select_related('employee__user').all()

        if user.is_super_admin or user.is_hr:
            return base_qs

        if user.is_manager:
            return base_qs.filter(Q(employee__manager=user) | Q(employee__user=user))

        return base_qs.filter(employee__user=user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHR()]
        return [permissions.IsAuthenticated()]
