from rest_framework import serializers
from apps.training.models import TrainingCourse, EmployeeTraining

class TrainingCourseSerializer(serializers.ModelSerializer):
    enrolled_count = serializers.IntegerField(source='enrollments.count', read_only=True)

    class Meta:
        model = TrainingCourse
        fields = ('id', 'title', 'description', 'provider', 'duration_hours', 'is_active', 'enrolled_count', 'created_at')
        read_only_fields = ('id', 'created_at')

class EmployeeTrainingSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_provider = serializers.CharField(source='course.provider', read_only=True)
    duration_hours = serializers.DecimalField(source='course.duration_hours', max_digits=5, decimal_places=1, read_only=True)

    class Meta:
        model = EmployeeTraining
        fields = (
            'id', 'employee', 'employee_name', 'employee_code',
            'course', 'course_title', 'course_provider', 'duration_hours',
            'enrollment_status', 'completion_percentage', 'completion_date',
            'created_at'
        )
        read_only_fields = ('id', 'created_at')
