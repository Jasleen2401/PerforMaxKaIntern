from rest_framework import serializers
from apps.attendance.models import AttendanceRecord

class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = (
            'id', 'employee', 'employee_name', 'employee_code',
            'attendance_date', 'status', 'check_in', 'check_out',
            'remarks', 'created_at'
        )
        read_only_fields = ('id', 'created_at')
