"""
Production Seed Script for Intern Performance Management System (PMS)

Creates a realistic organization hierarchy, users across all 4 roles
(SUPER_ADMIN, HR, MANAGER, INTERN), active & closed performance cycles,
evaluation criteria, goals, KPIs, evidence submissions, appraisals,
attendance history, training courses, and recognitions.

Usage:
    python manage.py shell < seed_intern_pms.py
    or
    python seed_intern_pms.py
"""

import os
import sys
import uuid
from decimal import Decimal
from datetime import date, timedelta

import django

# Setup Django environment if run as standalone script
if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    django.setup()

from apps.accounts.models import User, UserRole
from apps.organization.models import Department, Team, TeamMembership
from apps.employees.models import EmployeeProfile, EmploymentStatus
from apps.performance.models import (
    PerformanceCycle, CycleStatus,
    EvaluationCriterion,
    Appraisal, AppraisalType, AppraisalStatus, AppraisalRating,
    PerformanceImprovementPlan, PipStatus,
    RecognitionReward
)
from apps.goals.models import Goal, GoalStatus, GoalPriority, KPI, KPIMeasurementType, GoalProgress
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.attendance.models import AttendanceRecord, AttendanceStatus
from apps.training.models import TrainingCourse, EmployeeTraining, TrainingStatus
from apps.audit.services import AuditService


def seed_database():
    print("🌱 Starting database seeding for Intern PMS...")

    # 1. Clean existing demo data safely or update existing
    print("  [1/10] Setting up Departments...")
    dept_eng, _ = Department.objects.get_or_create(
        name="Engineering",
        defaults={"description": "Core software and backend platform engineering"}
    )
    dept_prod, _ = Department.objects.get_or_create(
        name="Product & Design",
        defaults={"description": "UI/UX design and frontend product development"}
    )
    dept_qa, _ = Department.objects.get_or_create(
        name="QA & DevOps",
        defaults={"description": "Quality assurance, automation, and infrastructure"}
    )
    dept_hr, _ = Department.objects.get_or_create(
        name="Human Resources",
        defaults={"description": "People operations, talent acquisition, and intern relations"}
    )

    # 2. Super Admin User
    print("  [2/10] Creating Super Admin...")
    admin_user, _ = User.objects.get_or_create(
        username="admin",
        defaults={
            "email": "admin@company.com",
            "role": UserRole.SUPER_ADMIN,
            "is_staff": True,
            "is_superuser": True,
        }
    )
    admin_user.set_password("AdminPassword123!")
    admin_user.save()

    # 3. HR User & Profile
    print("  [3/10] Creating HR Manager...")
    hr_user, _ = User.objects.get_or_create(
        username="hr_sarah",
        defaults={
            "email": "sarah.hr@company.com",
            "role": UserRole.HR,
            "is_staff": True,
        }
    )
    hr_user.set_password("SarahPassword123!")
    hr_user.save()

    hr_profile, _ = EmployeeProfile.objects.get_or_create(
        user=hr_user,
        defaults={
            "employee_code": "EMP-HR-001",
            "first_name": "Sarah",
            "last_name": "Jenkins",
            "department": dept_hr,
            "designation": "Director of People & Culture",
            "joining_date": date(2024, 1, 15),
            "phone_number": "+1-555-0100",
        }
    )

    # 4. Managers & Teams
    print("  [4/10] Creating Engineering Managers & Teams...")
    marcus_user, _ = User.objects.get_or_create(
        username="manager_marcus",
        defaults={
            "email": "marcus.tech@company.com",
            "role": UserRole.MANAGER,
        }
    )
    marcus_user.set_password("MarcusPassword123!")
    marcus_user.save()

    marcus_profile, _ = EmployeeProfile.objects.get_or_create(
        user=marcus_user,
        defaults={
            "employee_code": "EMP-MGR-001",
            "first_name": "Marcus",
            "last_name": "Vance",
            "department": dept_eng,
            "designation": "Staff Engineering Manager",
            "joining_date": date(2023, 6, 1),
            "phone_number": "+1-555-0101",
        }
    )

    elena_user, _ = User.objects.get_or_create(
        username="manager_elena",
        defaults={
            "email": "elena.qa@company.com",
            "role": UserRole.MANAGER,
        }
    )
    elena_user.set_password("ElenaPassword123!")
    elena_user.save()

    elena_profile, _ = EmployeeProfile.objects.get_or_create(
        user=elena_user,
        defaults={
            "employee_code": "EMP-MGR-002",
            "first_name": "Elena",
            "last_name": "Rostova",
            "department": dept_qa,
            "designation": "QA Lead & Mentor",
            "joining_date": date(2023, 9, 15),
            "phone_number": "+1-555-0102",
        }
    )

    team_backend, _ = Team.objects.get_or_create(
        department=dept_eng,
        name="Platform & Core Services",
        defaults={"manager": marcus_user, "description": "Backend distributed services"}
    )

    team_qa, _ = Team.objects.get_or_create(
        department=dept_qa,
        name="Test Automation & Reliability",
        defaults={"manager": elena_user, "description": "E2E testing and performance suites"}
    )

    # 5. Interns
    print("  [5/10] Creating Intern Profiles...")
    alex_user, _ = User.objects.get_or_create(
        username="intern_alex",
        defaults={
            "email": "alex.dev@company.com",
            "role": UserRole.INTERN,
        }
    )
    alex_user.set_password("AlexPassword123!")
    alex_user.save()

    alex_profile, _ = EmployeeProfile.objects.get_or_create(
        user=alex_user,
        defaults={
            "employee_code": "INT-2025-001",
            "first_name": "Alex",
            "last_name": "Chen",
            "department": dept_eng,
            "manager": marcus_user,
            "designation": "Backend Software Intern",
            "joining_date": date(2025, 6, 1),
            "phone_number": "+1-555-0201",
        }
    )
    TeamMembership.objects.get_or_create(team=team_backend, employee=alex_profile)

    maya_user, _ = User.objects.get_or_create(
        username="intern_maya",
        defaults={
            "email": "maya.ux@company.com",
            "role": UserRole.INTERN,
        }
    )
    maya_user.set_password("MayaPassword123!")
    maya_user.save()

    maya_profile, _ = EmployeeProfile.objects.get_or_create(
        user=maya_user,
        defaults={
            "employee_code": "INT-2025-002",
            "first_name": "Maya",
            "last_name": "Lin",
            "department": dept_prod,
            "manager": marcus_user,
            "designation": "Frontend & UI/UX Intern",
            "joining_date": date(2025, 6, 1),
            "phone_number": "+1-555-0202",
        }
    )
    TeamMembership.objects.get_or_create(team=team_backend, employee=maya_profile)

    liam_user, _ = User.objects.get_or_create(
        username="intern_liam",
        defaults={
            "email": "liam.qa@company.com",
            "role": UserRole.INTERN,
        }
    )
    liam_user.set_password("LiamPassword123!")
    liam_user.save()

    liam_profile, _ = EmployeeProfile.objects.get_or_create(
        user=liam_user,
        defaults={
            "employee_code": "INT-2025-003",
            "first_name": "Liam",
            "last_name": "Patel",
            "department": dept_qa,
            "manager": elena_user,
            "designation": "QA Automation Intern",
            "joining_date": date(2025, 6, 15),
            "phone_number": "+1-555-0203",
        }
    )
    TeamMembership.objects.get_or_create(team=team_qa, employee=liam_profile)

    # 6. Evaluation Criteria & Performance Cycles
    print("  [6/10] Creating Evaluation Criteria & Cycles...")
    criteria_definitions = [
        ("Technical Competence", "Proficiency in software engineering, algorithms, and system design", Decimal("25.00")),
        ("Problem Solving & Ownership", "Autonomy in debugging issues, delivering complete solutions, and taking initiative", Decimal("25.00")),
        ("Code Quality & Testing", "Adherence to clean code, modular architecture, and comprehensive test coverage", Decimal("20.00")),
        ("Collaboration & Communication", "Active participation in standups, code reviews, and transparent documentation", Decimal("15.00")),
        ("Velocity & Timeliness", "Punctual delivery of milestones and commitments within agreed sprint timelines", Decimal("15.00")),
    ]

    for name, desc, weight in criteria_definitions:
        EvaluationCriterion.objects.get_or_create(
            name=name,
            defaults={"description": desc, "maximum_score": Decimal("100.00"), "weight": weight, "is_active": True}
        )

    # Performance Cycles
    active_cycle, _ = PerformanceCycle.objects.get_or_create(
        name="Summer 2025 Intern Appraisal Cycle",
        defaults={
            "description": "Mid-year formal performance evaluation and conversion review for 2025 summer cohort.",
            "start_date": date(2025, 6, 1),
            "end_date": date(2025, 8, 31),
            "status": CycleStatus.ACTIVE,
        }
    )

    closed_cycle, _ = PerformanceCycle.objects.get_or_create(
        name="Spring 2025 Onboarding Cycle",
        defaults={
            "description": "Spring foundational training and onboarding sprint.",
            "start_date": date(2025, 3, 1),
            "end_date": date(2025, 5, 31),
            "status": CycleStatus.CLOSED,
        }
    )

    # 7. Goals, KPIs & Evidence
    print("  [7/10] Assigning Goals, KPIs & Submitting Evidence...")
    # Alex Goals
    goal1, _ = Goal.objects.get_or_create(
        employee=alex_profile,
        cycle=active_cycle,
        title="Design and Implement RESTful Authentication System",
        defaults={
            "assigned_by": marcus_user,
            "description": "Architect SimpleJWT custom claims, user profiles, and granular role permissions.",
            "due_date": date(2025, 7, 15),
            "status": GoalStatus.COMPLETED,
            "priority": GoalPriority.HIGH,
            "completion_percentage": Decimal("100.00"),
        }
    )

    KPI.objects.get_or_create(
        goal=goal1,
        name="Test Coverage for Auth App",
        defaults={
            "description": "Automated unit and integration test coverage",
            "target_value": Decimal("90.00"),
            "achieved_value": Decimal("96.50"),
            "unit": "%",
            "measurement_type": KPIMeasurementType.PERCENTAGE,
        }
    )

    KPI.objects.get_or_create(
        goal=goal1,
        name="API Response Latency",
        defaults={
            "description": "P95 response time under 100 concurrent simulated requests",
            "target_value": Decimal("120.00"),
            "achieved_value": Decimal("85.00"),
            "unit": "ms",
            "measurement_type": KPIMeasurementType.NUMERIC,
        }
    )

    EvidenceSubmission.objects.get_or_create(
        employee=alex_profile,
        goal=goal1,
        title="CI/CD Coverage Report & Postman Collection",
        defaults={
            "description": "Attached green GitHub Actions workflow run logs and Postman collection with 25 passing tests.",
            "external_url": "https://github.com/company/intern-pms/actions/runs/10294",
            "review_status": EvidenceReviewStatus.APPROVED,
            "reviewed_by": marcus_user,
            "review_notes": "Outstanding test rigor and clean token serialization. Verified in staging.",
        }
    )

    goal2, _ = Goal.objects.get_or_create(
        employee=alex_profile,
        cycle=active_cycle,
        title="Develop Executive Reports & Analytics Engine",
        defaults={
            "assigned_by": marcus_user,
            "description": "Build high-performance SQL aggregation queries for intern performance summaries and team analytics.",
            "due_date": date(2025, 8, 20),
            "status": GoalStatus.IN_PROGRESS,
            "priority": GoalPriority.HIGH,
            "completion_percentage": Decimal("85.00"),
        }
    )

    # Maya Goals
    goal_maya, _ = Goal.objects.get_or_create(
        employee=maya_profile,
        cycle=active_cycle,
        title="Responsive Dashboard & Theme Integration",
        defaults={
            "assigned_by": marcus_user,
            "description": "Implement modern Tailwind CSS dashboard cards, appraisal workflows, and mobile responsiveness.",
            "due_date": date(2025, 8, 10),
            "status": GoalStatus.IN_PROGRESS,
            "priority": GoalPriority.MEDIUM,
            "completion_percentage": Decimal("90.00"),
        }
    )

    EvidenceSubmission.objects.get_or_create(
        employee=maya_profile,
        goal=goal_maya,
        title="Figma Component Specs & Storybook Deployment",
        defaults={
            "description": "Storybook preview link containing all responsive dashboard components and color tokens.",
            "external_url": "https://storybook.company.internal/preview/maya",
            "review_status": EvidenceReviewStatus.APPROVED,
            "reviewed_by": marcus_user,
            "review_notes": "Great visual fidelity and clean component organization.",
        }
    )

    # Liam Goals
    goal_liam, _ = Goal.objects.get_or_create(
        employee=liam_profile,
        cycle=active_cycle,
        title="Automate End-to-End Regression Test Suite",
        defaults={
            "assigned_by": elena_user,
            "description": "Implement automated Playwright test scripts for appraisal publishing and goal assignment.",
            "due_date": date(2025, 8, 25),
            "status": GoalStatus.IN_PROGRESS,
            "priority": GoalPriority.MEDIUM,
            "completion_percentage": Decimal("75.00"),
        }
    )

    EvidenceSubmission.objects.get_or_create(
        employee=liam_profile,
        goal=goal_liam,
        title="Playwright E2E Test Execution Summary",
        defaults={
            "description": "Executed test run covering 18 critical regression paths with zero flake.",
            "external_url": "https://playwright.company.internal/runs/9842",
            "review_status": EvidenceReviewStatus.PENDING,
        }
    )

    # 8. Appraisals & Published Ratings
    print("  [8/10] Generating Appraisals & Scoring Records...")
    # Alex's published appraisal in closed cycle
    alex_closed_appraisal, _ = Appraisal.objects.get_or_create(
        employee=alex_profile,
        cycle=closed_cycle,
        appraisal_type=AppraisalType.MANAGER,
        defaults={
            "reviewer": marcus_user,
            "status": AppraisalStatus.PUBLISHED,
            "overall_score": Decimal("92.80"),
            "reviewer_comments": "Alex demonstrated exceptional technical aptitude, picking up complex PostgreSQL queries and Django internals with great independence.",
            "self_comments": "I enjoyed building the backend modules and collaborating with the team.",
            "final_comments": "Recommended for full-time junior software engineer offer upon graduation.",
        }
    )

    criteria_qs = EvaluationCriterion.objects.all()
    sample_scores = [Decimal("95.00"), Decimal("92.00"), Decimal("94.00"), Decimal("90.00"), Decimal("90.00")]
    for crit, sc in zip(criteria_qs, sample_scores):
        AppraisalRating.objects.get_or_create(
            appraisal=alex_closed_appraisal,
            criterion=crit,
            defaults={"score": sc, "comments": f"Strong demonstration of {crit.name}"}
        )

    # Active appraisal for Alex (Self submitted)
    Appraisal.objects.get_or_create(
        employee=alex_profile,
        cycle=active_cycle,
        appraisal_type=AppraisalType.SELF,
        defaults={
            "status": AppraisalStatus.SUBMITTED,
            "self_comments": "Completed auth architecture and 85% of analytics endpoints ahead of schedule.",
        }
    )

    # 9. Attendance, Trainings & Recognitions
    print("  [9/10] Populating Attendance Logs & Training Courses...")
    # Generate 30 days of attendance records for Alex
    start_att = date.today() - timedelta(days=35)
    for i in range(30):
        att_date = start_att + timedelta(days=i)
        if att_date.weekday() < 5:  # Weekday Monday-Friday
            status = AttendanceStatus.PRESENT
            if i % 14 == 0:
                status = AttendanceStatus.HALF_DAY
            elif i % 25 == 0:
                status = AttendanceStatus.ON_LEAVE

            AttendanceRecord.objects.get_or_create(
                employee=alex_profile,
                attendance_date=att_date,
                defaults={"status": status}
            )
            AttendanceRecord.objects.get_or_create(
                employee=maya_profile,
                attendance_date=att_date,
                defaults={"status": AttendanceStatus.PRESENT}
            )

    # Training Courses
    c1, _ = TrainingCourse.objects.get_or_create(
        title="Advanced Django REST Framework & PostgreSQL Tuning",
        defaults={
            "provider": "Internal Engineering Academy",
            "duration_hours": Decimal("24.0"),
            "description": "Deep dive into query optimization, prefetch patterns, indexing, and scalable API architecture.",
        }
    )

    c2, _ = TrainingCourse.objects.get_or_create(
        title="Modern React 19 & TypeScript Architecture",
        defaults={
            "provider": "Frontend Guild",
            "duration_hours": Decimal("18.0"),
            "description": "State management with Redux Toolkit, RTK Query caching, and accessible Tailwind UI design.",
        }
    )

    EmployeeTraining.objects.get_or_create(
        employee=alex_profile,
        course=c1,
        defaults={
            "enrollment_status": TrainingStatus.COMPLETED,
            "completion_percentage": Decimal("100.00"),
            "completion_date": date(2025, 7, 1),
        }
    )

    EmployeeTraining.objects.get_or_create(
        employee=maya_profile,
        course=c2,
        defaults={
            "enrollment_status": TrainingStatus.IN_PROGRESS,
            "completion_percentage": Decimal("75.00"),
        }
    )

    # Recognitions
    RecognitionReward.objects.get_or_create(
        recipient=alex_user,
        title="Intern Innovator of the Month",
        defaults={
            "description": "Awarded for exceptional delivery of the secure authentication and permissions architecture.",
            "awarded_by": marcus_user,
        }
    )

    RecognitionReward.objects.get_or_create(
        recipient=maya_user,
        title="Design Excellence Star",
        defaults={
            "description": "Awarded for outstanding UI aesthetics and component library consistency.",
            "awarded_by": hr_user,
        }
    )

    # 10. Audit Log Initial Record
    print("  [10/10] Writing Audit Log initialization...")
    AuditService.log(
        actor=admin_user,
        action="SEED_DATABASE",
        entity_type="System",
        entity_id=str(admin_user.id),
        metadata={"status": "Success", "seeded_cohort": "Summer 2025 Cohort"}
    )

    print("\n✅ Seed complete! All demo data initialized successfully.")
    print("\n-----------------------------------------------------------")
    print("Default Demo Accounts:")
    print("  • Super Admin:  admin          / AdminPassword123!")
    print("  • HR Manager:   hr_sarah       / SarahPassword123!")
    print("  • Tech Manager: manager_marcus / MarcusPassword123!")
    print("  • QA Manager:   manager_elena  / ElenaPassword123!")
    print("  • Intern:       intern_alex    / AlexPassword123!")
    print("  • Intern:       intern_maya    / MayaPassword123!")
    print("  • Intern:       intern_liam    / LiamPassword123!")
    print("-----------------------------------------------------------\n")


if __name__ == '__main__':
    seed_database()
