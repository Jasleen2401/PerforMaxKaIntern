import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class GoalStatus(models.TextChoices):
    NOT_STARTED = 'NOT_STARTED', 'Not Started'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'

class GoalPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'

class KPIMeasurementType(models.TextChoices):
    NUMERIC = 'NUMERIC', 'Numeric'
    PERCENTAGE = 'PERCENTAGE', 'Percentage'
    CURRENCY = 'CURRENCY', 'Currency'
    BOOLEAN = 'BOOLEAN', 'Boolean'

class Goal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='goals',
        db_index=True
    )
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.CASCADE,
        related_name='goals',
        db_index=True
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_goals'
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=GoalStatus.choices,
        default=GoalStatus.NOT_STARTED,
        db_index=True
    )
    priority = models.CharField(
        max_length=10,
        choices=GoalPriority.choices,
        default=GoalPriority.MEDIUM
    )
    completion_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Goal'
        verbose_name_plural = 'Goals'
        ordering = ['due_date', '-priority']
        constraints = [
            models.CheckConstraint(
                check=models.Q(completion_percentage__gte=Decimal('0.00')) & models.Q(completion_percentage__lte=Decimal('100.00')),
                name='goal_valid_completion_percentage'
            )
        ]

    def __str__(self):
        return f"{self.title} ({self.employee.full_name} - {self.get_status_display()})"

class KPI(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(
        Goal,
        on_delete=models.CASCADE,
        related_name='kpis',
        db_index=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    target_value = models.DecimalField(max_digits=12, decimal_places=2)
    achieved_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    unit = models.CharField(max_length=50, default='%')
    measurement_type = models.CharField(
        max_length=20,
        choices=KPIMeasurementType.choices,
        default=KPIMeasurementType.NUMERIC
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'KPI'
        verbose_name_plural = 'KPIs'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} [{self.achieved_value}/{self.target_value} {self.unit}]"

    @property
    def achievement_percentage(self):
        if self.target_value and self.target_value > 0:
            pct = (self.achieved_value / self.target_value) * Decimal('100.00')
            return min(Decimal('100.00'), max(Decimal('0.00'), round(pct, 2)))
        return Decimal('0.00')

class GoalProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(
        Goal,
        on_delete=models.CASCADE,
        related_name='progress_updates',
        db_index=True
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    progress_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Goal Progress Update'
        verbose_name_plural = 'Goal Progress Updates'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.goal.title}: {self.progress_percentage}% ({self.created_at.strftime('%Y-%m-%d')})"
