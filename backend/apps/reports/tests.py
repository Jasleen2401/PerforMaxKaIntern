from decimal import Decimal
from datetime import date
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User, UserRole
from apps.organization.models import Department
from apps.employees.models import EmployeeProfile
from apps.performance.models import PerformanceCycle, CycleStatus, Appraisal, AppraisalType, AppraisalStatus
from apps.goals.models import Goal, GoalStatus, KPI
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.attendance.models import AttendanceRecord, AttendanceStatus


class ReportsAPITests(APITestCase):

    def setUp(self):
        # Create Department
        self.dept = Department.objects.create(name='Engineering', description='Engineering Dept')

        # Create HR User
        self.hr_user = User.objects.create_user(
            username='hr_admin',
            email='hr@example.com',
            password='Password123!',
            role=UserRole.HR
        )
        self.hr_profile = EmployeeProfile.objects.create(
            user=self.hr_user,
            employee_code='HR001',
            first_name='HR',
            last_name='Administrator',
            department=self.dept,
            designation='HR Manager',
            joining_date=date(2025, 1, 1)
        )

        # Create Manager User
        self.manager_user = User.objects.create_user(
            username='manager_bob',
            email='bob@example.com',
            password='Password123!',
            role=UserRole.MANAGER
        )
        self.manager_profile = EmployeeProfile.objects.create(
            user=self.manager_user,
            employee_code='MGR001',
            first_name='Bob',
            last_name='Manager',
            department=self.dept,
            designation='Engineering Lead',
            joining_date=date(2025, 1, 1)
        )

        # Create Intern 1
        self.intern1_user = User.objects.create_user(
            username='intern_alice',
            email='alice@example.com',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern1_profile = EmployeeProfile.objects.create(
            user=self.intern1_user,
            employee_code='INT001',
            first_name='Alice',
            last_name='Intern',
            department=self.dept,
            designation='Software Intern',
            manager=self.manager_user,
            joining_date=date(2025, 6, 1)
        )

        # Create Intern 2
        self.intern2_user = User.objects.create_user(
            username='intern_charlie',
            email='charlie@example.com',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern2_profile = EmployeeProfile.objects.create(
            user=self.intern2_user,
            employee_code='INT002',
            first_name='Charlie',
            last_name='Intern',
            department=self.dept,
            designation='QA Intern',
            manager=self.manager_user,
            joining_date=date(2025, 6, 1)
        )

        # Performance Cycle
        self.cycle = PerformanceCycle.objects.create(
            name='Summer 2025 Cycle',
            start_date=date(2025, 6, 1),
            end_date=date(2025, 8, 31),
            status=CycleStatus.ACTIVE
        )

        # Goal and KPI for Intern 1
        self.goal = Goal.objects.create(
            employee=self.intern1_profile,
            cycle=self.cycle,
            assigned_by=self.manager_user,
            title='Implement Authentication System',
            description='Build JWT authentication module',
            due_date=date(2025, 8, 1),
            status=GoalStatus.COMPLETED,
            completion_percentage=Decimal('100.00')
        )
        self.kpi = KPI.objects.create(
            goal=self.goal,
            name='Test Coverage',
            target_value=Decimal('90.00'),
            achieved_value=Decimal('95.00'),
            unit='%'
        )

        # Evidence submission
        self.evidence = EvidenceSubmission.objects.create(
            employee=self.intern1_profile,
            goal=self.goal,
            title='Unit Tests Pass Run',
            description='Evidence of 95% test coverage',
            external_url='https://github.com/example/pr/1',
            review_status=EvidenceReviewStatus.APPROVED,
            reviewed_by=self.manager_user
        )

        # Attendance record
        AttendanceRecord.objects.create(
            employee=self.intern1_profile,
            attendance_date=date(2025, 6, 2),
            status=AttendanceStatus.PRESENT
        )
        AttendanceRecord.objects.create(
            employee=self.intern1_profile,
            attendance_date=date(2025, 6, 3),
            status=AttendanceStatus.HALF_DAY
        )

        # Published Appraisal
        self.appraisal = Appraisal.objects.create(
            employee=self.intern1_profile,
            cycle=self.cycle,
            reviewer=self.manager_user,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.PUBLISHED,
            overall_score=Decimal('92.50')
        )

    def test_intern_can_view_own_performance_summary(self):
        self.client.force_authenticate(user=self.intern1_user)
        url = reverse('my-performance-report')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data['employee']['employee_code'], 'INT001')
        self.assertEqual(data['goals']['total'], 1)
        self.assertEqual(data['goals']['completed'], 1)
        self.assertEqual(data['goals']['average_completion_percentage'], 100.0)
        self.assertEqual(data['evidence']['total'], 1)
        self.assertEqual(data['evidence']['approved'], 1)
        self.assertEqual(data['attendance']['total_days'], 2)
        # 1 present + 0.5 half day = 1.5 / 2.0 = 75.0%
        self.assertEqual(data['attendance']['attendance_rate_percentage'], 75.0)
        self.assertEqual(data['appraisal']['latest_score'], 92.5)

    def test_intern_forbidden_from_viewing_other_intern_report(self):
        self.client.force_authenticate(user=self.intern1_user)
        url = f"{reverse('my-performance-report')}?employee_id={self.intern2_profile.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_view_team_performance_summary(self):
        self.client.force_authenticate(user=self.manager_user)
        url = reverse('team-performance-report')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data['team_size'], 2)
        self.assertIn('interns', data)
        self.assertEqual(len(data['interns']), 2)

    def test_intern_cannot_access_team_performance_report(self):
        self.client.force_authenticate(user=self.intern1_user)
        url = reverse('team-performance-report')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hr_can_view_organization_performance_summary(self):
        self.client.force_authenticate(user=self.hr_user)
        url = reverse('organization-performance-report')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data['headcount']['interns'], 2)
        self.assertEqual(data['headcount']['managers'], 1)
        self.assertEqual(data['headcount']['hr'], 1)
        self.assertIn('departments', data)
        self.assertIn('cycle_analytics', data)
        self.assertEqual(data['cycle_analytics']['score_distribution']['outstanding'], 1)

    def test_export_performance_csv(self):
        self.client.force_authenticate(user=self.manager_user)
        url = reverse('export-performance-csv')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment; filename="intern_performance_report.csv"', response['Content-Disposition'])
        content = response.content.decode('utf-8')
        self.assertIn('INT001', content)
        self.assertIn('Alice Intern', content)
