from django.contrib import admin
from apps.training.models import TrainingCourse, EmployeeTraining

@admin.register(TrainingCourse)
class TrainingCourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'provider', 'duration_hours', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('title', 'provider')

@admin.register(EmployeeTraining)
class EmployeeTrainingAdmin(admin.ModelAdmin):
    list_display = ('employee', 'course', 'enrollment_status', 'completion_percentage', 'completion_date')
    list_filter = ('enrollment_status',)
    search_fields = ('employee__first_name', 'employee__last_name', 'course__title')
