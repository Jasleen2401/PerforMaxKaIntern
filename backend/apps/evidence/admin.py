from django.contrib import admin
from apps.evidence.models import EvidenceSubmission

@admin.register(EvidenceSubmission)
class EvidenceSubmissionAdmin(admin.ModelAdmin):
    list_display = ('title', 'employee', 'goal', 'review_status', 'reviewed_by', 'reviewed_at', 'created_at')
    list_filter = ('review_status',)
    search_fields = ('title', 'description', 'employee__first_name', 'employee__last_name', 'goal__title')
