import uuid
from decimal import Decimal
from datetime import date, datetime, timedelta
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from apps.accounts.models import User
from apps.employees.models import EmployeeProfile
from apps.goals.models import Goal, GoalStatus, GoalPriority, GoalProgress
from apps.evidence.models import EvidenceSubmission
from apps.performance.models import (
    PerformanceCycle, Appraisal, AppraisalType, AppraisalStatus, CycleStatus
)
from apps.performance.services.scoring import ScoringService
from .models import (
    InternTask, TaskCategory, TaskPriority,
    InternGoalComment, InternSelfAppraisalSubmission, InternFeedbackReply
)


def get_performance_classification(score):
    """Returns official performance classification based on calibrated score."""
    if score is None:
        return None
    val = float(score)
    if val >= 90.0:
        return "Outstanding Contributor"
    elif val >= 80.0:
        return "Exceeds Expectations"
    elif val >= 70.0:
        return "Meets Expectations"
    elif val >= 60.0:
        return "Needs Improvement"
    else:
        return "Unsatisfactory / Review Required"


def ensure_intern_demo_pms_data(user):
    """
    Ensures that any logged-in intern has a complete, functional PMS dataset:
    - Active evaluation cycle
    - Employee profile & assigned mentor
    - Assigned goals with weightage
    - Assigned tasks with mentor instructions
    - Published or draft appraisal with feedback and areas for improvement
    """
    profile = getattr(user, 'profile', None)
    if not profile:
        profile = EmployeeProfile.objects.filter(user=user).first()
    if not profile:
        first_name = user.first_name or (user.username.split('_')[0].capitalize() if '_' in user.username else user.username.capitalize())
        last_name = user.last_name or (user.username.split('_')[-1].capitalize() if '_' in user.username else 'Intern')
        profile = EmployeeProfile.objects.create(
            user=user,
            employee_code=f"INT-{user.id.hex[:6].upper()}",
            first_name=first_name,
            last_name=last_name,
            designation="Software Engineering Intern",
            employment_status="ACTIVE",
            joining_date=date.today() - timedelta(days=60),
            phone_number="+1 (555) 019-2834"
        )

    # Ensure assigned mentor
    if not profile.manager:
        mentor_user = User.objects.filter(email='elena.qa@company.com').first()
        if not mentor_user:
            mentor_user = User.objects.filter(role__in=['MANAGER', 'HR']).first()
        if mentor_user:
            profile.manager = mentor_user
            profile.save(update_fields=['manager'])

    # Ensure active cycle
    cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).first()
    if not cycle:
        cycle = PerformanceCycle.objects.create(
            name="Q3 2026 Intern Performance Evaluation Cycle",
            description="Comprehensive intern mid-year performance review, technical milestone delivery, and IDP competencies.",
            start_date=date.today() - timedelta(days=45),
            end_date=date.today() + timedelta(days=45),
            status=CycleStatus.ACTIVE
        )

    # Ensure assigned goals
    existing_goals = Goal.objects.filter(employee=profile)
    if existing_goals.count() == 0:
        mentor_user = profile.manager if profile.manager else user
        g1 = Goal.objects.create(
            employee=profile,
            cycle=cycle,
            assigned_by=mentor_user,
            title="Core Authentication & Onboarding Architecture",
            description="Architect dynamic corporate login onboarding, forced password rotation, and anti-enumeration forgot/reset flows with 100% test coverage.",
            due_date=date.today() + timedelta(days=14),
            status=GoalStatus.IN_PROGRESS,
            priority=GoalPriority.HIGH,
            completion_percentage=Decimal('85.00')
        )
        g2 = Goal.objects.create(
            employee=profile,
            cycle=cycle,
            assigned_by=mentor_user,
            title="Intern Performance Dashboard & Self-Assessment Hub",
            description="Build interactive intern scorecard, task instruction panel, evidence file/URL uploader, and published mentor feedback review.",
            due_date=date.today() + timedelta(days=21),
            status=GoalStatus.IN_PROGRESS,
            priority=GoalPriority.HIGH,
            completion_percentage=75.00
        )
        g3 = Goal.objects.create(
            employee=profile,
            cycle=cycle,
            assigned_by=mentor_user,
            title="API Optimization & Unit Testing Suite",
            description="Construct automated security and integration test cases covering edge cases, token expiration, and schema compliance.",
            due_date=date.today() + timedelta(days=30),
            status=GoalStatus.IN_PROGRESS,
            priority=GoalPriority.MEDIUM,
            completion_percentage=50.00
        )

        # Add initial goal comments
        mentor_name = (
            getattr(profile.manager, 'profile', None).full_name
            if (profile.manager and hasattr(profile.manager, 'profile'))
            else (f"{profile.manager.first_name} {profile.manager.last_name}".strip() or profile.manager.username if profile.manager else "Mentor Elena")
        )
        InternGoalComment.objects.create(
            goal=g1,
            author=mentor_user,
            author_name=mentor_name,
            author_role="MENTOR",
            comment="Excellent progress on the PBKDF2 hash validation and anti-enumeration response logic. Make sure to attach the PR link once ready.",
            is_mentor=True
        )
        InternGoalComment.objects.create(
            goal=g1,
            author=user,
            author_name=profile.full_name,
            author_role="INTERN",
            comment="Thank you! PR has been linked in the evidence submission section with 18 automated security test passes.",
            is_mentor=False
        )

    # Ensure assigned tasks with instructions
    existing_tasks = InternTask.objects.filter(intern=profile)
    if existing_tasks.count() == 0:
        InternTask.objects.create(
            intern=profile,
            title="Set Up Local Dev Environment & Run Test Suite",
            category=TaskCategory.ONBOARDING,
            instructions=(
                "1. Clone the repository and configure virtual environment.\n"
                "2. Run all database migrations and verify Django settings.\n"
                "3. Execute 'python -m unittest tests_security_auth.py' and verify all tests pass.\n"
                "4. Log hours spent and mark this task complete."
            ),
            priority=TaskPriority.HIGH,
            due_date=date.today() - timedelta(days=2),
            is_completed=True,
            completed_at=date.today() - timedelta(days=2),
            hours_spent=Decimal('4.50'),
            completion_notes="Local PostgreSQL and SQLite test suite fully configured and passing.",
            artifact_url="https://github.com/Jasleen2401/PerforMaxKaIntern"
        )
        InternTask.objects.create(
            intern=profile,
            title="Submit Evidence Artifacts for Authentication Upgrade",
            category=TaskCategory.TECHNICAL,
            instructions=(
                "1. Upload the PR link or documentation showing token reset flow.\n"
                "2. Verify test evidence includes anti-enumeration tests.\n"
                "3. Attach file artifact or external commit URL."
            ),
            priority=TaskPriority.HIGH,
            due_date=date.today() + timedelta(days=3),
            is_completed=False,
            is_permitted_to_complete=True
        )
        InternTask.objects.create(
            intern=profile,
            title="Complete Mid-Term Self-Appraisal Questionnaire",
            category=TaskCategory.EVALUATION,
            instructions=(
                "1. Review assigned KRAs and goal progress in the dashboard.\n"
                "2. Navigate to the Self-Assessment tab.\n"
                "3. Fill out the 5 HR-published reflection questions and assign self-rating (1–10 scale).\n"
                "4. Submit your completed self-evaluation before the cycle deadline."
            ),
            priority=TaskPriority.MEDIUM,
            due_date=date.today() + timedelta(days=7),
            is_completed=False,
            is_permitted_to_complete=True
        )

    # Ensure sample published appraisal with mentor feedback & areas for improvement
    existing_appraisal = Appraisal.objects.filter(employee=profile).first()
    if not existing_appraisal:
        mentor_user = profile.manager if profile.manager else user
        Appraisal.objects.create(
            employee=profile,
            cycle=cycle,
            reviewer=mentor_user,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.PUBLISHED,
            overall_score=Decimal('92.50'),
            self_comments="Completed core tasks ahead of schedule, actively engaged in daily standups and sprint planning.",
            reviewer_comments="Outstanding technical rigor and initiative. Jasleen demonstrated rapid mastery of Django JWT security architecture and clean component modularization.",
            final_comments="Consistently exceeds cohort expectations. Promoted to lead intern on authentication subsystems.",
            published_at=timezone.now()
        )

    return profile


class InternOverviewView(APIView):
    """
    Comprehensive Personal Dashboard & Scorecard API:
    - Personal scorecard metrics (goals, tasks, deadlines, published score)
    - Assigned mentor profile (name, email, designation, department)
    - Current active evaluation cycle (dates, status, phase, days remaining)
    - Published performance results and official classification
    - Upcoming deadlines & pending task alerts
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = ensure_intern_demo_pms_data(user)

        # 1. Goals metrics
        goals = Goal.objects.filter(employee=profile)
        total_goals = goals.count()
        completed_goals = goals.filter(status=GoalStatus.COMPLETED).count()
        in_progress_goals = goals.filter(status=GoalStatus.IN_PROGRESS).count()
        avg_progress = (
            sum([float(g.completion_percentage) for g in goals]) / total_goals
            if total_goals > 0 else 0.0
        )

        # 2. Mentor Details
        mentor_info = {
            'name': 'Elena Rostova',
            'email': 'elena.qa@company.com',
            'designation': 'QA Automation & Engineering Lead',
            'department': 'Engineering',
            'avatar': 'ER',
            'status': 'Active Mentorship'
        }
        if profile.manager:
            mgr = profile.manager
            mgr_profile = getattr(mgr, 'profile', None)
            mentor_info['name'] = mgr_profile.full_name if mgr_profile else (f"{mgr.first_name} {mgr.last_name}".strip() or mgr.username)
            mentor_info['email'] = mgr.email or 'mentor@company.com'
            mentor_info['designation'] = mgr_profile.designation if mgr_profile else 'Senior Engineering Mentor'
            mentor_info['department'] = mgr_profile.department.name if (mgr_profile and mgr_profile.department) else 'Engineering'
            f_initial = mgr_profile.first_name[:1] if mgr_profile else mgr.username[:1]
            l_initial = mgr_profile.last_name[:1] if mgr_profile else "M"
            mentor_info['avatar'] = f"{f_initial}{l_initial}".upper()

        # 3. Active Evaluation Cycle
        cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).order_by('-start_date').first()
        if not cycle:
            cycle = PerformanceCycle.objects.first()
        
        days_remaining = (cycle.end_date - date.today()).days if cycle and cycle.end_date else 30
        cycle_info = {
            'id': str(cycle.id) if cycle else None,
            'name': cycle.name if cycle else 'Q3 2026 Intern Performance Evaluation Cycle',
            'description': cycle.description if cycle else 'Evaluation Cycle for Intern Performance & Learning',
            'startDate': str(cycle.start_date) if cycle else str(date.today() - timedelta(days=30)),
            'endDate': str(cycle.end_date) if cycle else str(date.today() + timedelta(days=30)),
            'status': cycle.status if cycle else 'ACTIVE',
            'currentPhase': 'Self-Evaluation & Milestone Review Phase',
            'daysRemaining': max(0, days_remaining),
        }

        # 4. Tasks metrics & Pending Deadlines
        tasks = InternTask.objects.filter(intern=profile)
        pending_tasks = tasks.filter(is_completed=False)
        pending_tasks_count = pending_tasks.count()

        # Build Deadlines list
        deadlines = []
        for t in pending_tasks:
            days_left = (t.due_date - date.today()).days
            deadlines.append({
                'id': str(t.id),
                'title': t.title,
                'type': 'TASK',
                'dueDate': str(t.due_date),
                'daysLeft': days_left,
                'isUrgent': days_left <= 3,
                'status': 'OVERDUE' if days_left < 0 else ('DUE_TODAY' if days_left == 0 else 'PENDING')
            })

        for g in goals.filter(status=GoalStatus.IN_PROGRESS):
            days_left = (g.due_date - date.today()).days
            deadlines.append({
                'id': str(g.id),
                'title': f"Goal: {g.title}",
                'type': 'GOAL',
                'dueDate': str(g.due_date),
                'daysLeft': days_left,
                'isUrgent': days_left <= 5,
                'status': 'OVERDUE' if days_left < 0 else ('DUE_TODAY' if days_left == 0 else 'PENDING')
            })

        # Self-evaluation deadline
        eval_deadline = cycle.end_date if cycle and cycle.end_date else (date.today() + timedelta(days=14))
        eval_days_left = (eval_deadline - date.today()).days
        deadlines.append({
            'id': 'self-eval-cutoff',
            'title': 'Self-Appraisal Questionnaire Submission Cutoff',
            'type': 'EVALUATION',
            'dueDate': str(eval_deadline),
            'daysLeft': eval_days_left,
            'isUrgent': eval_days_left <= 7,
            'status': 'OVERDUE' if eval_days_left < 0 else 'PENDING'
        })
        deadlines.sort(key=lambda x: x['daysLeft'])

        # 5. Published Results & Classification with flexible HR parameters
        calc_score = ScoringService.calculate_cycle_score(profile, cycle)
        weight_dist = calc_score.get('weight_distribution', {
            'goals_and_kpis': 40.0,
            'manager_evaluation': 40.0,
            'self_assessment': 20.0
        })
        eval_params = calc_score.get('evaluation_parameters', [])

        published_appraisal = Appraisal.objects.filter(
            employee=profile,
            status=AppraisalStatus.PUBLISHED
        ).order_by('-published_at', '-created_at').first()

        published_results = None
        if published_appraisal:
            score = float(published_appraisal.overall_score) if published_appraisal.overall_score is not None else float(calc_score.get('overall_score', 92.5))
            published_results = {
                'isPublished': True,
                'overallScore': score,
                'classification': get_performance_classification(score),
                'weightDistribution': weight_dist,
                'evaluationParameters': eval_params,
                'scoreBreakdown': calc_score.get('breakdown', {}),
                'reviewerComments': published_appraisal.reviewer_comments or "Demonstrated exceptional competence and high-quality deliverables throughout the evaluation cycle.",
                'finalComments': published_appraisal.final_comments or "HR Committee verified: Consistently exceeds benchmarks for intern cohort.",
                'areasForImprovement': [
                    "Continue expanding automated integration and load testing scenarios.",
                    "Take on peer mentorship opportunities for incoming cohort interns.",
                    "Deepen hands-on exposure to production CI/CD deployment pipelines."
                ],
                'publishedAt': str(published_appraisal.published_at or published_appraisal.updated_at),
                'reviewerName': mentor_info['name']
            }
        else:
            published_results = {
                'isPublished': False,
                'overallScore': None,
                'classification': None,
                'weightDistribution': weight_dist,
                'evaluationParameters': eval_params,
                'scoreBreakdown': calc_score.get('breakdown', {}),
                'reviewerComments': None,
                'finalComments': None,
                'areasForImprovement': [],
                'publishedAt': None,
                'reviewerName': mentor_info['name']
            }

        return Response({
            'code': 200,
            'data': {
                'personalScorecard': {
                    'totalGoals': total_goals,
                    'completedGoals': completed_goals,
                    'inProgressGoals': in_progress_goals,
                    'averageProgress': round(float(avg_progress), 2),
                    'pendingTasksCount': pending_tasks_count,
                    'upcomingDeadlinesCount': len(deadlines),
                    'publishedScore': published_results['overallScore'] if published_results['isPublished'] else None,
                    'performanceClassification': published_results['classification'] if published_results['isPublished'] else None,
                    'weightDistribution': weight_dist,
                    'evaluationParameters': eval_params
                },
                'mentor': mentor_info,
                'cycle': cycle_info,
                'deadlines': deadlines,
                'publishedResults': published_results
            }
        })


class InternGoalsView(APIView):
    """
    View assigned goals with weightage, status, priority, due date,
    progress %, comment threads, and evidence submission count.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = ensure_intern_demo_pms_data(user)
        goals = Goal.objects.filter(employee=profile).select_related('cycle', 'assigned_by')

        data = []
        # Predefined default weightages for balanced display
        weightages = [40, 35, 25]

        for idx, g in enumerate(goals):
            comments_qs = InternGoalComment.objects.filter(goal=g).order_by('created_at')
            comments = [{
                'id': str(c.id),
                'authorName': c.author_name,
                'authorRole': c.author_role,
                'comment': c.comment,
                'isMentor': c.is_mentor,
                'createdAt': c.created_at.strftime('%Y-%m-%d %H:%M'),
                'parentId': str(c.parent_id) if c.parent_id else None
            } for c in comments_qs]

            evidence_count = EvidenceSubmission.objects.filter(goal=g).count()

            data.append({
                'id': str(g.id),
                'title': g.title,
                'description': g.description,
                'progress': float(g.completion_percentage),
                'completionPercentage': float(g.completion_percentage),
                'weightage': weightages[idx % len(weightages)],
                'status': g.status,
                'priority': g.priority,
                'dueDate': str(g.due_date) if g.due_date else None,
                'cycleName': g.cycle.name if g.cycle else 'Active Cycle',
                'assignedByName': g.assigned_by.username if g.assigned_by else 'Mentor',
                'comments': comments,
                'evidenceCount': evidence_count
            })

        return Response({'code': 200, 'data': data})


class InternUpdateProgressView(APIView):
    """
    Update goal progress real-time ($0–100\%$).
    Automatically marks goal as COMPLETED when progress reaches 100%.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        profile = getattr(user, 'profile', None) or EmployeeProfile.objects.filter(user=user).first()
        goal = Goal.objects.filter(id=pk, employee=profile).first()
        if not goal:
            return Response({'code': 404, 'message': 'Goal not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            progress = float(request.data.get('progress', 0))
        except (ValueError, TypeError):
            return Response({'code': 400, 'message': 'Invalid progress value'}, status=status.HTTP_400_BAD_REQUEST)

        goal.completion_percentage = min(100.0, max(0.0, progress))
        if goal.completion_percentage >= 100.0:
            goal.status = GoalStatus.COMPLETED
        elif goal.completion_percentage > 0:
            goal.status = GoalStatus.IN_PROGRESS
        else:
            goal.status = GoalStatus.NOT_STARTED
        goal.save(update_fields=['completion_percentage', 'status', 'updated_at'])

        # Optional update comment
        comment_text = request.data.get('comment', '').strip()
        if comment_text:
            InternGoalComment.objects.create(
                goal=goal,
                author=user,
                author_name=profile.full_name if profile else user.username,
                author_role='INTERN',
                comment=f"Progress updated to {goal.completion_percentage}%: {comment_text}",
                is_mentor=False
            )

        return Response({
            'code': 200,
            'message': f'Goal progress updated to {goal.completion_percentage}%',
            'data': {
                'id': str(goal.id),
                'progress': float(goal.completion_percentage),
                'status': goal.status
            }
        })


class InternGoalCommentsView(APIView):
    """
    Add comments to goals & reply to mentor comments where permitted.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        profile = getattr(user, 'profile', None) or EmployeeProfile.objects.filter(user=user).first()
        goal = Goal.objects.filter(id=pk, employee=profile).first()
        if not goal:
            return Response({'code': 404, 'message': 'Goal not found'}, status=status.HTTP_404_NOT_FOUND)

        comments = InternGoalComment.objects.filter(goal=goal).order_by('created_at')
        data = [{
            'id': str(c.id),
            'authorName': c.author_name,
            'authorRole': c.author_role,
            'comment': c.comment,
            'isMentor': c.is_mentor,
            'createdAt': c.created_at.strftime('%Y-%m-%d %H:%M'),
            'parentId': str(c.parent_id) if c.parent_id else None
        } for c in comments]
        return Response({'code': 200, 'data': data})

    def post(self, request, pk):
        user = request.user
        profile = getattr(user, 'profile', None) or EmployeeProfile.objects.filter(user=user).first()
        goal = Goal.objects.filter(id=pk, employee=profile).first()
        if not goal:
            return Response({'code': 404, 'message': 'Goal not found'}, status=status.HTTP_404_NOT_FOUND)

        comment_text = request.data.get('comment', '').strip()
        if not comment_text:
            return Response({'code': 400, 'message': 'Comment cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        parent_id = request.data.get('parentId')
        parent_comment = None
        if parent_id:
            parent_comment = InternGoalComment.objects.filter(id=parent_id, goal=goal).first()

        new_comment = InternGoalComment.objects.create(
            goal=goal,
            author=user,
            author_name=profile.full_name if profile else user.username,
            author_role='INTERN',
            comment=comment_text,
            is_mentor=False,
            parent=parent_comment
        )

        return Response({
            'code': 201,
            'message': 'Comment posted successfully',
            'data': {
                'id': str(new_comment.id),
                'authorName': new_comment.author_name,
                'authorRole': new_comment.author_role,
                'comment': new_comment.comment,
                'isMentor': new_comment.is_mentor,
                'createdAt': new_comment.created_at.strftime('%Y-%m-%d %H:%M'),
                'parentId': str(new_comment.parent_id) if new_comment.parent_id else None
            }
        }, status=status.HTTP_201_CREATED)


class InternEvidenceView(APIView):
    """
    List submitted evidence and submit new proof of work against goals:
    - Attach files (file upload / file attachments)
    - Add URLs (GitHub PR, Figma, docs, commits)
    - View mentor verification status & notes
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, 'profile', None) or EmployeeProfile.objects.filter(user=user).first()
        evidence_list = EvidenceSubmission.objects.filter(employee=profile).select_related('goal').order_by('-created_at')

        data = [{
            'id': str(e.id),
            'goalId': str(e.goal_id) if e.goal_id else None,
            'goalTitle': e.goal.title if e.goal else 'General Milestone Evidence',
            'title': e.title,
            'description': e.description,
            'externalUrl': e.external_url,
            'fileAttachment': e.file_attachment.url if e.file_attachment else None,
            'fileName': e.file_attachment.name.split('/')[-1] if e.file_attachment else None,
            'reviewStatus': e.review_status,
            'reviewNotes': e.review_notes,
            'reviewedBy': e.reviewed_by.username if e.reviewed_by else None,
            'createdAt': e.created_at.strftime('%Y-%m-%d %H:%M')
        } for e in evidence_list]

        return Response({'code': 200, 'data': data})

    def post(self, request):
        user = request.user
        profile = getattr(user, 'profile', None) or EmployeeProfile.objects.filter(user=user).first()

        goal_id = request.data.get('goalId')
        goal = Goal.objects.filter(id=goal_id, employee=profile).first()
        if not goal:
            # Fallback to first goal if not supplied
            goal = Goal.objects.filter(employee=profile).first()

        title = request.data.get('title', 'Work Evidence Submission').strip()
        description = request.data.get('description', request.data.get('notes', '')).strip()
        external_url = request.data.get('externalUrl', request.data.get('evidenceUrl', '')).strip()
        file_obj = request.FILES.get('file')

        evidence = EvidenceSubmission.objects.create(
            employee=profile,
            goal=goal,
            title=title,
            description=description,
            external_url=external_url,
            review_status='PENDING'
        )

        if file_obj:
            evidence.file_attachment = file_obj
            evidence.save(update_fields=['file_attachment'])

        return Response({
            'code': 201,
            'message': 'Evidence submitted successfully for mentor verification',
            'data': {
                'id': str(evidence.id),
                'goalTitle': goal.title if goal else 'General Evidence',
                'title': evidence.title,
                'externalUrl': evidence.external_url,
                'reviewStatus': evidence.review_status,
                'createdAt': evidence.created_at.strftime('%Y-%m-%d %H:%M')
            }
        }, status=status.HTTP_201_CREATED)


class InternTasksView(APIView):
    """
    View assigned tasks & milestones with step-by-step instructions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = ensure_intern_demo_pms_data(user)
        tasks = InternTask.objects.filter(intern=profile).order_by('is_completed', 'due_date')

        data = [{
            'id': str(t.id),
            'title': t.title,
            'category': t.category,
            'instructions': t.instructions,
            'priority': t.priority,
            'dueDate': str(t.due_date),
            'isCompleted': t.is_completed,
            'completedAt': str(t.completed_at) if t.completed_at else None,
            'hoursSpent': float(t.hours_spent) if t.hours_spent is not None else None,
            'completionNotes': t.completion_notes,
            'artifactUrl': t.artifact_url,
            'isPermittedToComplete': t.is_permitted_to_complete,
            'isOverdue': not t.is_completed and t.due_date < date.today()
        } for t in tasks]

        return Response({'code': 200, 'data': data})


class InternCompleteTaskView(APIView):
    """
    Mark work complete where permitted.
    Record completion date and configured fields (hours spent, notes, artifact URL).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        profile = getattr(user, 'profile', None) or EmployeeProfile.objects.filter(user=user).first()
        task = InternTask.objects.filter(id=pk, intern=profile).first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

        if not task.is_permitted_to_complete:
            return Response({
                'code': 403,
                'message': 'Completion permission for this task is restricted to your mentor/HR'
            }, status=status.HTTP_403_FORBIDDEN)

        is_completed = request.data.get('isCompleted', True)
        task.is_completed = bool(is_completed)

        if task.is_completed:
            date_str = request.data.get('completedAt')
            if date_str:
                try:
                    task.completed_at = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    task.completed_at = date.today()
            else:
                task.completed_at = date.today()

            hours = request.data.get('hoursSpent')
            if hours is not None:
                try:
                    task.hours_spent = Decimal(str(hours))
                except Exception:
                    pass

            notes = request.data.get('completionNotes')
            if notes is not None:
                task.completion_notes = str(notes).strip()

            artifact = request.data.get('artifactUrl')
            if artifact is not None:
                task.artifact_url = str(artifact).strip()
        else:
            task.completed_at = None

        task.save()

        return Response({
            'code': 200,
            'message': f"Task '{task.title}' marked as {'completed' if task.is_completed else 'pending'}",
            'data': {
                'id': str(task.id),
                'isCompleted': task.is_completed,
                'completedAt': str(task.completed_at) if task.completed_at else None,
                'hoursSpent': float(task.hours_spent) if task.hours_spent else None,
                'completionNotes': task.completion_notes,
                'artifactUrl': task.artifact_url
            }
        })


class InternSelfAppraisalView(APIView):
    """
    Self-Rating and HR-Published Questionnaire:
    - Complete self-rating (1–10 scale) when enabled
    - Fill HR-published structured questions
    - Submit final or save draft
    """
    permission_classes = [permissions.IsAuthenticated]

    HR_DEFAULT_QUESTIONS = [
        {
            'id': 'q1',
            'category': 'Key Deliverables',
            'question': 'What key technical deliverables and milestone features did you successfully complete during this cycle?',
            'placeholder': 'Describe your main architectural contributions, code features delivered, and pull requests merged...'
        },
        {
            'id': 'q2',
            'category': 'Problem Solving & Challenges',
            'question': 'Describe a significant technical obstacle you encountered and the analytical approach you used to resolve it.',
            'placeholder': 'Explain the debugging steps, root-cause analysis, and solutions implemented...'
        },
        {
            'id': 'q3',
            'category': 'Technical Skills Mastered',
            'question': 'Which programming languages, frameworks, developer tools, or testing practices did you acquire or strengthen?',
            'placeholder': 'List technologies, libraries, automated testing tools, or architectural concepts mastered...'
        },
        {
            'id': 'q4',
            'category': 'Mentorship & Growth',
            'question': 'In what technical domains or soft skills would you like focused guidance or mentorship in the upcoming sprint?',
            'placeholder': 'Identify growth areas (e.g. system design, microservices, cloud deployments, presentation skills)...'
        },
        {
            'id': 'q5',
            'category': 'Self-Assessment Summary',
            'question': 'Overall self-evaluation reflection and goals for your next growth milestone.',
            'placeholder': 'Summarize your overall performance and key targets for the next evaluation cycle...'
        }
    ]

    def get(self, request):
        user = request.user
        profile = ensure_intern_demo_pms_data(user)
        cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).first() or PerformanceCycle.objects.first()

        submission = InternSelfAppraisalSubmission.objects.filter(intern=profile, cycle=cycle).first() if cycle else None

        data = {
            'isEnabled': True,  # Self-evaluation window open
            'isSubmitted': submission.is_submitted if submission else False,
            'submittedAt': str(submission.submitted_at) if submission and submission.submitted_at else None,
            'selfRating': float(submission.self_rating) if submission else 8.5,
            'achievements': submission.achievements if submission else "",
            'challenges': submission.challenges if submission else "",
            'skillsAcquired': submission.skills_acquired if submission else "",
            'mentorshipNeeds': submission.mentorship_needs if submission else "",
            'reflectionSummary': submission.reflection_summary if submission else "",
            'hrQuestions': self.HR_DEFAULT_QUESTIONS,
            'cycleName': cycle.name if cycle else 'Current Evaluation Cycle'
        }

        return Response({'code': 200, 'data': data})

    def post(self, request):
        user = request.user
        profile = getattr(user, 'profile', None) or EmployeeProfile.objects.filter(user=user).first()
        cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).first() or PerformanceCycle.objects.first()

        if not cycle:
            return Response({'code': 400, 'message': 'No active performance cycle found'}, status=status.HTTP_400_BAD_REQUEST)

        submission, _ = InternSelfAppraisalSubmission.objects.get_or_create(
            intern=profile,
            cycle=cycle
        )

        # Rating (1.0 to 10.0 scale)
        if 'selfRating' in request.data:
            try:
                rating = float(request.data['selfRating'])
                submission.self_rating = Decimal(str(min(10.0, max(1.0, rating))))
            except Exception:
                pass

        if 'achievements' in request.data:
            submission.achievements = str(request.data['achievements']).strip()
        if 'challenges' in request.data:
            submission.challenges = str(request.data['challenges']).strip()
        if 'skillsAcquired' in request.data:
            submission.skills_acquired = str(request.data['skillsAcquired']).strip()
        if 'mentorshipNeeds' in request.data:
            submission.mentorship_needs = str(request.data['mentorshipNeeds']).strip()
        if 'reflectionSummary' in request.data:
            submission.reflection_summary = str(request.data['reflectionSummary']).strip()

        is_draft = request.data.get('isDraft', False)
        if not is_draft:
            submission.is_submitted = True
            submission.submitted_at = timezone.now()

        submission.save()

        # Also sync or create Appraisal record of type SELF in apps.performance
        self_appraisal, _ = Appraisal.objects.get_or_create(
            employee=profile,
            cycle=cycle,
            appraisal_type=AppraisalType.SELF,
            defaults={'status': AppraisalStatus.DRAFT}
        )
        self_appraisal.overall_score = submission.self_rating * Decimal('10.0')  # Normalize to 100%
        self_appraisal.self_comments = f"Achievements: {submission.achievements}\nReflection: {submission.reflection_summary}"
        if submission.is_submitted:
            self_appraisal.status = AppraisalStatus.SUBMITTED
            self_appraisal.submitted_at = timezone.now()
        self_appraisal.save()

        status_msg = "Draft saved" if is_draft else "Self-appraisal submitted successfully to your mentor & HR"
        return Response({
            'code': 200,
            'message': status_msg,
            'data': {
                'isSubmitted': submission.is_submitted,
                'submittedAt': str(submission.submitted_at) if submission.submitted_at else None,
                'selfRating': float(submission.self_rating)
            }
        })


class InternPublishedFeedbackView(APIView):
    """
    View published mentor feedback, performance ratings, classification,
    and published areas for improvement (privacy gated until published).
    Interns can also reply to mentor comments where permitted.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, 'profile', None) or EmployeeProfile.objects.filter(user=user).first()
        if not profile:
            return Response({'code': 200, 'data': {'isPublished': False}})

        published_appraisal = Appraisal.objects.filter(
            employee=profile,
            status=AppraisalStatus.PUBLISHED
        ).order_by('-published_at', '-created_at').first()

        if not published_appraisal:
            return Response({
                'code': 200,
                'data': {
                    'isPublished': False,
                    'message': 'Official evaluation is currently in progress. Published results will appear once released by HR.'
                }
            })

        score = float(published_appraisal.overall_score) if published_appraisal.overall_score is not None else 92.5
        classification = get_performance_classification(score)

        # Retrieve flexible scoring parameters for published appraisal cycle
        calc_score = ScoringService.calculate_cycle_score(profile, published_appraisal.cycle)
        weight_dist = calc_score.get('weight_distribution', {
            'goals_and_kpis': 40.0,
            'manager_evaluation': 40.0,
            'self_assessment': 20.0
        })
        eval_params = calc_score.get('evaluation_parameters', [])

        # Retrieve intern replies
        replies = InternFeedbackReply.objects.filter(intern=profile, appraisal=published_appraisal).order_by('created_at')
        replies_data = [{
            'id': str(r.id),
            'replyText': r.reply_text,
            'createdAt': r.created_at.strftime('%Y-%m-%d %H:%M')
        } for r in replies]

        mentor_name = (
            published_appraisal.reviewer.username
            if published_appraisal.reviewer else 'Elena Rostova (Mentor)'
        )

        return Response({
            'code': 200,
            'data': {
                'isPublished': True,
                'cycleName': published_appraisal.cycle.name if published_appraisal.cycle else 'Active Evaluation Cycle',
                'overallScore': score,
                'performanceClassification': classification,
                'weightDistribution': weight_dist,
                'evaluationParameters': eval_params,
                'scoreBreakdown': calc_score.get('breakdown', {}),
                'publishedAt': str(published_appraisal.published_at or published_appraisal.updated_at),
                'mentorName': mentor_name,
                'mentorFeedback': published_appraisal.reviewer_comments or "Outstanding performance and proactive milestone delivery.",
                'finalConclusion': published_appraisal.final_comments or "HR Committee verified: Exceeds expectations for cohort.",
                'areasForImprovement': [
                    "Continue expanding automated test coverage across asynchronous worker queues.",
                    "Engage in technical architecture design discussions for upcoming quarterly features.",
                    "Document reusable utility libraries for fellow interns and team members."
                ],
                'replies': replies_data,
                'isReplyPermitted': True
            }
        })

    def post(self, request):
        """Reply to mentor comments where permitted"""
        user = request.user
        profile = getattr(user, 'profile', None) or EmployeeProfile.objects.filter(user=user).first()
        published_appraisal = Appraisal.objects.filter(
            employee=profile,
            status=AppraisalStatus.PUBLISHED
        ).first()

        reply_text = request.data.get('replyText', '').strip()
        if not reply_text:
            return Response({'code': 400, 'message': 'Reply text cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        reply = InternFeedbackReply.objects.create(
            intern=profile,
            appraisal=published_appraisal,
            reply_text=reply_text
        )

        return Response({
            'code': 201,
            'message': 'Reply sent to your mentor',
            'data': {
                'id': str(reply.id),
                'replyText': reply.reply_text,
                'createdAt': reply.created_at.strftime('%Y-%m-%d %H:%M')
            }
        }, status=status.HTTP_201_CREATED)
