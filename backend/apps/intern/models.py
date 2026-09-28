import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings


class TaskCategory(models.TextChoices):
    TECHNICAL = 'TECHNICAL', 'Technical Implementation'
    ONBOARDING = 'ONBOARDING', 'Onboarding & Setup'
    DOCUMENTATION = 'DOCUMENTATION', 'Documentation & Spec'
    EVALUATION = 'EVALUATION', 'Appraisal & Review'


class TaskPriority(models.TextChoices):
    HIGH = 'HIGH', 'High Priority'
    MEDIUM = 'MEDIUM', 'Medium Priority'
    LOW = 'LOW', 'Low Priority'


class InternTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intern = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='intern_tasks',
        db_index=True
    )
    title = models.CharField(max_length=255)
    category = models.CharField(
        max_length=50,
        choices=TaskCategory.choices,
        default=TaskCategory.TECHNICAL
    )
    instructions = models.TextField(
        help_text="Detailed task guidelines, acceptance criteria, and instructions from mentor."
    )
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM
    )
    due_date = models.DateField()
    is_completed = models.BooleanField(default=False, db_index=True)
    completed_at = models.DateField(null=True, blank=True)
    hours_spent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    completion_notes = models.TextField(blank=True, default="")
    artifact_url = models.CharField(max_length=500, blank=True, default="")
    is_permitted_to_complete = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Intern Task'
        verbose_name_plural = 'Intern Tasks'
        ordering = ['is_completed', 'due_date', '-priority']

    def __str__(self):
        status_label = "Completed" if self.is_completed else "Pending"
        return f"[{status_label}] {self.title} ({self.intern.user.username})"


class InternGoalComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(
        'goals.Goal',
        on_delete=models.CASCADE,
        related_name='goal_comments',
        db_index=True
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='intern_goal_comments'
    )
    author_name = models.CharField(max_length=255)
    author_role = models.CharField(max_length=50, default='INTERN')
    comment = models.TextField()
    is_mentor = models.BooleanField(default=False)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Intern Goal Comment'
        verbose_name_plural = 'Intern Goal Comments'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.author_name} on {self.goal.title}: {self.comment[:40]}"


class InternSelfAppraisalSubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intern = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='self_appraisal_submissions',
        db_index=True
    )
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.CASCADE,
        related_name='intern_self_appraisals'
    )
    self_rating = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('8.5'))
    achievements = models.TextField(
        blank=True,
        default="",
        help_text="Key technical achievements and completed deliverables."
    )
    challenges = models.TextField(
        blank=True,
        default="",
        help_text="Challenges faced and problem-solving methodology."
    )
    skills_acquired = models.TextField(
        blank=True,
        default="",
        help_text="Frameworks, tools, and technical competencies developed."
    )
    mentorship_needs = models.TextField(
        blank=True,
        default="",
        help_text="Areas where guidance or mentorship is requested."
    )
    reflection_summary = models.TextField(
        blank=True,
        default="",
        help_text="Overall self-evaluation reflection summary."
    )
    is_submitted = models.BooleanField(default=False, db_index=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Intern Self-Appraisal Submission'
        verbose_name_plural = 'Intern Self-Appraisal Submissions'
        unique_together = ('intern', 'cycle')

    def __str__(self):
        status_label = "Submitted" if self.is_submitted else "Draft"
        return f"{self.intern.user.username} Self-Appraisal ({status_label}) - {self.self_rating}/10"


class InternFeedbackReply(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intern = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='feedback_replies'
    )
    appraisal = models.ForeignKey(
        'performance.Appraisal',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='intern_replies'
    )
    reply_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Intern Feedback Reply'
        verbose_name_plural = 'Intern Feedback Replies'
        ordering = ['created_at']

    def __str__(self):
        return f"Reply by {self.intern.user.username} ({self.created_at.strftime('%Y-%m-%d')})"
