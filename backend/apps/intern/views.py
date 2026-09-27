from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from apps.goals.models import Goal, GoalStatus
from apps.evidence.models import EvidenceSubmission
from apps.performance.models import Appraisal, AppraisalType, AppraisalStatus


class InternScorecardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        goals = Goal.objects.filter(employee__user=user)
        total_goals = goals.count()
        completed_goals = goals.filter(status=GoalStatus.COMPLETED).count()
        avg_progress = (
            sum([float(g.completion_percentage) for g in goals]) / total_goals
            if total_goals > 0
            else 0.0
        )

        latest_appraisal = (
            Appraisal.objects.filter(employee__user=user)
            .order_by('-created_at')
            .first()
        )

        return Response({
            'code': 200,
            'data': {
                'totalGoals': total_goals,
                'completedGoals': completed_goals,
                'averageProgress': round(float(avg_progress), 2),
                'activeAppraisalStatus': latest_appraisal.status if latest_appraisal else 'NOT_STARTED',
                'publishedScore': (
                    float(latest_appraisal.overall_score)
                    if latest_appraisal and latest_appraisal.status == AppraisalStatus.PUBLISHED and latest_appraisal.overall_score is not None
                    else None
                ),
            }
        })


class InternGoalsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        goals = Goal.objects.filter(employee__user=request.user).select_related('cycle', 'assigned_by')
        data = [{
            'id': str(g.id),
            'title': g.title,
            'description': g.description,
            'progress': float(g.completion_percentage),
            'completionPercentage': float(g.completion_percentage),
            'status': g.status,
            'priority': g.priority,
            'dueDate': str(g.due_date) if g.due_date else None,
            'cycleName': g.cycle.name if g.cycle else 'Active Cycle',
            'assignedByName': g.assigned_by.username if g.assigned_by else None,
        } for g in goals]
        return Response({'code': 200, 'data': data})


class InternUpdateProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        goal = Goal.objects.filter(id=pk, employee__user=request.user).first()
        if not goal:
            return Response({'code': 404, 'message': 'Goal not found'}, status=status.HTTP_404_NOT_FOUND)

        progress = request.data.get('progress', 0)
        goal.completion_percentage = min(100, max(0, float(progress)))
        if goal.completion_percentage >= 100:
            goal.status = GoalStatus.COMPLETED
        elif goal.completion_percentage > 0:
            goal.status = GoalStatus.IN_PROGRESS
        goal.save()

        return Response({'code': 200, 'message': 'Goal progress updated', 'progress': float(goal.completion_percentage)})


class InternSubmitEvidenceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        goal_id = request.data.get('goalId')
        goal = Goal.objects.filter(id=goal_id, employee__user=request.user).first()
        if not goal:
            return Response({'code': 404, 'message': 'Goal not found'}, status=status.HTTP_404_NOT_FOUND)

        evidence = EvidenceSubmission.objects.create(
            goal=goal,
            submitted_by=request.user,
            employee=goal.employee,
            title=request.data.get('title', 'Evidence Submission'),
            evidence_url=request.data.get('evidenceUrl', ''),
            notes=request.data.get('notes', ''),
            review_status='PENDING'
        )

        return Response({
            'code': 201,
            'message': 'Evidence submitted successfully for review',
            'id': str(evidence.id)
        }, status=status.HTTP_201_CREATED)


class InternMyAppraisalsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Privacy Gating: Interns only see self-appraisals and PUBLISHED manager evaluations
        appraisals = Appraisal.objects.filter(
            Q(employee__user=request.user, appraisal_type=AppraisalType.SELF) |
            Q(employee__user=request.user, status=AppraisalStatus.PUBLISHED)
        ).select_related('cycle', 'reviewer')

        data = [{
            'id': str(a.id),
            'cycleName': a.cycle.name if a.cycle else '',
            'appraisalType': a.appraisal_type,
            'status': a.status,
            'overallScore': float(a.overall_score) if a.status == AppraisalStatus.PUBLISHED and a.overall_score is not None else None,
            'selfScore': float(a.overall_score) if a.appraisal_type == AppraisalType.SELF and a.overall_score is not None else None,
            'managerScore': float(a.overall_score) if a.status == AppraisalStatus.PUBLISHED and a.appraisal_type == AppraisalType.MANAGER and a.overall_score is not None else None,
            'reviewerComments': a.reviewer_comments if a.status == AppraisalStatus.PUBLISHED else None,
            'finalComments': a.final_comments if a.status == AppraisalStatus.PUBLISHED else None,
            'published': a.status == AppraisalStatus.PUBLISHED,
        } for a in appraisals]
        return Response({'code': 200, 'data': data})

