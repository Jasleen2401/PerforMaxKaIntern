from decimal import Decimal
from django.db.models import Avg, Count, Q
from apps.employees.models import EmployeeProfile
from apps.goals.models import Goal, GoalStatus, KPI
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.attendance.models import AttendanceRecord, AttendanceStatus
from apps.performance.models import (
    Appraisal, AppraisalStatus, AppraisalType,
    PerformanceCycle, CycleStatus,
    PerformanceImprovementPlan, PipStatus,
    RecognitionReward
)
from apps.training.models import EmployeeTraining, TrainingStatus
from apps.organization.models import Department, TeamMembership


class AnalyticsService:

    @staticmethod
    def get_intern_performance_summary(employee: EmployeeProfile) -> dict:
        """
        Comprehensive personal performance analytics for an individual intern.
        """
        # Goals analytics
        goals_qs = Goal.objects.filter(employee=employee)
        total_goals = goals_qs.count()
        completed_goals = goals_qs.filter(status=GoalStatus.COMPLETED).count()
        in_progress_goals = goals_qs.filter(status=GoalStatus.IN_PROGRESS).count()
        avg_goal_completion = goals_qs.aggregate(avg=Avg('completion_percentage'))['avg'] or Decimal('0.00')

        # KPI analytics
        kpis_qs = KPI.objects.filter(goal__employee=employee)
        total_kpis = kpis_qs.count()
        achieved_kpis = [k for k in kpis_qs if k.target_value > 0]
        avg_kpi_achievement = Decimal('0.00')
        if achieved_kpis:
            avg_kpi_achievement = sum(k.achievement_percentage for k in achieved_kpis) / Decimal(len(achieved_kpis))

        # Evidence submission analytics
        evidence_qs = EvidenceSubmission.objects.filter(employee=employee)
        total_evidence = evidence_qs.count()
        approved_evidence = evidence_qs.filter(review_status=EvidenceReviewStatus.APPROVED).count()
        pending_evidence = evidence_qs.filter(review_status=EvidenceReviewStatus.PENDING).count()
        revision_evidence = evidence_qs.filter(review_status=EvidenceReviewStatus.REVISION_REQUESTED).count()

        # Attendance analytics
        attendance_qs = AttendanceRecord.objects.filter(employee=employee)
        total_attendance_days = attendance_qs.count()
        present_days = attendance_qs.filter(status=AttendanceStatus.PRESENT).count()
        absent_days = attendance_qs.filter(status=AttendanceStatus.ABSENT).count()
        half_days = attendance_qs.filter(status=AttendanceStatus.HALF_DAY).count()
        leave_days = attendance_qs.filter(status=AttendanceStatus.ON_LEAVE).count()

        attendance_rate = Decimal('0.00')
        if total_attendance_days > 0:
            effective_present = Decimal(present_days) + (Decimal(half_days) * Decimal('0.5'))
            attendance_rate = round((effective_present / Decimal(total_attendance_days)) * Decimal('100.00'), 2)

        # Appraisal & Scoring analytics (interns only see PUBLISHED manager appraisals)
        published_appraisals = Appraisal.objects.filter(
            employee=employee,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.PUBLISHED
        ).select_related('cycle').order_by('-published_at')

        latest_appraisal = published_appraisals.first()
        latest_score = float(latest_appraisal.overall_score) if (latest_appraisal and latest_appraisal.overall_score is not None) else None

        appraisal_history = [
            {
                'id': str(a.id),
                'cycle_name': a.cycle.name,
                'overall_score': float(a.overall_score) if a.overall_score is not None else None,
                'published_at': a.published_at.isoformat() if a.published_at else None,
            }
            for a in published_appraisals
        ]

        # Training analytics
        trainings_qs = EmployeeTraining.objects.filter(employee=employee).select_related('course')
        total_trainings = trainings_qs.count()
        completed_trainings = trainings_qs.filter(enrollment_status=TrainingStatus.COMPLETED).count()
        avg_training_completion = trainings_qs.aggregate(avg=Avg('completion_percentage'))['avg'] or Decimal('0.00')

        # Recognitions / Rewards
        rewards_qs = RecognitionReward.objects.filter(recipient=employee.user).order_by('-awarded_at')
        recognitions = [
            {
                'id': str(r.id),
                'title': r.title,
                'description': r.description,
                'awarded_at': r.awarded_at.isoformat(),
            }
            for r in rewards_qs
        ]

        # Active PIP
        active_pip = PerformanceImprovementPlan.objects.filter(
            employee=employee,
            status__in=[PipStatus.ACTIVE, PipStatus.IN_PROGRESS]
        ).first()
        pip_info = None
        if active_pip:
            pip_info = {
                'id': str(active_pip.id),
                'reason': active_pip.reason,
                'objectives': active_pip.objectives,
                'start_date': active_pip.start_date.isoformat(),
                'end_date': active_pip.end_date.isoformat(),
                'status': active_pip.status,
            }

        manager_name = None
        if employee.manager:
            manager_profile = getattr(employee.manager, 'profile', None)
            manager_name = manager_profile.full_name if manager_profile else employee.manager.username

        return {
            'employee': {
                'id': str(employee.id),
                'full_name': employee.full_name,
                'employee_code': employee.employee_code,
                'department_name': employee.department.name if employee.department else None,
                'designation': employee.designation,
                'manager_name': manager_name,
                'joining_date': employee.joining_date.isoformat(),
            },
            'goals': {
                'total': total_goals,
                'completed': completed_goals,
                'in_progress': in_progress_goals,
                'average_completion_percentage': float(avg_goal_completion),
            },
            'kpis': {
                'total': total_kpis,
                'average_achievement_percentage': float(round(avg_kpi_achievement, 2)),
            },
            'evidence': {
                'total': total_evidence,
                'approved': approved_evidence,
                'pending': pending_evidence,
                'revision_requested': revision_evidence,
            },
            'attendance': {
                'total_days': total_attendance_days,
                'present_days': present_days,
                'absent_days': absent_days,
                'half_days': half_days,
                'leave_days': leave_days,
                'attendance_rate_percentage': float(attendance_rate),
            },
            'appraisal': {
                'latest_score': latest_score,
                'total_published': published_appraisals.count(),
                'history': appraisal_history,
            },
            'training': {
                'total_enrolled': total_trainings,
                'completed': completed_trainings,
                'average_completion_percentage': float(avg_training_completion),
            },
            'recognitions': recognitions,
            'active_pip': pip_info,
        }

    @staticmethod
    def get_team_performance_summary(manager_user=None, department_id=None) -> dict:
        """
        Aggregated team performance analytics for a manager or HR reviewing a team/department.
        """
        interns_qs = EmployeeProfile.objects.filter(user__role='INTERN')

        if manager_user:
            # Interns directly reporting to manager or in teams managed by manager
            team_members_ids = TeamMembership.objects.filter(
                team__manager=manager_user
            ).values_list('employee_id', flat=True)

            interns_qs = interns_qs.filter(
                Q(manager=manager_user) | Q(id__in=team_members_ids)
            ).distinct()

        if department_id:
            interns_qs = interns_qs.filter(department_id=department_id)

        team_size = interns_qs.count()

        # Goal completion across team
        team_goals = Goal.objects.filter(employee__in=interns_qs)
        avg_goal_completion = team_goals.aggregate(avg=Avg('completion_percentage'))['avg'] or Decimal('0.00')

        # Pending evidence reviews for team
        pending_evidence_count = EvidenceSubmission.objects.filter(
            employee__in=interns_qs,
            review_status=EvidenceReviewStatus.PENDING
        ).count()

        # Pending appraisals (submitted, awaiting review or approved)
        pending_appraisals_count = Appraisal.objects.filter(
            employee__in=interns_qs,
            status__in=[AppraisalStatus.SUBMITTED, AppraisalStatus.UNDER_REVIEW]
        ).count()

        # Build intern cards
        intern_roster = []
        for intern in interns_qs.select_related('department'):
            summary = AnalyticsService.get_intern_performance_summary(intern)
            intern_roster.append({
                'id': str(intern.id),
                'full_name': intern.full_name,
                'employee_code': intern.employee_code,
                'department_name': intern.department.name if intern.department else None,
                'goals_count': summary['goals']['total'],
                'goal_completion_percentage': summary['goals']['average_completion_percentage'],
                'attendance_rate_percentage': summary['attendance']['attendance_rate_percentage'],
                'latest_score': summary['appraisal']['latest_score'],
                'pending_evidence_count': summary['evidence']['pending'],
                'has_active_pip': summary['active_pip'] is not None,
            })

        # Calculate average attendance across team
        avg_attendance = Decimal('0.00')
        if intern_roster:
            rates = [Decimal(str(item['attendance_rate_percentage'])) for item in intern_roster]
            avg_attendance = round(sum(rates) / Decimal(len(rates)), 2)

        return {
            'team_size': team_size,
            'average_goal_completion': float(avg_goal_completion),
            'average_attendance_rate': float(avg_attendance),
            'pending_evidence_reviews': pending_evidence_count,
            'pending_appraisals': pending_appraisals_count,
            'interns': intern_roster,
        }

    @staticmethod
    def get_organization_performance_summary(cycle_id=None, department_id=None) -> dict:
        """
        High-level executive and HR performance dashboard across the organization.
        """
        # Headcount stats
        total_profiles = EmployeeProfile.objects.all()
        intern_count = total_profiles.filter(user__role='INTERN').count()
        manager_count = total_profiles.filter(user__role='MANAGER').count()
        hr_count = total_profiles.filter(user__role='HR').count()

        # Department performance breakdown
        departments = Department.objects.all()
        dept_breakdown = []
        for dept in departments:
            dept_interns = EmployeeProfile.objects.filter(user__role='INTERN', department=dept)
            dept_count = dept_interns.count()
            dept_goals = Goal.objects.filter(employee__in=dept_interns)
            dept_goal_avg = dept_goals.aggregate(avg=Avg('completion_percentage'))['avg'] or Decimal('0.00')

            dept_breakdown.append({
                'department_id': str(dept.id),
                'department_name': dept.name,
                'intern_count': dept_count,
                'average_goal_completion': float(dept_goal_avg),
            })

        # Performance cycle analytics
        cycle = None
        if cycle_id:
            cycle = PerformanceCycle.objects.filter(id=cycle_id).first()
        else:
            cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).first()
            if not cycle:
                cycle = PerformanceCycle.objects.order_by('-start_date').first()

        cycle_data = None
        score_distribution = {
            'outstanding': 0,      # >= 90
            'exceeds': 0,          # 80 - 89.9
            'meets': 0,            # 70 - 79.9
            'needs_improvement': 0,# 60 - 69.9
            'unsatisfactory': 0,   # < 60
        }
        status_counts = {}
        top_performers = []
        at_risk_interns = []

        if cycle:
            appraisals_qs = Appraisal.objects.filter(cycle=cycle, appraisal_type=AppraisalType.MANAGER)
            if department_id:
                appraisals_qs = appraisals_qs.filter(employee__department_id=department_id)

            # Appraisal statuses
            for choice in AppraisalStatus.choices:
                status_counts[choice[0]] = appraisals_qs.filter(status=choice[0]).count()

            # Published scores
            published = appraisals_qs.filter(status=AppraisalStatus.PUBLISHED, overall_score__isnull=False).select_related('employee')
            for app in published:
                sc = float(app.overall_score)
                if sc >= 90.0:
                    score_distribution['outstanding'] += 1
                elif sc >= 80.0:
                    score_distribution['exceeds'] += 1
                elif sc >= 70.0:
                    score_distribution['meets'] += 1
                elif sc >= 60.0:
                    score_distribution['needs_improvement'] += 1
                else:
                    score_distribution['unsatisfactory'] += 1

                if sc < 60.0:
                    at_risk_interns.append({
                        'intern_id': str(app.employee.id),
                        'full_name': app.employee.full_name,
                        'employee_code': app.employee.employee_code,
                        'score': sc,
                        'reason': 'Low performance score (<60%)',
                    })

            # Top 5 performers
            sorted_published = sorted(published, key=lambda a: a.overall_score, reverse=True)[:5]
            top_performers = [
                {
                    'intern_id': str(a.employee.id),
                    'full_name': a.employee.full_name,
                    'employee_code': a.employee.employee_code,
                    'score': float(a.overall_score),
                }
                for a in sorted_published
            ]

            cycle_data = {
                'id': str(cycle.id),
                'name': cycle.name,
                'status': cycle.status,
                'start_date': cycle.start_date.isoformat(),
                'end_date': cycle.end_date.isoformat(),
                'status_breakdown': status_counts,
                'score_distribution': score_distribution,
            }

        # Active PIPs across organization
        active_pips = PerformanceImprovementPlan.objects.filter(
            status__in=[PipStatus.ACTIVE, PipStatus.IN_PROGRESS]
        ).select_related('employee')

        for pip in active_pips:
            if not any(item['intern_id'] == str(pip.employee.id) for item in at_risk_interns):
                at_risk_interns.append({
                    'intern_id': str(pip.employee.id),
                    'full_name': pip.employee.full_name,
                    'employee_code': pip.employee.employee_code,
                    'score': None,
                    'reason': f"Active PIP: {pip.reason[:50]}",
                })

        return {
            'headcount': {
                'total_employees': total_profiles.count(),
                'interns': intern_count,
                'managers': manager_count,
                'hr': hr_count,
            },
            'departments': dept_breakdown,
            'cycle_analytics': cycle_data,
            'top_performers': top_performers,
            'at_risk_interns': at_risk_interns,
        }
