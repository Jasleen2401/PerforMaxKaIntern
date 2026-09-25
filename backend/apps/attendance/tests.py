from datetime import date
from django.test import TestCase
from django.db.utils import IntegrityError
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.organization.models import Department
from apps.employees.models import EmployeeProfile
from apps.attendance.models import AttendanceRecord, AttendanceStatus
from apps.training.models import TrainingCourse, EmployeeTraining, TrainingStatus
from apps.feedback.models import Feedback, FeedbackType, FeedbackVisibility
from apps.performance.models import RecognitionReward
from apps.audit.services import AuditService
from apps.audit.models import AuditLog

class SupportingModulesTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Manager
        self.manager = User.objects.create_user(
            email='manager@test.com',
            username='mgr_support',
            password='Password123!',
            role=UserRole.MANAGER
        )

        # Department
        self.dept = Department.objects.create(name='QA Engineering')

        # Intern 1
        self.intern1_user = User.objects.create_user(
            email='intern1@test.com',
            username='intern_one',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern1_profile = EmployeeProfile.objects.create(
            user=self.intern1_user,
            employee_code='INT-301',
            first_name='Jack',
            last_name='Sparrow',
            department=self.dept,
            manager=self.manager
        )

        # Intern 2
        self.intern2_user = User.objects.create_user(
            email='intern2@test.com',
            username='intern_two',
            password='Password123!',
            role=UserRole.INTERN
        )

    def test_attendance_unique_constraint(self):
        today = date.today()
        AttendanceRecord.objects.create(
            employee=self.intern1_profile,
            attendance_date=today,
            status=AttendanceStatus.PRESENT
        )
        with self.assertRaises(IntegrityError):
            AttendanceRecord.objects.create(
                employee=self.intern1_profile,
                attendance_date=today,
                status=AttendanceStatus.ABSENT
            )

    def test_training_course_and_enrollment(self):
        course = TrainingCourse.objects.create(
            title='Django REST Framework Mastery',
            description='In-depth API design',
            provider='Internal Academy',
            duration_hours=12.5
        )
        enrollment = EmployeeTraining.objects.create(
            employee=self.intern1_profile,
            course=course,
            enrollment_status=TrainingStatus.ENROLLED
        )
        self.assertEqual(enrollment.completion_percentage, 0.00)
        self.assertEqual(course.enrollments.count(), 1)

    def test_feedback_privacy_isolation(self):
        # Manager sends private feedback to Intern 1
        Feedback.objects.create(
            sender=self.manager,
            recipient=self.intern1_user,
            feedback_type=FeedbackType.COACHING,
            message='Improve code documentation on PRs',
            visibility=FeedbackVisibility.PRIVATE
        )

        # Intern 1 can see it
        self.client.force_authenticate(user=self.intern1_user)
        resp1 = self.client.get('/api/feedback/')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        results1 = resp1.data.get('results', resp1.data)
        self.assertEqual(len(results1), 1)

        # Unrelated Intern 2 CANNOT see it
        self.client.force_authenticate(user=self.intern2_user)
        resp2 = self.client.get('/api/feedback/')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        results2 = resp2.data.get('results', resp2.data)
        self.assertEqual(len(results2), 0)

    def test_recognition_reward_creation(self):
        self.client.force_authenticate(user=self.manager)
        resp = self.client.post('/api/performance/rewards/', {
            'recipient': str(self.intern1_user.id),
            'title': 'Outstanding Sprint Contributor',
            'description': 'Completed all sprint backlog tasks ahead of schedule'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['title'], 'Outstanding Sprint Contributor')
        self.assertEqual(resp.data['awarded_by_name'], 'mgr_support')

    def test_audit_service_logging(self):
        AuditService.log(
            actor=self.manager,
            action='APPROVE_GOAL',
            entity_type='Goal',
            entity_id='G-12345',
            metadata={'approved_by': 'mgr_support'},
            ip_address='127.0.0.1'
        )
        log_entry = AuditLog.objects.filter(entity_id='G-12345').first()
        self.assertIsNotNone(log_entry)
        self.assertEqual(log_entry.action, 'APPROVE_GOAL')
        self.assertEqual(log_entry.actor, self.manager)
