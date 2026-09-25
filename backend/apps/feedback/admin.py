from django.contrib import admin
from apps.feedback.models import Feedback

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('sender', 'recipient', 'feedback_type', 'visibility', 'created_at')
    list_filter = ('feedback_type', 'visibility')
    search_fields = ('sender__username', 'recipient__username', 'message')
