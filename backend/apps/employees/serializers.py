from rest_framework import serializers
from django.db import transaction
from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile, EmploymentStatus
from apps.organization.models import Department

class EmployeeProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    manager_name = serializers.CharField(source='manager.username', read_only=True)

    class Meta:
        model = EmployeeProfile
        fields = (
            'id', 'user_id', 'username', 'email', 'role',
            'employee_code', 'first_name', 'last_name', 'full_name',
            'department', 'department_name', 'manager', 'manager_name',
            'designation', 'joining_date', 'employment_status',
            'phone_number', 'emergency_contact',
            'skills', 'experience', 'competencies',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

class CreateEmployeeSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    username = serializers.CharField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    role = serializers.ChoiceField(choices=UserRole.choices, default=UserRole.INTERN)
    employee_code = serializers.CharField(max_length=50, required=True)
    first_name = serializers.CharField(max_length=100, required=True)
    last_name = serializers.CharField(max_length=100, required=True)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    manager_id = serializers.UUIDField(required=False, allow_null=True)
    designation = serializers.CharField(max_length=100, default='Intern')
    joining_date = serializers.DateField(required=False)
    employment_status = serializers.ChoiceField(choices=EmploymentStatus.choices, default=EmploymentStatus.ACTIVE)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    emergency_contact = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_employee_code(self, value):
        if EmployeeProfile.objects.filter(employee_code=value).exists():
            raise serializers.ValidationError("An employee with this code already exists.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data.pop('email')
        username = validated_data.pop('username')
        password = validated_data.pop('password')
        role = validated_data.pop('role')

        dept_id = validated_data.pop('department_id', None)
        manager_id = validated_data.pop('manager_id', None)

        department = None
        if dept_id:
            try:
                department = Department.objects.get(id=dept_id)
            except Department.DoesNotExist:
                raise serializers.ValidationError({"department_id": "Department not found."})

        manager = None
        if manager_id:
            try:
                manager = User.objects.get(id=manager_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({"manager_id": "Manager user not found."})

        user = User.objects.create_user(
            email=email,
            username=username,
            password=password,
            role=role
        )

        profile = EmployeeProfile.objects.create(
            user=user,
            department=department,
            manager=manager,
            **validated_data
        )
        return profile
