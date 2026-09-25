from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.organization.models import Department
from apps.employees.models import EmployeeProfile
from apps.performance.models import PerformanceCycle, CycleStatus
from apps.goals.models import Goal, KPI, GoalStatus
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus

class GoalsAndEvidenceAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Manager
        self.manager = User.objects.create_user(
            email='manager@test.com',
            username='mgr_smith',
            password='Password123!',
            role=UserRole.MANAGER
        )

        # Unrelated Manager
        self.other_manager = User.objects.create_user(
            email='other_mgr@test.com',
            username='other_mgr',
            password='Password123!',
            role=UserRole.MANAGER
        )

        # Department
        self.dept = Department.objects.create(name='Backend Engineering')

        # Intern
        self.intern_user = User.objects.create_user(
            email='intern@test.com',
            username='intern_dev',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern_user,
            employee_code='INT-101',
            first_name='Dev',
            last_name='Intern',
            department=self.dept,
            manager=self.manager
        )

        # Other Intern
        self.other_intern_user = User.objects.create_user(
            email='other_intern@test.com',
            username='other_intern',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.other_intern_profile = EmployeeProfile.objects.create(
            user=self.other_intern_user,
            employee_code='INT-102',
            first_name='Other',
            last_name='Intern',
            department=self.dept,
            manager=self.other_manager
        )

        # Cycle
        self.cycle = PerformanceCycle.objects.create(
            name='Q3 2026 Intern Evaluation',
            start_date='2026-07-01',
            end_date='2026-09-30',
            status=CycleStatus.ACTIVE
        )

    def test_manager_can_create_goal_with_kpi(self):
        self.client.force_authenticate(user=self.manager)
        goal_data = {
            'employee': str(self.intern_profile.id),
            'cycle': str(self.cycle.id),
            'title': 'Implement Authentication API',
            'description': 'Deliver JWT endpoints with test coverage',
            'due_date': '2026-09-25',
            'priority': 'HIGH'
        }
        resp = self.client.post('/api/goals/', goal_data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        goal_id = resp.data['id']

        # Add KPI
        kpi_data = {
            'goal': goal_id,
            'name': 'API Unit Test Coverage',
            'target_value': '90.00',
            'unit': '%'
        }
        kpi_resp = self.client.post('/api/goals/kpis/', kpi_data, format='json')
        self.assertEqual(kpi_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(kpi_resp.data['target_value'], '90.00')

    def test_intern_progress_logging_and_completion_status(self):
        goal = Goal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            assigned_by=self.manager,
            title='Fix bug in payment flow',
            description='Fix regression in staging',
            due_date='2026-09-28'
        )

        # Intern logs 50% progress
        self.client.force_authenticate(user=self.intern_user)
        resp1 = self.client.post(f'/api/goals/{goal.id}/progress/', {
            'progress_percentage': '50.00',
            'comment': 'Root cause identified and PR drafted.'
        })
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        goal.refresh_from_db()
        self.assertEqual(goal.completion_percentage, Decimal('50.00'))
        self.assertEqual(goal.status, GoalStatus.IN_PROGRESS)

        # Intern logs 100% progress
        resp2 = self.client.post(f'/api/goals/{goal.id}/progress/', {
            'progress_percentage': '100.00',
            'comment': 'PR merged and verified in staging.'
        })
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        goal.refresh_from_db()
        self.assertEqual(goal.completion_percentage, Decimal('100.00'))
        self.assertEqual(goal.status, GoalStatus.COMPLETED)

    def test_evidence_submission_and_manager_review_workflow(self):
        goal = Goal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            assigned_by=self.manager,
            title='Deploy Microservice',
            description='Deploy staging cluster',
            due_date='2026-09-30'
        )

        # Intern submits evidence URL
        self.client.force_authenticate(user=self.intern_user)
        ev_resp = self.client.post('/api/evidence/', {
            'goal': str(goal.id),
            'title': 'GitHub Pull Request & Test Run',
            'description': 'Verified green build on CI/CD pipeline',
            'external_url': 'https://github.com/myorg/repo/pull/42'
        })
        self.assertEqual(ev_resp.status_code, status.HTTP_201_CREATED)
        ev_id = ev_resp.data['id']
        self.assertEqual(ev_resp.data['review_status'], EvidenceReviewStatus.PENDING)

        # Unrelated intern cannot submit evidence for this goal
        self.client.force_authenticate(user=self.other_intern_user)
        unauth_resp = self.client.post('/api/evidence/', {
            'goal': str(goal.id),
            'title': 'Intruder submission',
            'description': 'Should be denied'
        })
        self.assertEqual(unauth_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Manager reviews and approves the evidence
        self.client.force_authenticate(user=self.manager)
        review_resp = self.client.post(f'/api/evidence/{ev_id}/review/', {
            'review_status': EvidenceReviewStatus.APPROVED,
            'review_notes': 'Well documented and fully tested. Approved!'
        })
        self.assertEqual(review_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(review_resp.data['review_status'], EvidenceReviewStatus.APPROVED)
        self.assertEqual(review_resp.data['reviewed_by_name'], 'mgr_smith')
