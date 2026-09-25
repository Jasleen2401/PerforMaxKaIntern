from django.contrib import admin
from apps.performance.models import (
    PerformanceCycle,
    EvaluationCriterion,
    Appraisal,
    AppraisalRating,
)

class AppraisalRatingInline(admin.TabularInline):
    model = AppraisalRating
    extra = 1

@admin.register(PerformanceCycle)
class PerformanceCycleAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'status', 'created_by', 'created_at')
    list_filter = ('status',)
    search_fields = ('name',)

@admin.register(EvaluationCriterion)
class EvaluationCriterionAdmin(admin.ModelAdmin):
    list_display = ('name', 'weight', 'maximum_score', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)

@admin.register(Appraisal)
class AppraisalAdmin(admin.ModelAdmin):
    list_display = ('employee', 'cycle', 'appraisal_type', 'status', 'overall_score', 'submitted_at', 'published_at')
    list_filter = ('cycle', 'appraisal_type', 'status')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_code')
    inlines = [AppraisalRatingInline]

@admin.register(AppraisalRating)
class AppraisalRatingAdmin(admin.ModelAdmin):
    list_display = ('appraisal', 'criterion', 'score')
    list_filter = ('criterion',)
