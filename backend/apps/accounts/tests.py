from django.test import TestCase
from django.db.utils import IntegrityError
from apps.accounts.models import User, UserRole

class UserModelTests(TestCase):
    def test_create_intern_user(self):
        user = User.objects.create_user(
            email='intern@pms.local',
            username='intern_john',
            password='SecurePassword123!',
            role=UserRole.INTERN
        )
        self.assertIsNotNone(user.id)
        self.assertEqual(user.email, 'intern@pms.local')
        self.assertEqual(user.role, UserRole.INTERN)
        self.assertTrue(user.is_intern)
        self.assertFalse(user.is_manager)
        self.assertFalse(user.is_hr)
        self.assertFalse(user.is_super_admin)
        self.assertTrue(user.check_password('SecurePassword123!'))

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email='admin@pms.local',
            username='super_admin',
            password='AdminPassword123!'
        )
        self.assertEqual(admin.role, UserRole.SUPER_ADMIN)
        self.assertTrue(admin.is_super_admin)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_duplicate_email_rejected(self):
        User.objects.create_user(
            email='duplicate@pms.local',
            username='user1',
            password='Password123!'
        )
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                email='duplicate@pms.local',
                username='user2',
                password='Password123!'
            )

    def test_roles_enumeration(self):
        manager = User.objects.create_user(
            email='manager@pms.local',
            username='manager_jane',
            password='Password123!',
            role=UserRole.MANAGER
        )
        hr = User.objects.create_user(
            email='hr@pms.local',
            username='hr_sarah',
            password='Password123!',
            role=UserRole.HR
        )
        self.assertTrue(manager.is_manager)
        self.assertTrue(hr.is_hr)
