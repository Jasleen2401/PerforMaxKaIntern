from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.organization.models import Department
from apps.employees.models import EmployeeProfile
from apps.performance.models import (
    PerformanceCycle,
    CycleStatus,
    EvaluationCriterion,
    Appraisal,
    AppraisalType,
    AppraisalStatus,
    AppraisalRating,
)
from apps.performance.services.scoring import ScoringService
from apps.goals.models import Goal, KPI

class PerformanceScoringAndAppraisalTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # HR
        self.hr = User.objects.create_user(
            email='hr@test.com',
            username='hr_admin',
            password='Password123!',
            role=UserRole.HR
        )

        # Manager
        self.manager = User.objects.create_user(
            email='manager@test.com',
            username='manager_bob',
            password='Password123!',
            role=UserRole.MANAGER
        )

        # Department
        self.dept = Department.objects.create(name='Mobile Development')

        # Intern
        self.intern_user = User.objects.create_user(
            email='intern_sam@test.com',
            username='intern_sam',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern_user,
            employee_code='INT-201',
            first_name='Sam',
            last_name='Wilson',
            department=self.dept,
            manager=self.manager
        )

        # Cycle
        self.cycle = PerformanceCycle.objects.create(
            name='Q3 2026 Cycle',
            start_date='2026-07-01',
            end_date='2026-09-30',
            status=CycleStatus.ACTIVE
        )

        # Evaluation Criteria (Total weight = 100%)
        self.crit1 = EvaluationCriterion.objects.create(
            name='Technical Competence',
            description='Code quality, architectural design, debugging skills',
            maximum_score=Decimal('100.00'),
            weight=Decimal('50.00')
        )
        self.crit2 = EvaluationCriterion.objects.create(
            name='Team Collaboration & Ownership',
            description='Communication, initiative, punctuality',
            maximum_score=Decimal('100.00'),
            weight=Decimal('50.00')
        )

    def test_scoring_service_mathematical_precision(self):
        # 1. Create a goal with 80% completion and a KPI with 100% target/achieved
        goal = Goal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            assigned_by=self.manager,
            title='Implement Chat Module',
            description='Mobile chat',
            due_date='2026-09-25',
            completion_percentage=Decimal('80.00')
        )
        KPI.objects.create(
            goal=goal,
            name='Tests Written',
            target_value=Decimal('10.00'),
            achieved_value=Decimal('10.00'),
            unit='tests'
        )
        # Goal avg = 80, KPI avg = 100. Composite = (80*0.5)+(100*0.5) = 90.00

        # 2. Create Manager Appraisal with ratings: Crit1: 90/100, Crit2: 90/100 -> 90.00
        mgr_appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.manager,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.SUBMITTED
        )
        AppraisalRating.objects.create(appraisal=mgr_appraisal, criterion=self.crit1, score=Decimal('90.00'))
        AppraisalRating.objects.create(appraisal=mgr_appraisal, criterion=self.crit2, score=Decimal('90.00'))

        # 3. Create Self Appraisal with ratings: Crit1: 80/100, Crit2: 80/100 -> 80.00
        self_appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.intern_user,
            appraisal_type=AppraisalType.SELF,
            status=AppraisalStatus.SUBMITTED
        )
        AppraisalRating.objects.create(appraisal=self_appraisal, criterion=self.crit1, score=Decimal('80.00'))
        AppraisalRating.objects.create(appraisal=self_appraisal, criterion=self.crit2, score=Decimal('80.00'))

        # Expected overall = (90.00 * 0.40) + (90.00 * 0.40) + (80.00 * 0.20)
        #                  = 36.00 + 36.00 + 16.00 = 88.00 (VERY_GOOD)
        calc = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        self.assertEqual(calc['goals_composite_score'], 90.00)
        self.assertEqual(calc['manager_criteria_score'], 90.00)
        self.assertEqual(calc['self_assessment_score'], 80.00)
        self.assertEqual(calc['overall_score'], 88.00)
        self.assertEqual(calc['performance_grade'], 'VERY_GOOD')

    def test_appraisal_lifecycle_and_intern_visibility_restriction(self):
        # 1. Manager drafts an evaluation
        mgr_appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.manager,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.DRAFT,
            reviewer_comments='Preliminary confidential notes'
        )

        # 2. Intern attempts to list appraisals - should NOT see draft manager appraisal
        self.client.force_authenticate(user=self.intern_user)
        list_resp = self.client.get('/api/performance/appraisals/')
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        results = list_resp.data.get('results', list_resp.data)
        self.assertEqual(len(results), 0)

        # 3. Manager submits evaluation
        self.client.force_authenticate(user=self.manager)
        sub_resp = self.client.post(f'/api/performance/appraisals/{mgr_appraisal.id}/submit/', {
            'comments': 'Great work across the board.',
            'ratings': [
                {'criterion_id': str(self.crit1.id), 'score': '95.00', 'comments': 'Strong PRs'},
                {'criterion_id': str(self.crit2.id), 'score': '90.00', 'comments': 'Good attendance'}
            ]
        }, format='json')
        self.assertEqual(sub_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(sub_resp.data['status'], AppraisalStatus.SUBMITTED)

        # Intern STILL cannot see submitted manager appraisal (only published!)
        self.client.force_authenticate(user=self.intern_user)
        unpub_resp = self.client.get('/api/performance/appraisals/')
        self.assertEqual(len(unpub_resp.data.get('results', unpub_resp.data)), 0)

        # 4. HR Publishes the appraisal
        self.client.force_authenticate(user=self.hr)
        pub_resp = self.client.post(f'/api/performance/appraisals/{mgr_appraisal.id}/publish/', {
            'final_comments': 'Approved by HR Director'
        }, format='json')
        self.assertEqual(pub_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(pub_resp.data['status'], AppraisalStatus.PUBLISHED)
        self.assertIsNotNone(pub_resp.data['overall_score'])

        # 5. Intern CAN NOW view the published appraisal and final score!
        self.client.force_authenticate(user=self.intern_user)
        pub_view = self.client.get('/api/performance/appraisals/')
        results = pub_view.data.get('results', pub_view.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['status'], AppraisalStatus.PUBLISHED)
        self.assertEqual(results[0]['id'], str(mgr_appraisal.id))

    def test_flexible_component_weights_and_custom_parameters(self):
        """HR modifies component weights and parameter weights; scoring dynamically recalculates."""
        # 1. Update cycle component weights: Goals 60%, Manager 20%, Self 20%
        self.cycle.goals_weight = Decimal('60.00')
        self.cycle.manager_weight = Decimal('20.00')
        self.cycle.self_weight = Decimal('20.00')
        self.cycle.save()

        # Goal completion = 100%
        goal = Goal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            assigned_by=self.manager,
            title='Authentication Module',
            due_date='2026-09-30',
            completion_percentage=Decimal('100.00')
        )

        # Manager appraisal: crit1 (70/100, weight 50), crit2 (90/100, weight 50) -> 80%
        mgr_appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.manager,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.SUBMITTED
        )
        AppraisalRating.objects.create(appraisal=mgr_appraisal, criterion=self.crit1, score=Decimal('70.00'))
        AppraisalRating.objects.create(appraisal=mgr_appraisal, criterion=self.crit2, score=Decimal('90.00'))

        # Self appraisal: crit1 (90/100, weight 50), crit2 (90/100, weight 50) -> 90%
        self_appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.intern_user,
            appraisal_type=AppraisalType.SELF,
            status=AppraisalStatus.SUBMITTED
        )
        AppraisalRating.objects.create(appraisal=self_appraisal, criterion=self.crit1, score=Decimal('90.00'))
        AppraisalRating.objects.create(appraisal=self_appraisal, criterion=self.crit2, score=Decimal('90.00'))

        # Expected overall = (100.00 * 0.60) + (80.00 * 0.20) + (90.00 * 0.20)
        #                  = 60.00 + 16.00 + 18.00 = 94.00 (EXCELLENT)
        calc = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        self.assertEqual(calc['goals_composite_score'], 100.00)
        self.assertEqual(calc['manager_criteria_score'], 80.00)
        self.assertEqual(calc['self_assessment_score'], 90.00)
        self.assertEqual(calc['overall_score'], 94.00)
        self.assertEqual(calc['performance_grade'], 'EXCELLENT')
        self.assertEqual(calc['weight_distribution']['goals_and_kpis'], 60.0)
        self.assertEqual(calc['weight_distribution']['manager_evaluation'], 20.0)
        self.assertEqual(calc['weight_distribution']['self_assessment'], 20.0)

    def test_hr_scoring_parameters_endpoint(self):
        """HR can query and update scoring parameters and weights via API; unauthorized users are blocked."""
        # 1. Non-HR cannot configure
        self.client.force_authenticate(user=self.intern_user)
        post_resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/scoring-parameters/', {
            'componentWeights': {'goalsWeight': 50, 'managerWeight': 30, 'selfWeight': 20}
        }, format='json')
        self.assertEqual(post_resp.status_code, status.HTTP_403_FORBIDDEN)

        # 2. HR can query current parameters
        self.client.force_authenticate(user=self.hr)
        get_resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/scoring-parameters/')
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertIn('componentWeights', get_resp.data['data'])
        self.assertIn('evaluationParameters', get_resp.data['data'])

        # 3. HR can update parameters and component weights
        update_resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/scoring-parameters/', {
            'componentWeights': {
                'goalsWeight': 35.0,
                'managerWeight': 45.0,
                'selfWeight': 20.0
            },
            'evaluationParameters': [
                {
                    'id': str(self.crit1.id),
                    'name': 'Updated Tech Mastery',
                    'weight': 60.0,
                    'maximumScore': 100.0,
                    'description': 'Advanced system design'
                },
                {
                    'name': 'New Problem Solving Metric',
                    'weight': 40.0,
                    'maximumScore': 100.0,
                    'description': 'Root cause resolution'
                }
            ]
        }, format='json')
        self.assertEqual(update_resp.status_code, status.HTTP_200_OK)
        self.cycle.refresh_from_db()
        self.assertEqual(self.cycle.goals_weight, Decimal('35.00'))
        self.assertEqual(self.cycle.manager_weight, Decimal('45.00'))
        self.assertEqual(self.cycle.self_weight, Decimal('20.00'))
        self.crit1.refresh_from_db()
        self.assertEqual(self.crit1.name, 'Updated Tech Mastery')
        self.assertEqual(self.crit1.weight, Decimal('60.00'))

