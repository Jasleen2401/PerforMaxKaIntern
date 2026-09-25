from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.organization.models import Department
from apps.employees.models import EmployeeProfile

class EmployeeAndOrganizationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create HR user
        self.hr_user = User.objects.create_user(
            email='hr@test.com',
            username='hr_user',
            password='Password123!',
            role=UserRole.HR
        )

        # Create Manager 1 user
        self.manager1 = User.objects.create_user(
            email='manager1@test.com',
            username='manager_one',
            password='Password123!',
            role=UserRole.MANAGER
        )

        # Create Manager 2 user
        self.manager2 = User.objects.create_user(
            email='manager2@test.com',
            username='manager_two',
            password='Password123!',
            role=UserRole.MANAGER
        )

        # Create Department
        self.dept = Department.objects.create(
            name='Engineering',
            description='Software Engineering Department'
        )

        # Create Intern 1 assigned to Manager 1
        self.intern1_user = User.objects.create_user(
            email='intern1@test.com',
            username='intern_one',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern1_profile = EmployeeProfile.objects.create(
            user=self.intern1_user,
            employee_code='INT-001',
            first_name='Alice',
            last_name='Intern',
            department=self.dept,
            manager=self.manager1
        )

        # Create Intern 2 assigned to Manager 2
        self.intern2_user = User.objects.create_user(
            email='intern2@test.com',
            username='intern_two',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern2_profile = EmployeeProfile.objects.create(
            user=self.intern2_user,
            employee_code='INT-002',
            first_name='Bob',
            last_name='Intern',
            department=self.dept,
            manager=self.manager2
        )

    def test_jwt_login_and_me_endpoint(self):
        login_resp = self.client.post('/api/auth/login/', {
            'email': 'intern1@test.com',
            'password': 'Password123!'
        })
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_resp.data)
        self.assertEqual(login_resp.data['user']['role'], UserRole.INTERN)
        self.assertEqual(login_resp.data['user']['profile']['employee_code'], 'INT-001')

        token = login_resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        me_resp = self.client.get('/api/auth/me/')
        self.assertEqual(me_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(me_resp.data['email'], 'intern1@test.com')
        self.assertEqual(me_resp.data['profile']['employee_code'], 'INT-001')

    def test_intern_least_privilege_scoping(self):
        # Intern1 should only see their own profile
        self.client.force_authenticate(user=self.intern1_user)
        resp = self.client.get('/api/employees/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get('results', resp.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['employee_code'], 'INT-001')

    def test_manager_scoping(self):
        # Manager 1 should see only Intern 1, not Intern 2
        self.client.force_authenticate(user=self.manager1)
        resp = self.client.get('/api/employees/interns/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get('results', resp.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['employee_code'], 'INT-001')

    def test_hr_can_create_employee_atomically(self):
        self.client.force_authenticate(user=self.hr_user)
        create_data = {
            'email': 'new_intern@test.com',
            'username': 'new_intern',
            'password': 'Password123!',
            'role': UserRole.INTERN,
            'employee_code': 'INT-003',
            'first_name': 'Charlie',
            'last_name': 'Brown',
            'department_id': str(self.dept.id),
            'manager_id': str(self.manager1.id),
            'designation': 'Frontend Intern'
        }
        resp = self.client.post('/api/employees/', create_data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['employee_code'], 'INT-003')
        self.assertTrue(User.objects.filter(email='new_intern@test.com').exists())

    def test_intern_cannot_create_employee(self):
        self.client.force_authenticate(user=self.intern1_user)
        create_data = {
            'email': 'hacked@test.com',
            'username': 'hacked',
            'password': 'Password123!',
            'role': UserRole.HR,
            'employee_code': 'INT-004',
            'first_name': 'Hacker',
            'last_name': 'User'
        }
        resp = self.client.post('/api/employees/', create_data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
