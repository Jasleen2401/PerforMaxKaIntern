import uuid
from django.db import models
from django.conf import settings

class NotificationType(models.TextChoices):
    GOAL_ASSIGNED = 'GOAL_ASSIGNED', 'Goal Assigned'
    EVIDENCE_REVIEWED = 'EVIDENCE_REVIEWED', 'Evidence Reviewed'
    APPRAISAL_PUBLISHED = 'APPRAISAL_PUBLISHED', 'Appraisal Published'
    TASK_ASSIGNED = 'TASK_ASSIGNED', 'Task Assigned'
    TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED', 'Task Status Changed'
    DEADLINE_APPROACHING = 'DEADLINE_APPROACHING', 'Deadline Approaching'
    MENTOR_FEEDBACK = 'MENTOR_FEEDBACK', 'Mentor Feedback Published'
    SELF_APPRAISAL_OPENED = 'SELF_APPRAISAL_OPENED', 'Self-Appraisal Opened'
    FORM_PUBLISHED = 'FORM_PUBLISHED', 'Form Published'
    EVALUATION_CYCLE_UPDATE = 'EVALUATION_CYCLE_UPDATE', 'Evaluation Cycle Update'
    SYSTEM = 'SYSTEM', 'System Alert'

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM
    )
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_notification_type_display()}] {self.title} -> {self.recipient.username}"
