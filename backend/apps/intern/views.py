from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from apps.goals.models import Goal
from apps.evidence.models import EvidenceSubmission
from apps.performance.models import Appraisal


class InternScorecardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        goals = Goal.objects.filter(employee=user)
        total_goals = goals.count()
        completed_goals = goals.filter(status='COMPLETED').count()
        avg_progress = sum([g.progress_percentage for g in goals]) / total_goals if total_goals > 0 else 0

        latest_appraisal = Appraisal.objects.filter(employee=user).order_by('-created_at').first()

        return Response({
            'code': 200,
            'data': {
                'totalGoals': total_goals,
                'completedGoals': completed_goals,
                'averageProgress': float(avg_progress),
                'activeAppraisalStatus': latest_appraisal.status if latest_appraisal else 'NOT_STARTED',
                'publishedScore': float(latest_appraisal.final_calibrated_score) if latest_appraisal and latest_appraisal.status == 'PUBLISHED' else None,
            }
        })


class InternGoalsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        goals = Goal.objects.filter(employee=request.user).select_related('cycle')
        data = [{
            'id': str(g.id),
            'title': g.title,
            'description': g.description,
            'weightage': float(g.weightage),
            'progress': float(g.progress_percentage),
            'status': g.status,
            'priority': g.priority,
            'cycleName': g.cycle.name,
        } for g in goals]
        return Response({'code': 200, 'data': data})


class InternUpdateProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        goal = Goal.objects.filter(id=pk, employee=request.user).first()
        if not goal:
            return Response({'code': 404, 'message': 'Goal not found'}, status=status.HTTP_404_NOT_FOUND)

        progress = request.data.get('progress', 0)
        goal.progress_percentage = min(100, max(0, float(progress)))
        if goal.progress_percentage >= 100:
            goal.status = 'COMPLETED'
        elif goal.progress_percentage > 0:
            goal.status = 'IN_PROGRESS'
        goal.save()

        return Response({'code': 200, 'message': 'Goal progress updated', 'progress': float(goal.progress_percentage)})


class InternSubmitEvidenceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        goal_id = request.data.get('goalId')
        goal = Goal.objects.filter(id=goal_id, employee=request.user).first()
        if not goal:
            return Response({'code': 404, 'message': 'Goal not found'}, status=status.HTTP_404_NOT_FOUND)

        evidence = EvidenceSubmission.objects.create(
            goal=goal,
            submitted_by=request.user,
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
        appraisals = Appraisal.objects.filter(employee=request.user).select_related('cycle')
        data = [{
            'id': str(a.id),
            'cycleName': a.cycle.name,
            'status': a.status,
            'selfScore': float(a.self_criteria_score) if a.self_criteria_score else None,
            # Privacy Gating: Mask manager score until published
            'managerScore': float(a.manager_criteria_score) if a.status == 'PUBLISHED' and a.manager_criteria_score else None,
            'finalScore': float(a.final_calibrated_score) if a.status == 'PUBLISHED' and a.final_calibrated_score else None,
        } for a in appraisals]
        return Response({'code': 200, 'data': data})
