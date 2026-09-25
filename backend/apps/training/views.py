from django.db.models import Q
from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.training.models import TrainingCourse, EmployeeTraining
from apps.training.serializers import TrainingCourseSerializer, EmployeeTrainingSerializer
from apps.accounts.permissions import IsHR

class TrainingCourseViewSet(viewsets.ModelViewSet):
    queryset = TrainingCourse.objects.prefetch_related('enrollments').all()
    serializer_class = TrainingCourseSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['title', 'description', 'provider']
    ordering_fields = ['title', 'duration_hours']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHR()]
        return [permissions.IsAuthenticated()]

class EmployeeTrainingViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeTrainingSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['employee', 'course', 'enrollment_status']
    search_fields = ['employee__first_name', 'course__title']
    ordering_fields = ['completion_percentage', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return EmployeeTraining.objects.none()

        base_qs = EmployeeTraining.objects.select_related('employee__user', 'course').all()

        if user.is_super_admin or user.is_hr:
            return base_qs

        if user.is_manager:
            return base_qs.filter(Q(employee__manager=user) | Q(employee__user=user))

        return base_qs.filter(employee__user=user)

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsHR()]
        return [permissions.IsAuthenticated()]
