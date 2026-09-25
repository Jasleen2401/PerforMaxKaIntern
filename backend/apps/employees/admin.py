from django.contrib import admin
from apps.employees.models import EmployeeProfile

@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    list_display = ('employee_code', 'full_name', 'department', 'manager', 'designation', 'employment_status')
    search_fields = ('employee_code', 'first_name', 'last_name', 'user__email')
    list_filter = ('department', 'employment_status', 'designation')
