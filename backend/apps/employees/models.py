import uuid
from django.db import models
from django.conf import settings
from django.utils.timezone import localdate

class EmploymentStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    PROBATION = 'PROBATION', 'Probation'
    COMPLETED = 'COMPLETED', 'Completed'
    TERMINATED = 'TERMINATED', 'Terminated'

class EmployeeProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    employee_code = models.CharField(max_length=50, unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    department = models.ForeignKey(
        'organization.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees'
    )
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reporting_employees'
    )
    designation = models.CharField(max_length=100, default='Intern')
    joining_date = models.DateField(default=localdate)
    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE
    )
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact = models.TextField(blank=True, null=True)
    skills = models.JSONField(default=list, blank=True)
    experience = models.JSONField(default=list, blank=True)
    competencies = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    class Meta:
        verbose_name = 'Employee Profile'
        verbose_name_plural = 'Employee Profiles'
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.full_name} ({self.employee_code}) - {self.designation}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def email(self):
        return self.user.email
