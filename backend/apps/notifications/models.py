import uuid
from django.db import models
from django.conf import settings

class NotificationType(models.TextChoices):
    GOAL_ASSIGNED = 'GOAL_ASSIGNED', 'Goal Assigned'
    EVIDENCE_REVIEWED = 'EVIDENCE_REVIEWED', 'Evidence Reviewed'
    APPRAISAL_PUBLISHED = 'APPRAISAL_PUBLISHED', 'Appraisal Published'
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
