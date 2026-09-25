import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class TrainingStatus(models.TextChoices):
    ENROLLED = 'ENROLLED', 'Enrolled'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed'
    DROPPED = 'DROPPED', 'Dropped'

class TrainingCourse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    provider = models.CharField(max_length=150)
    duration_hours = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal('10.0'))
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Training Course'
        verbose_name_plural = 'Training Courses'
        ordering = ['title']

    def __str__(self):
        return f"{self.title} ({self.provider}, {self.duration_hours}h)"

class EmployeeTraining(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='trainings',
        db_index=True
    )
    course = models.ForeignKey(
        TrainingCourse,
        on_delete=models.CASCADE,
        related_name='enrollments',
        db_index=True
    )
    enrollment_status = models.CharField(
        max_length=20,
        choices=TrainingStatus.choices,
        default=TrainingStatus.ENROLLED,
        db_index=True
    )
    completion_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    completion_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Employee Training'
        verbose_name_plural = 'Employee Trainings'
        unique_together = ('employee', 'course')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.full_name} - {self.course.title} ({self.get_enrollment_status_display()})"
