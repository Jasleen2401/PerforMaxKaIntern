from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from apps.accounts.models import User, UserRole
from apps.audit.models import AuditLog
from apps.employees.models import EmployeeProfile
from apps.organization.models import Department, Team
from apps.performance.models import PerformanceCycle, Appraisal


class IsSuperAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.role == UserRole.SUPER_ADMIN or request.user.is_superuser
        ))


class SuperAdminDashboardView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        total_interns = User.objects.filter(role=UserRole.INTERN).count()
        total_managers = User.objects.filter(role=UserRole.MANAGER).count()
        total_hr = User.objects.filter(role=UserRole.HR).count()
        total_departments = Department.objects.count()
        total_teams = Team.objects.count()
        recent_audit_logs = list(AuditLog.objects.order_by('-created_at')[:10].values(
            'id', 'action', 'entity_type', 'created_at', 'actor__username'
        ))

        return Response({
            'code': 200,
            'message': 'Super Admin Dashboard Analytics retrieved successfully',
            'data': {
                'metrics': {
                    'totalUsers': total_users,
                    'totalInterns': total_interns,
                    'totalManagers': total_managers,
                    'totalHr': total_hr,
                    'totalDepartments': total_departments,
                    'totalTeams': total_teams,
                },
                'recentAuditLogs': recent_audit_logs,
            }
        })


class SuperAdminAuditLogsView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        limit = int(request.query_params.get('limit', 50))
        logs = AuditLog.objects.select_related('actor').order_by('-created_at')[:limit]
        data = [{
            'id': str(log.id),
            'actor': log.actor.username if log.actor else 'System',
            'action': log.action,
            'entityType': log.entity_type,
            'entityId': log.entity_id,
            'metadata': log.metadata,
            'createdAt': log.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        } for log in logs]

        return Response({
            'code': 200,
            'total': len(data),
            'data': data
        })


class SuperAdminEmployeesView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        profiles = EmployeeProfile.objects.select_related('user', 'department', 'manager').all()
        data = [{
            'id': str(p.id),
            'userId': str(p.user.id),
            'employeeCode': p.employee_code,
            'fullName': p.full_name,
            'email': p.user.email,
            'role': p.user.role,
            'department': p.department.name if p.department else 'Unassigned',
            'designation': p.designation,
            'isActive': p.user.is_active,
            'joiningDate': str(p.joining_date),
        } for p in profiles]

        return Response({'code': 200, 'total': len(data), 'data': data})


class SuperAdminToggleLockView(APIView):
    permission_classes = [IsSuperAdminUser]

    def post(self, request, pk):
        profile = EmployeeProfile.objects.filter(id=pk).first()
        if not profile:
            return Response({'code': 404, 'message': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

        user = profile.user
        user.is_active = not user.is_active
        user.save()
        return Response({
            'code': 200,
            'message': f"Employee status updated to {'Active' if user.is_active else 'Deactivated'}",
            'isActive': user.is_active
        })


class SuperAdminSecurityMatrixView(APIView):
    permission_classes = [IsSuperAdminUser]

    def get(self, request):
        roles_matrix = {
            'SUPER_ADMIN': ['ALL', 'SYSTEM_AUDIT', 'ROLE_MANAGE', 'USER_MANAGE', 'CYCLE_MANAGE', 'REPORT_VIEW_ALL'],
            'HR': ['CYCLE_MANAGE', 'CRITERIA_MANAGE', 'APPRAISAL_PUBLISH', 'PIP_VIEW_ALL', 'REPORT_VIEW_ALL'],
            'MANAGER': ['GOAL_ASSIGN', 'EVIDENCE_REVIEW', 'APPRAISAL_EVALUATE', 'PIP_CREATE', 'MEETING_MANAGE'],
            'INTERN': ['GOAL_VIEW_OWN', 'EVIDENCE_SUBMIT', 'APPRAISAL_SELF_EVALUATE', 'ATTENDANCE_LOG', 'IDP_VIEW']
        }
        return Response({'code': 200, 'data': roles_matrix})
