from decimal import Decimal
from apps.goals.models import Goal, KPI
from apps.performance.models import Appraisal, AppraisalType, EvaluationCriterion

class ScoringService:
    """
    Production-grade reproducible Scoring Service for Intern PMS.
    
    Formula Specification:
    1. Goals & KPI Component (Weight: 40%):
       - Avg Goal Progress % = sum(goal.completion_percentage) / N
       - Avg KPI Achievement % = sum(kpi.achievement_percentage) / M
       - Composite Goals Score = (Avg Goal Progress * 0.5) + (Avg KPI * 0.5)
    
    2. Manager Evaluation Criteria Component (Weight: 40%):
       - For each criterion: Normalized = (Rating Score / Criterion Max Score) * 100
       - Weighted Score = sum(Normalized * (Weight / Total Weights))
    
    3. Self-Assessment Component (Weight: 20%):
       - Evaluated from Intern Self-Appraisal ratings normalized against criteria weights.
    
    Overall Score = (Composite Goals * 0.40) + (Manager Criteria * 0.40) + (Self Assessment * 0.20)
    """

    DEFAULT_GOALS_WEIGHT = Decimal('0.40')
    DEFAULT_MANAGER_WEIGHT = Decimal('0.40')
    DEFAULT_SELF_WEIGHT = Decimal('0.20')

    # Retain backward-compatible class attributes
    GOALS_WEIGHT = Decimal('0.40')
    MANAGER_WEIGHT = Decimal('0.40')
    SELF_WEIGHT = Decimal('0.20')

    @classmethod
    def get_grade(cls, score: Decimal) -> str:
        if score >= Decimal('90.00'):
            return 'EXCELLENT'
        if score >= Decimal('80.00'):
            return 'VERY_GOOD'
        if score >= Decimal('70.00'):
            return 'GOOD'
        if score >= Decimal('60.00'):
            return 'SATISFACTORY'
        return 'NEEDS_IMPROVEMENT'

    @classmethod
    def get_active_criteria(cls, cycle=None):
        """Returns HR-configured evaluation parameters/criteria for this cycle or global defaults."""
        if cycle:
            cycle_criteria = EvaluationCriterion.objects.filter(cycle=cycle, is_active=True).order_by('-weight', 'name')
            if cycle_criteria.exists():
                return list(cycle_criteria)
        return list(EvaluationCriterion.objects.filter(is_active=True).order_by('-weight', 'name'))

    @classmethod
    def calculate_cycle_score(cls, employee, cycle) -> dict:
        # Retrieve dynamic HR-configured component weights from cycle if available
        if cycle and getattr(cycle, 'goals_weight', None) is not None:
            goals_w = Decimal(str(cycle.goals_weight)) / Decimal('100.00')
            mgr_w = Decimal(str(cycle.manager_weight)) / Decimal('100.00')
            self_w = Decimal(str(cycle.self_weight)) / Decimal('100.00')
        else:
            goals_w = cls.DEFAULT_GOALS_WEIGHT
            mgr_w = cls.DEFAULT_MANAGER_WEIGHT
            self_w = cls.DEFAULT_SELF_WEIGHT

        # Normalize component weights if sum != 1.0 (safeguard)
        total_comp_w = goals_w + mgr_w + self_w
        if total_comp_w > Decimal('0.00') and total_comp_w != Decimal('1.00'):
            goals_w = goals_w / total_comp_w
            mgr_w = mgr_w / total_comp_w
            self_w = self_w / total_comp_w

        # 1. Goals and KPIs calculation
        goals = Goal.objects.filter(employee=employee, cycle=cycle)
        total_goals = goals.count()

        if total_goals > 0:
            avg_goal_progress = sum(g.completion_percentage for g in goals) / Decimal(total_goals)
            all_kpis = KPI.objects.filter(goal__in=goals)
            total_kpis = all_kpis.count()
            if total_kpis > 0:
                avg_kpi_pct = sum(k.achievement_percentage for k in all_kpis) / Decimal(total_kpis)
                goals_composite = (avg_goal_progress * Decimal('0.5')) + (avg_kpi_pct * Decimal('0.5'))
            else:
                avg_kpi_pct = avg_goal_progress
                goals_composite = avg_goal_progress
        else:
            avg_goal_progress = Decimal('0.00')
            avg_kpi_pct = Decimal('0.00')
            goals_composite = Decimal('0.00')

        # 2. Manager Criteria Evaluation calculation with HR-configured parameters
        active_criteria = cls.get_active_criteria(cycle)
        mgr_appraisal = Appraisal.objects.filter(
            employee=employee,
            cycle=cycle,
            appraisal_type=AppraisalType.MANAGER
        ).prefetch_related('ratings__criterion').first()

        manager_criteria_score = Decimal('0.00')
        manager_ratings_breakdown = []
        if mgr_appraisal and mgr_appraisal.ratings.exists():
            ratings = mgr_appraisal.ratings.all()
            total_weight = sum(r.criterion.weight for r in ratings if r.criterion.weight > 0)
            if total_weight > 0:
                weighted_sum = Decimal('0.00')
                for r in ratings:
                    max_s = r.criterion.maximum_score or Decimal('100.00')
                    norm = (r.score / max_s) * Decimal('100.00')
                    w = r.criterion.weight / total_weight
                    weighted_sum += norm * w
                    manager_ratings_breakdown.append({
                        'id': str(r.criterion.id),
                        'criterion': r.criterion.name,
                        'score': float(r.score),
                        'max_score': float(max_s),
                        'weight': float(r.criterion.weight),
                        'normalized_percentage': float(round(norm, 2))
                    })
                manager_criteria_score = min(Decimal('100.00'), max(Decimal('0.00'), weighted_sum))
        elif mgr_appraisal and mgr_appraisal.overall_score is not None:
            manager_criteria_score = mgr_appraisal.overall_score

        # 3. Self-Assessment calculation
        self_appraisal = Appraisal.objects.filter(
            employee=employee,
            cycle=cycle,
            appraisal_type=AppraisalType.SELF
        ).prefetch_related('ratings__criterion').first()

        self_assessment_score = Decimal('0.00')
        self_ratings_breakdown = []
        if self_appraisal and self_appraisal.ratings.exists():
            ratings = self_appraisal.ratings.all()
            total_weight = sum(r.criterion.weight for r in ratings if r.criterion.weight > 0)
            if total_weight > 0:
                weighted_sum = Decimal('0.00')
                for r in ratings:
                    max_s = r.criterion.maximum_score or Decimal('100.00')
                    norm = (r.score / max_s) * Decimal('100.00')
                    w = r.criterion.weight / total_weight
                    weighted_sum += norm * w
                    self_ratings_breakdown.append({
                        'id': str(r.criterion.id),
                        'criterion': r.criterion.name,
                        'score': float(r.score),
                        'max_score': float(max_s),
                        'weight': float(r.criterion.weight),
                        'normalized_percentage': float(round(norm, 2))
                    })
                self_assessment_score = min(Decimal('100.00'), max(Decimal('0.00'), weighted_sum))
        elif self_appraisal and self_appraisal.overall_score is not None:
            self_assessment_score = self_appraisal.overall_score

        # 4. Final Composite Calculation based on dynamic HR weights
        overall = (
            (goals_composite * goals_w) +
            (manager_criteria_score * mgr_w) +
            (self_assessment_score * self_w)
        )
        overall = min(Decimal('100.00'), max(Decimal('0.00'), round(overall, 2)))

        return {
            'goals_progress_avg': float(round(avg_goal_progress, 2)),
            'kpis_achievement_avg': float(round(avg_kpi_pct, 2)),
            'goals_composite_score': float(round(goals_composite, 2)),
            'manager_criteria_score': float(round(manager_criteria_score, 2)),
            'self_assessment_score': float(round(self_assessment_score, 2)),
            'overall_score': float(overall),
            'performance_grade': cls.get_grade(overall),
            'weight_distribution': {
                'goals_and_kpis': float(round(goals_w * Decimal('100.0'), 1)),
                'manager_evaluation': float(round(mgr_w * Decimal('100.0'), 1)),
                'self_assessment': float(round(self_w * Decimal('100.0'), 1))
            },
            'evaluation_parameters': [
                {
                    'id': str(crit.id),
                    'name': crit.name,
                    'description': crit.description,
                    'weight': float(crit.weight),
                    'maximum_score': float(crit.maximum_score),
                    'is_active': crit.is_active,
                }
                for crit in active_criteria
            ],
            'breakdown': {
                'manager_ratings': manager_ratings_breakdown,
                'self_ratings': self_ratings_breakdown
            }
        }
