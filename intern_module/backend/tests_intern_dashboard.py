import os
import django
from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile
from apps.goals.models import Goal, GoalStatus, GoalPriority
from apps.performance.models import PerformanceCycle, CycleStatus, Appraisal, AppraisalStatus, AppraisalType
from apps.intern.models import InternTask, InternGoalComment, InternSelfAppraisalSubmission, InternFeedbackReply
from apps.intern.views import (
    InternOverviewView, InternGoalsView, InternUpdateProgressView,
    InternGoalCommentsView, InternEvidenceView, InternTasksView,
    InternCompleteTaskView, InternSelfAppraisalView, InternPublishedFeedbackView
)


class InternDashboardFeatureTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        # 1. Mentor
        self.mentor_user = User.objects.create_user(
            username='mentor_lead',
            email='mentor.lead@dailoqa.com',
            role=UserRole.MANAGER
        )
        self.mentor_profile = EmployeeProfile.objects.create(
            user=self.mentor_user,
            employee_code='MGR-001',
            first_name='Elena',
            last_name='Rostova',
            designation='QA Automation Lead',
            employment_status='ACTIVE'
        )

        # 2. Intern User
        self.intern_user = User.objects.create_user(
            username='intern_test',
            email='intern.test@dailoqa.com',
            role=UserRole.INTERN
        )
        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern_user,
            employee_code='INT-001',
            first_name='Jasleen',
            last_name='Kaur',
            designation='Software Engineering Intern',
            employment_status='ACTIVE',
            manager=self.mentor_user
        )

        # 3. Active Cycle
        self.cycle = PerformanceCycle.objects.create(
            name='Q3 2026 Intern Performance Evaluation Cycle',
            description='Intern PMS Evaluation Cycle',
            start_date=date.today() - timedelta(days=30),
            end_date=date.today() + timedelta(days=30),
            status=CycleStatus.ACTIVE
        )

        # 4. Assigned Goal
        self.goal = Goal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            assigned_by=self.mentor_user,
            title='Authentication & JWT System Modernization',
            description='Implement dynamic Dailoqa onboarding, forced rotation, and reset flows.',
            due_date=date.today() + timedelta(days=14),
            status=GoalStatus.IN_PROGRESS,
            priority=GoalPriority.HIGH,
            completion_percentage=Decimal('50.00')
        )

        # 5. Assigned Task with Instructions
        self.task = InternTask.objects.create(
            intern=self.intern_profile,
            title='Configure Automated Security Auth Test Suite',
            instructions='1. Verify test runner.\n2. Execute 18 test cases.\n3. Log hours and submit artifact.',
            priority='HIGH',
            due_date=date.today() + timedelta(days=5),
            is_completed=False,
            is_permitted_to_complete=True
        )

        # 6. Published Appraisal
        self.appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.mentor_user,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.PUBLISHED,
            overall_score=Decimal('94.00'),
            reviewer_comments='Exceptional engineering delivery and thorough automated testing.',
            final_comments='HR Committee: Promoted to Lead Intern on authentication.',
            published_at=date.today()
        )

    def test_01_view_personal_dashboard_and_mentor(self):
        """Feature 1 & 2: View personal dashboard & assigned mentor"""
        req = self.factory.get('/api/intern/overview/')
        force_authenticate(req, user=self.intern_user)
        res = InternOverviewView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        data = res.data['data']

        # Personal scorecard check
        self.assertIn('personalScorecard', data)
        self.assertEqual(data['personalScorecard']['totalGoals'], 1)

        # Assigned mentor check
        self.assertEqual(data['mentor']['name'], 'Elena Rostova')
        self.assertEqual(data['mentor']['email'], 'mentor.lead@dailoqa.com')
        self.assertEqual(data['mentor']['status'], 'Active Mentorship')

    def test_02_view_current_evaluation_cycle(self):
        """Feature 3: View current evaluation cycle"""
        req = self.factory.get('/api/intern/overview/')
        force_authenticate(req, user=self.intern_user)
        res = InternOverviewView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        cycle_info = res.data['data']['cycle']
        self.assertEqual(cycle_info['name'], 'Q3 2026 Intern Performance Evaluation Cycle')
        self.assertEqual(cycle_info['status'], 'ACTIVE')
        self.assertGreater(cycle_info['daysRemaining'], 0)

    def test_03_view_assigned_goals(self):
        """Feature 4: View assigned goals"""
        req = self.factory.get('/api/intern/my-goals/')
        force_authenticate(req, user=self.intern_user)
        res = InternGoalsView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['data']), 1)
        g = res.data['data'][0]
        self.assertEqual(g['title'], 'Authentication & JWT System Modernization')
        self.assertEqual(g['progress'], 50.0)
        self.assertEqual(g['status'], 'IN_PROGRESS')

    def test_04_update_goal_progress_and_auto_completion(self):
        """Feature 5: Update goal progress real-time with auto-completion"""
        req = self.factory.post(
            f'/api/intern/my-goals/{self.goal.id}/progress/',
            {'progress': 100.0, 'comment': 'Completed all test cases and merged PR'},
            format='json'
        )
        force_authenticate(req, user=self.intern_user)
        res = InternUpdateProgressView.as_view()(req, pk=str(self.goal.id))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['data']['progress'], 100.0)
        self.assertEqual(res.data['data']['status'], GoalStatus.COMPLETED)

    def test_05_add_comments_to_goals_and_reply_to_mentor(self):
        """Feature 6 & 7: Add comments to goals and reply to mentor comments"""
        # Mentor adds comment
        mentor_comment = InternGoalComment.objects.create(
            goal=self.goal,
            author=self.mentor_user,
            author_name='Elena Rostova',
            author_role='MENTOR',
            comment='Please ensure edge case with expired reset tokens is tested.',
            is_mentor=True
        )

        # Intern replies to mentor comment
        req = self.factory.post(
            f'/api/intern/my-goals/{self.goal.id}/comments/',
            {'comment': 'Edge case verified with 15-min expiration test case.', 'parentId': str(mentor_comment.id)},
            format='json'
        )
        force_authenticate(req, user=self.intern_user)
        res = InternGoalCommentsView.as_view()(req, pk=str(self.goal.id))
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['data']['parentId'], str(mentor_comment.id))
        self.assertFalse(res.data['data']['isMentor'])

    def test_06_submit_and_view_evidence(self):
        """Feature 8, 9, 10: Submit evidence against goals with URLs & view status"""
        req = self.factory.post(
            '/api/intern/evidence/submit/',
            {
                'goalId': str(self.goal.id),
                'title': 'Test Report PR #14',
                'description': 'Automated tests passing with 100% coverage',
                'externalUrl': 'https://github.com/Jasleen2401/PerforMaxKaIntern/pull/14'
            },
            format='json'
        )
        force_authenticate(req, user=self.intern_user)
        res = InternEvidenceView.as_view()(req)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['data']['reviewStatus'], 'PENDING')

        # Verify listed in GET
        req_list = self.factory.get('/api/intern/evidence/')
        force_authenticate(req_list, user=self.intern_user)
        res_list = InternEvidenceView.as_view()(req_list)
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.data['data']), 1)
        self.assertEqual(res_list.data['data'][0]['externalUrl'], 'https://github.com/Jasleen2401/PerforMaxKaIntern/pull/14')

    def test_07_view_task_instructions_and_complete_task(self):
        """Feature 11, 12, 13: View instructions, mark complete with date, hours, and notes"""
        # View tasks
        req = self.factory.get('/api/intern/tasks/')
        force_authenticate(req, user=self.intern_user)
        res = InternTasksView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        t = res.data['data'][0]
        self.assertIn('Execute 18 test cases', t['instructions'])
        self.assertFalse(t['isCompleted'])

        # Complete task with configured fields
        req_complete = self.factory.post(
            f'/api/intern/tasks/{self.task.id}/complete/',
            {
                'isCompleted': True,
                'completedAt': '2026-09-28',
                'hoursSpent': 4.5,
                'completionNotes': 'All 18 security tests passing.',
                'artifactUrl': 'https://github.com/Jasleen2401/PerforMaxKaIntern'
            },
            format='json'
        )
        force_authenticate(req_complete, user=self.intern_user)
        res_complete = InternCompleteTaskView.as_view()(req_complete, pk=str(self.task.id))
        self.assertEqual(res_complete.status_code, 200)
        self.assertTrue(res_complete.data['data']['isCompleted'])
        self.assertEqual(res_complete.data['data']['hoursSpent'], 4.5)
        self.assertEqual(res_complete.data['data']['completedAt'], '2026-09-28')

    def test_08_complete_self_rating_and_hr_questionnaire(self):
        """Feature 14 & 15: Complete self-rating (1–10) and fill HR questionnaire"""
        req = self.factory.post(
            '/api/intern/self-appraisal/',
            {
                'selfRating': 9.0,
                'achievements': 'Upgraded entire auth subsystem and delivered dynamic onboarding.',
                'challenges': 'Eliminating plaintext storage while keeping first-login seamless.',
                'skillsAcquired': 'Django REST Framework, PBKDF2 SHA-256, React TypeScript.',
                'mentorshipNeeds': 'Advanced CI/CD deployment pipelines.',
                'reflectionSummary': 'Very fulfilling sprint with rapid feature delivery.'
            },
            format='json'
        )
        force_authenticate(req, user=self.intern_user)
        res = InternSelfAppraisalView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['data']['isSubmitted'])
        self.assertEqual(res.data['data']['selfRating'], 9.0)

    def test_09_view_published_results_classification_and_reply(self):
        """Feature 16, 17, 18, 19: View published feedback, score, classification, improvement areas, and reply"""
        req = self.factory.get('/api/intern/published-feedback/')
        force_authenticate(req, user=self.intern_user)
        res = InternPublishedFeedbackView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        data = res.data['data']
        self.assertTrue(data['isPublished'])
        self.assertEqual(data['overallScore'], 94.0)
        self.assertEqual(data['performanceClassification'], 'Outstanding Contributor')
        self.assertIn('Exceptional engineering delivery', data['mentorFeedback'])
        self.assertGreater(len(data['areasForImprovement']), 0)

        # Reply to mentor feedback
        req_reply = self.factory.post(
            '/api/intern/published-feedback/reply/',
            {'replyText': 'Thank you Elena! I will implement the additional worker test cases.'},
            format='json'
        )
        force_authenticate(req_reply, user=self.intern_user)
        res_reply = InternPublishedFeedbackView.as_view()(req_reply)
        self.assertEqual(res_reply.status_code, 201)
        self.assertIn('Reply sent to your mentor', res_reply.data['message'])

    def test_10_view_deadlines_and_pending_tasks_tracker(self):
        """Feature 20: View deadlines and pending tasks tracker"""
        req = self.factory.get('/api/intern/overview/')
        force_authenticate(req, user=self.intern_user)
        res = InternOverviewView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        deadlines = res.data['data']['deadlines']
        self.assertGreater(len(deadlines), 0)
        # Check that deadline items have required fields
        for d in deadlines:
            self.assertIn('dueDate', d)
            self.assertIn('type', d)
            self.assertIn('daysLeft', d)
