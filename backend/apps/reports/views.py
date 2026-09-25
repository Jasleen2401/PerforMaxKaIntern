import csv
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

from apps.accounts.permissions import IsManager, IsHR, IsSuperAdmin
from apps.accounts.models import UserRole, User
from apps.employees.models import EmployeeProfile
from apps.reports.services import AnalyticsService


class MyPerformanceReportView(APIView):
    """
    Get personal performance metrics for an intern.
    Interns can only access their own report.
    Managers can view their direct/team reports via `?employee_id=`.
    HR and Admins can view any intern via `?employee_id=`.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get intern performance summary",
        parameters=[
            OpenApiParameter(
                name='employee_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description="Target intern's employee ID (allowed for Managers, HR, and Admins)"
            )
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        target_employee_id = request.query_params.get('employee_id')
        user = request.user

        if target_employee_id:
            # Viewing someone else's summary
            try:
                target_employee = EmployeeProfile.objects.select_related('department', 'manager').get(id=target_employee_id)
            except EmployeeProfile.DoesNotExist:
                return Response({'detail': 'Employee profile not found.'}, status=status.HTTP_404_NOT_FOUND)

            # Authorization check
            if user.role == UserRole.INTERN and str(target_employee.user_id) != str(user.id):
                return Response({'detail': 'You do not have permission to view other interns.'}, status=status.HTTP_403_FORBIDDEN)
            elif user.role == UserRole.MANAGER:
                # Check if target intern reports directly to this manager or in managed team
                if target_employee.manager_id != user.id:
                    from apps.organization.models import TeamMembership
                    intern_in_team = TeamMembership.objects.filter(
                        team__manager=user,
                        employee=target_employee
                    ).exists()
                    if not intern_in_team:
                        return Response({'detail': 'You can only view interns on your team.'}, status=status.HTTP_403_FORBIDDEN)
        else:
            # Self summary
            target_employee = getattr(user, 'profile', None)
            if not target_employee:
                return Response({'detail': 'Employee profile not found for this account.'}, status=status.HTTP_404_NOT_FOUND)

        summary = AnalyticsService.get_intern_performance_summary(target_employee)
        return Response(summary, status=status.HTTP_200_OK)


class TeamPerformanceReportView(APIView):
    """
    Get aggregated performance metrics for a manager's team or a department.
    Accessible by Managers, HR, and Super Admins.
    """
    permission_classes = [IsAuthenticated, (IsManager | IsHR | IsSuperAdmin)]

    @extend_schema(
        summary="Get team performance summary",
        parameters=[
            OpenApiParameter(
                name='manager_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description="Filter by specific manager user ID (HR/Admin only)"
            ),
            OpenApiParameter(
                name='department_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description="Filter by department ID"
            )
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        user = request.user
        department_id = request.query_params.get('department_id')
        manager_id = request.query_params.get('manager_id')

        manager_user = None
        if user.role == UserRole.MANAGER:
            manager_user = user
        elif manager_id:
            try:
                manager_user = User.objects.get(id=manager_id, role=UserRole.MANAGER)
            except User.DoesNotExist:
                return Response({'detail': 'Specified manager not found.'}, status=status.HTTP_404_NOT_FOUND)

        summary = AnalyticsService.get_team_performance_summary(
            manager_user=manager_user,
            department_id=department_id
        )
        return Response(summary, status=status.HTTP_200_OK)


class OrganizationPerformanceReportView(APIView):
    """
    High-level executive and HR performance dashboard across the organization.
    Accessible by HR and Super Admins.
    """
    permission_classes = [IsAuthenticated, (IsHR | IsSuperAdmin)]

    @extend_schema(
        summary="Get organization performance summary",
        parameters=[
            OpenApiParameter(
                name='cycle_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description="Performance cycle ID to analyze"
            ),
            OpenApiParameter(
                name='department_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description="Department ID to filter by"
            )
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        cycle_id = request.query_params.get('cycle_id')
        department_id = request.query_params.get('department_id')

        summary = AnalyticsService.get_organization_performance_summary(
            cycle_id=cycle_id,
            department_id=department_id
        )
        return Response(summary, status=status.HTTP_200_OK)


class ExportPerformanceReportCSVView(APIView):
    """
    Export performance and attendance roster report as CSV.
    Accessible by Managers, HR, and Super Admins.
    """
    permission_classes = [IsAuthenticated, (IsManager | IsHR | IsSuperAdmin)]

    @extend_schema(
        summary="Export team/department performance data as CSV",
        parameters=[
            OpenApiParameter(
                name='department_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description="Filter by department ID"
            )
        ]
    )
    def get(self, request):
        user = request.user
        department_id = request.query_params.get('department_id')

        manager_user = user if user.role == UserRole.MANAGER else None
        summary = AnalyticsService.get_team_performance_summary(
            manager_user=manager_user,
            department_id=department_id
        )

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="intern_performance_report.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Employee Code',
            'Full Name',
            'Department',
            'Goals Count',
            'Goal Completion %',
            'Attendance Rate %',
            'Latest Appraisal Score',
            'Pending Evidence Count',
            'Active PIP'
        ])

        for intern in summary.get('interns', []):
            writer.writerow([
                intern['employee_code'],
                intern['full_name'],
                intern['department_name'] or 'N/A',
                intern['goals_count'],
                f"{intern['goal_completion_percentage']}%",
                f"{intern['attendance_rate_percentage']}%",
                intern['latest_score'] if intern['latest_score'] is not None else 'N/A',
                intern['pending_evidence_count'],
                'Yes' if intern['has_active_pip'] else 'No'
            ])

        return response
