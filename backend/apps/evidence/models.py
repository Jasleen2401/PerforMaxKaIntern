import uuid
from django.db import models
from django.conf import settings

class EvidenceReviewStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Review'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    REVISION_REQUESTED = 'REVISION_REQUESTED', 'Revision Requested'

class EvidenceSubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='evidence_submissions',
        db_index=True
    )
    goal = models.ForeignKey(
        'goals.Goal',
        on_delete=models.CASCADE,
        related_name='evidence_submissions',
        db_index=True
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    file_attachment = models.FileField(upload_to='evidence/', null=True, blank=True)
    external_url = models.URLField(max_length=500, null=True, blank=True)
    review_status = models.CharField(
        max_length=20,
        choices=EvidenceReviewStatus.choices,
        default=EvidenceReviewStatus.PENDING,
        db_index=True
    )
    review_notes = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_evidence'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Evidence Submission'
        verbose_name_plural = 'Evidence Submissions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.employee.full_name} [{self.get_review_status_display()}]"
