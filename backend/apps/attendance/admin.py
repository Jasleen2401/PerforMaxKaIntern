from django.contrib import admin
from apps.attendance.models import AttendanceRecord

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('employee', 'attendance_date', 'status', 'check_in', 'check_out', 'created_at')
    list_filter = ('status', 'attendance_date')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_code')
