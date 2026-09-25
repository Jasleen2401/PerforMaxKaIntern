from django.contrib import admin
from apps.organization.models import Department, Team, TeamMembership

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at')
    search_fields = ('name',)
    list_filter = ('is_active',)

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'manager', 'created_at')
    search_fields = ('name', 'department__name')
    list_filter = ('department',)

@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ('team', 'employee', 'is_lead', 'joined_at')
    list_filter = ('team', 'is_lead')
