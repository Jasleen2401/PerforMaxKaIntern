from django.contrib import admin
from apps.goals.models import Goal, KPI, GoalProgress

class KPIInline(admin.TabularInline):
    model = KPI
    extra = 1

class GoalProgressInline(admin.TabularInline):
    model = GoalProgress
    extra = 0
    readonly_fields = ('updated_by', 'progress_percentage', 'comment', 'created_at')

@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('title', 'employee', 'cycle', 'status', 'priority', 'completion_percentage', 'due_date')
    list_filter = ('cycle', 'status', 'priority')
    search_fields = ('title', 'description', 'employee__first_name', 'employee__last_name')
    inlines = [KPIInline, GoalProgressInline]

@admin.register(KPI)
class KPIAdmin(admin.ModelAdmin):
    list_display = ('name', 'goal', 'target_value', 'achieved_value', 'unit', 'measurement_type')
    search_fields = ('name', 'goal__title')

@admin.register(GoalProgress)
class GoalProgressAdmin(admin.ModelAdmin):
    list_display = ('goal', 'updated_by', 'progress_percentage', 'created_at')
    search_fields = ('goal__title', 'comment')
