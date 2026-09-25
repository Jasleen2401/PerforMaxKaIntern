from rest_framework import serializers
from apps.organization.models import Department, Team, TeamMembership

class DepartmentSerializer(serializers.ModelSerializer):
    teams_count = serializers.IntegerField(source='teams.count', read_only=True)
    employees_count = serializers.IntegerField(source='employees.count', read_only=True)

    class Meta:
        model = Department
        fields = ('id', 'name', 'description', 'is_active', 'teams_count', 'employees_count', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

class TeamSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    manager_name = serializers.CharField(source='manager.username', read_only=True)
    members_count = serializers.IntegerField(source='memberships.count', read_only=True)

    class Meta:
        model = Team
        fields = (
            'id', 'department', 'department_name', 'manager', 'manager_name',
            'name', 'description', 'members_count', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

class TeamMembershipSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = TeamMembership
        fields = ('id', 'team', 'team_name', 'employee', 'employee_name', 'is_lead', 'joined_at')
        read_only_fields = ('id', 'joined_at')
