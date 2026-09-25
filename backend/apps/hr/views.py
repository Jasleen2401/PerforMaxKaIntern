from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from apps.accounts.models import UserRole
from apps.performance.models import PerformanceCycle, EvaluationCriterion, Appraisal, PerformanceImprovementPlan, CycleStatus


class IsHrOrAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.role in [UserRole.HR, UserRole.SUPER_ADMIN] or request.user.is_superuser
        ))


class HrDashboardView(APIView):
    permission_classes = [IsHrOrAdminUser]

    def get(self, request):
        active_cycles = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).count()
        total_appraisals = Appraisal.objects.count()
        pending_hr_approval = Appraisal.objects.filter(status='UNDER_REVIEW').count()
        open_pips = PerformanceImprovementPlan.objects.filter(status='ACTIVE').count()

        return Response({
            'code': 200,
            'message': 'HR Operations Dashboard retrieved',
            'data': {
                'activeCycles': active_cycles,
                'totalAppraisals': total_appraisals,
                'pendingHrApproval': pending_hr_approval,
                'openPips': open_pips,
            }
        })


class HrCyclesView(APIView):
    permission_classes = [IsHrOrAdminUser]

    def get(self, request):
        cycles = PerformanceCycle.objects.order_by('-start_date')
        data = [{
            'id': str(c.id),
            'name': c.name,
            'startDate': str(c.start_date),
            'endDate': str(c.end_date),
            'status': c.status,
            'isLocked': c.is_locked,
        } for c in cycles]
        return Response({'code': 200, 'data': data})


class HrPublishCycleView(APIView):
    permission_classes = [IsHrOrAdminUser]

    def post(self, request, pk):
        cycle = PerformanceCycle.objects.filter(id=pk).first()
        if not cycle:
            return Response({'code': 404, 'message': 'Cycle not found'}, status=status.HTTP_404_NOT_FOUND)

        Appraisal.objects.filter(cycle=cycle, status='HR_APPROVED').update(status='PUBLISHED')
        return Response({'code': 200, 'message': f'Appraisals for cycle {cycle.name} have been published.'})


class HrCriteriaView(APIView):
    permission_classes = [IsHrOrAdminUser]

    def get(self, request):
        criteria = EvaluationCriterion.objects.all()
        data = [{
            'id': str(c.id),
            'name': c.name,
            'description': c.description,
            'weightage': float(c.weightage),
            'isActive': c.is_active,
        } for c in criteria]
        return Response({'code': 200, 'data': data})


class HrPipOverviewView(APIView):
    permission_classes = [IsHrOrAdminUser]

    def get(self, request):
        pips = PerformanceImprovementPlan.objects.select_related('employee', 'manager', 'cycle').all()
        data = [{
            'id': str(p.id),
            'employeeName': p.employee.full_name if hasattr(p.employee, 'full_name') else p.employee.username,
            'managerName': p.manager.username if p.manager else 'Unassigned',
            'status': p.status,
            'startDate': str(p.start_date),
            'endDate': str(p.end_date),
            'rootCause': p.root_cause_analysis,
        } for p in pips]
        return Response({'code': 200, 'data': data})


class HrBellCurveAnalyticsView(APIView):
    permission_classes = [IsHrOrAdminUser]

    def get(self, request):
        return Response({
            'code': 200,
            'data': {
                'distribution': [
                    {'band': 'Unsatisfactory (0-5)', 'percentage': 5, 'count': 4},
                    {'band': 'Needs Improvement (5-7)', 'percentage': 15, 'count': 12},
                    {'band': 'Meets Expectations (7-8.5)', 'percentage': 60, 'count': 48},
                    {'band': 'Exceeds Expectations (8.5-10)', 'percentage': 20, 'count': 16},
                ]
            }
        })
