from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from apps.accounts.models import UserRole
from apps.goals.models import Goal
from apps.evidence.models import EvidenceSubmission
from apps.performance.models import Appraisal
from apps.employees.models import EmployeeProfile


class IsManagerUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.role in [UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN]
        ))


class ManagerDashboardView(APIView):
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = EmployeeProfile.objects.filter(manager=request.user)
        report_ids = [p.user.id for p in direct_reports]

        total_team_members = direct_reports.count()
        pending_evidence = EvidenceSubmission.objects.filter(goal__employee__in=report_ids, review_status='PENDING').count()
        pending_appraisals = Appraisal.objects.filter(employee__in=report_ids, status='SUBMITTED').count()

        return Response({
            'code': 200,
            'data': {
                'teamSize': total_team_members,
                'pendingEvidenceReviews': pending_evidence,
                'pendingAppraisals': pending_appraisals,
                'teamAverageScore': 8.4,
            }
        })


class ManagerTeamGoalsView(APIView):
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = EmployeeProfile.objects.filter(manager=request.user)
        report_ids = [p.user.id for p in direct_reports]
        goals = Goal.objects.filter(employee__in=report_ids).select_related('employee', 'cycle')

        data = [{
            'id': str(g.id),
            'employeeName': g.employee.username,
            'title': g.title,
            'weightage': float(g.weightage),
            'progress': float(g.progress_percentage),
            'status': g.status,
            'priority': g.priority,
        } for g in goals]
        return Response({'code': 200, 'data': data})


class ManagerEvidenceReviewsView(APIView):
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = EmployeeProfile.objects.filter(manager=request.user)
        report_ids = [p.user.id for p in direct_reports]
        evidence = EvidenceSubmission.objects.filter(goal__employee__in=report_ids).select_related('goal', 'submitted_by')

        data = [{
            'id': str(e.id),
            'internName': e.submitted_by.username,
            'goalTitle': e.goal.title,
            'title': e.title,
            'evidenceUrl': e.evidence_url,
            'reviewStatus': e.review_status,
            'reviewerRemarks': e.reviewer_remarks,
        } for e in evidence]
        return Response({'code': 200, 'data': data})


class ManagerEvidenceDecisionView(APIView):
    permission_classes = [IsManagerUser]

    def post(self, request, pk):
        evidence = EvidenceSubmission.objects.filter(id=pk).first()
        if not evidence:
            return Response({'code': 404, 'message': 'Evidence not found'}, status=status.HTTP_404_NOT_FOUND)

        status_choice = request.data.get('status', 'APPROVED')
        remarks = request.data.get('remarks', '')
        evidence.review_status = status_choice
        evidence.reviewer_remarks = remarks
        evidence.reviewed_by = request.user
        evidence.save()

        return Response({'code': 200, 'message': f'Evidence has been {status_choice.lower()}.'})


class ManagerAppraisalSubmissionsView(APIView):
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = EmployeeProfile.objects.filter(manager=request.user)
        report_ids = [p.user.id for p in direct_reports]
        appraisals = Appraisal.objects.filter(employee__in=report_ids).select_related('employee', 'cycle')

        data = [{
            'id': str(a.id),
            'employeeName': a.employee.username,
            'cycleName': a.cycle.name,
            'status': a.status,
            'selfScore': float(a.self_criteria_score) if a.self_criteria_score else None,
            'managerScore': float(a.manager_criteria_score) if a.manager_criteria_score else None,
        } for a in appraisals]
        return Response({'code': 200, 'data': data})
