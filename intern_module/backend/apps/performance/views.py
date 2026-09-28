from decimal import Decimal
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.performance.models import (
    PerformanceCycle,
    EvaluationCriterion,
    Appraisal,
    AppraisalRating,
    AppraisalType,
    AppraisalStatus,
    PerformanceImprovementPlan,
    RecognitionReward,
)
from apps.performance.serializers import (
    PerformanceCycleSerializer,
    EvaluationCriterionSerializer,
    AppraisalSerializer,
    SubmitAppraisalSerializer,
    PerformanceImprovementPlanSerializer,
    RecognitionRewardSerializer,
)
from apps.performance.services.scoring import ScoringService
from apps.accounts.permissions import IsHR, IsManager

class PerformanceCycleViewSet(viewsets.ModelViewSet):
    queryset = PerformanceCycle.objects.select_related('created_by').prefetch_related('goals').all()
    serializer_class = PerformanceCycleSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['name', 'description']
    ordering_fields = ['start_date', 'end_date', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHR()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['post'], url_path='create-template', permission_classes=[permissions.IsAuthenticated])
    def create_template(self, request):
        """Creates an appraisal cycle template matching media_1789919691069.png."""
        if not (request.user.is_super_admin or request.user.is_hr):
            return Response({'code': 403, 'message': 'Only Admins and HR can create appraisal templates.'}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get('template_name') or request.data.get('name')
        description = request.data.get('description', '')
        stages = request.data.get('stages', {})
        post_processes = request.data.get('post_processes', {})

        if not name:
            return Response({'code': 400, 'message': 'Template name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        from datetime import date, timedelta
        start = date.today()
        end = start + timedelta(days=90)

        desc_full = description
        stage_summary = []
        if stages.get('self_appraisal', True):
            stage_summary.append("Self Appraisal")
        if stages.get('multi_rater', False):
            stage_summary.append("Multi-rater 360")
        if stages.get('manager_review', True):
            stage_summary.append("Manager Review")

        proc_summary = []
        if post_processes.get('normalisation', True):
            proc_summary.append("Normalisation")
        if post_processes.get('salary_hike', True):
            proc_summary.append("Salary Hike")

        if stage_summary:
            desc_full += f" | Stages: {', '.join(stage_summary)}"
        if proc_summary:
            desc_full += f" | Post-processes: {', '.join(proc_summary)}"

        cycle = PerformanceCycle.objects.create(
            name=name,
            description=desc_full,
            start_date=start,
            end_date=end,
            status='ACTIVE',
            goals_weight=Decimal(str(request.data.get('goals_weight', 40.0))),
            manager_weight=Decimal(str(request.data.get('manager_weight', 40.0))),
            self_weight=Decimal(str(request.data.get('self_weight', 20.0))),
            created_by=request.user
        )

        return Response({
            'code': 201,
            'message': f'Appraisal template "{name}" successfully created!',
            'data': PerformanceCycleSerializer(cycle).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get', 'post'], url_path='scoring-parameters', permission_classes=[permissions.IsAuthenticated])
    def scoring_parameters_global(self, request):
        """
        HR configures or views flexible evaluation parameters and component weightages
        for the active cycle (or global defaults).
        """
        active_cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).order_by('-start_date').first()
        if not active_cycle:
            active_cycle = PerformanceCycle.objects.order_by('-start_date').first()
        return self._handle_scoring_parameters(request, active_cycle)

    @action(detail=True, methods=['get', 'post', 'put'], url_path='scoring-parameters', permission_classes=[permissions.IsAuthenticated])
    def scoring_parameters_cycle(self, request, pk=None):
        """
        HR configures or views flexible evaluation parameters and component weightages
        for a specific appraisal cycle.
        """
        cycle = self.get_object()
        return self._handle_scoring_parameters(request, cycle)

    def _handle_scoring_parameters(self, request, cycle):
        if request.method == 'GET':
            criteria = ScoringService.get_active_criteria(cycle)
            goals_w = float(cycle.goals_weight) if cycle else 40.0
            mgr_w = float(cycle.manager_weight) if cycle else 40.0
            self_w = float(cycle.self_weight) if cycle else 20.0
            return Response({
                'code': 200,
                'data': {
                    'cycle': {
                        'id': str(cycle.id) if cycle else None,
                        'name': cycle.name if cycle else 'Default Evaluation Cycle',
                        'status': cycle.status if cycle else 'ACTIVE',
                    },
                    'componentWeights': {
                        'goalsWeight': goals_w,
                        'managerWeight': mgr_w,
                        'selfWeight': self_w,
                        'totalWeight': round(goals_w + mgr_w + self_w, 2),
                    },
                    'evaluationParameters': [
                        {
                            'id': str(c.id),
                            'name': c.name,
                            'description': c.description,
                            'weight': float(c.weight),
                            'maximumScore': float(c.maximum_score),
                            'isActive': c.is_active,
                        }
                        for c in criteria
                    ]
                }
            })

        # POST / PUT: Only HR and Super Admin
        if not (request.user.is_super_admin or request.user.is_hr):
            return Response({'code': 403, 'message': 'Only HR Partners and Admins can configure evaluation parameters and weights.'}, status=status.HTTP_403_FORBIDDEN)

        # 1. Update component weights if provided
        comp_weights = request.data.get('componentWeights', {}) or request.data
        goals_w = comp_weights.get('goalsWeight') or comp_weights.get('goals_weight')
        mgr_w = comp_weights.get('managerWeight') or comp_weights.get('manager_weight')
        self_w = comp_weights.get('selfWeight') or comp_weights.get('self_weight')

        if cycle and (goals_w is not None or mgr_w is not None or self_w is not None):
            if goals_w is not None:
                cycle.goals_weight = Decimal(str(goals_w))
            if mgr_w is not None:
                cycle.manager_weight = Decimal(str(mgr_w))
            if self_w is not None:
                cycle.self_weight = Decimal(str(self_w))
            cycle.save(update_fields=['goals_weight', 'manager_weight', 'self_weight'])

        # 2. Update or create evaluation parameters if provided
        parameters = request.data.get('evaluationParameters') or request.data.get('parameters')
        if parameters is not None and isinstance(parameters, list):
            for param in parameters:
                param_id = param.get('id')
                name = param.get('name')
                desc = param.get('description', '')
                weight = param.get('weight', 20.0)
                max_score = param.get('maximumScore') or param.get('maximum_score', 100.0)
                is_active = param.get('isActive', True) if 'isActive' in param else param.get('is_active', True)

                if param_id:
                    crit = EvaluationCriterion.objects.filter(id=param_id).first()
                    if crit:
                        if name: crit.name = name
                        crit.description = desc
                        crit.weight = Decimal(str(weight))
                        crit.maximum_score = Decimal(str(max_score))
                        crit.is_active = is_active
                        if cycle: crit.cycle = cycle
                        crit.save()
                        continue

                if name:
                    EvaluationCriterion.objects.create(
                        cycle=cycle,
                        name=name,
                        description=desc,
                        weight=Decimal(str(weight)),
                        maximum_score=Decimal(str(max_score)),
                        is_active=is_active
                    )

        # Handle deletions if requested
        delete_ids = request.data.get('deleteParameterIds', [])
        if delete_ids:
            EvaluationCriterion.objects.filter(id__in=delete_ids).delete()

        # Recalculate published appraisals if requested
        if request.data.get('recalculate', False) and cycle:
            for appraisal in cycle.appraisals.filter(status=AppraisalStatus.PUBLISHED):
                calc = ScoringService.calculate_cycle_score(appraisal.employee, cycle)
                appraisal.overall_score = Decimal(str(calc['overall_score']))
                appraisal.save(update_fields=['overall_score'])

        # Return refreshed data
        criteria = ScoringService.get_active_criteria(cycle)
        goals_w = float(cycle.goals_weight) if cycle else 40.0
        mgr_w = float(cycle.manager_weight) if cycle else 40.0
        self_w = float(cycle.self_weight) if cycle else 20.0
        return Response({
            'code': 200,
            'message': 'Performance assessment parameters and weightages updated successfully!',
            'data': {
                'cycle': {
                    'id': str(cycle.id) if cycle else None,
                    'name': cycle.name if cycle else 'Default Evaluation Cycle',
                    'status': cycle.status if cycle else 'ACTIVE',
                },
                'componentWeights': {
                    'goalsWeight': goals_w,
                    'managerWeight': mgr_w,
                    'selfWeight': self_w,
                    'totalWeight': round(goals_w + mgr_w + self_w, 2),
                },
                'evaluationParameters': [
                    {
                        'id': str(c.id),
                        'name': c.name,
                        'description': c.description,
                        'weight': float(c.weight),
                        'maximumScore': float(c.maximum_score),
                        'isActive': c.is_active,
                    }
                    for c in criteria
                ]
            }
        })


class EvaluationCriterionViewSet(viewsets.ModelViewSet):
    queryset = EvaluationCriterion.objects.all()
    serializer_class = EvaluationCriterionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'cycle']
    search_fields = ['name', 'description']
    ordering_fields = ['weight', 'name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'bulk_configure']:
            return [IsHR()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['post'], url_path='bulk-configure')
    def bulk_configure(self, request):
        """HR bulk-configures criteria weights and parameters."""
        cycle_id = request.data.get('cycle_id')
        cycle = PerformanceCycle.objects.filter(id=cycle_id).first() if cycle_id else None
        criteria_data = request.data.get('criteria', [])

        for item in criteria_data:
            c_id = item.get('id')
            if c_id:
                crit = EvaluationCriterion.objects.filter(id=c_id).first()
                if crit:
                    if 'name' in item: crit.name = item['name']
                    if 'description' in item: crit.description = item['description']
                    if 'weight' in item: crit.weight = Decimal(str(item['weight']))
                    if 'maximum_score' in item: crit.maximum_score = Decimal(str(item['maximum_score']))
                    if 'is_active' in item: crit.is_active = item['is_active']
                    crit.save()
            elif item.get('name'):
                EvaluationCriterion.objects.create(
                    cycle=cycle,
                    name=item['name'],
                    description=item.get('description', ''),
                    weight=Decimal(str(item.get('weight', 20.0))),
                    maximum_score=Decimal(str(item.get('maximum_score', 100.0))),
                    is_active=item.get('is_active', True)
                )

        active = ScoringService.get_active_criteria(cycle)
        return Response({
            'code': 200,
            'message': 'Evaluation criteria configured successfully',
            'data': EvaluationCriterionSerializer(active, many=True).data
        })

class AppraisalViewSet(viewsets.ModelViewSet):
    serializer_class = AppraisalSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['cycle', 'employee', 'appraisal_type', 'status']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_code', 'cycle__name']
    ordering_fields = ['created_at', 'overall_score', 'status']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Appraisal.objects.none()

        base_qs = Appraisal.objects.select_related(
            'employee__user', 'cycle', 'reviewer'
        ).prefetch_related('ratings__criterion').all()

        if user.is_super_admin or user.is_hr:
            return base_qs

        if user.is_manager:
            return base_qs.filter(
                Q(employee__manager=user) | Q(reviewer=user) | Q(employee__user=user)
            )

        # Interns see their own self assessments anytime, but only PUBLISHED manager appraisals!
        return base_qs.filter(
            Q(employee__user=user, appraisal_type=AppraisalType.SELF) |
            Q(employee__user=user, status=AppraisalStatus.PUBLISHED)
        )

    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_appraisal(self, request, pk=None):
        """Submit self-assessment or manager evaluation."""
        appraisal = self.get_object()
        user = request.user

        # Permission check
        is_self = (appraisal.appraisal_type == AppraisalType.SELF and appraisal.employee.user == user)
        is_mgr = (appraisal.appraisal_type == AppraisalType.MANAGER and (appraisal.employee.manager == user or user.is_hr))

        if not (is_self or is_mgr or user.is_super_admin):
            return Response(
                {"detail": "You do not have permission to submit this appraisal."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SubmitAppraisalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comments = serializer.validated_data.get('comments', '')
        ratings_data = serializer.validated_data.get('ratings', [])

        if appraisal.appraisal_type == AppraisalType.SELF:
            appraisal.self_comments = comments
        else:
            appraisal.reviewer_comments = comments
            appraisal.reviewer = user

        # Update or create ratings
        for r in ratings_data:
            try:
                crit = EvaluationCriterion.objects.get(id=r['criterion_id'])
                AppraisalRating.objects.update_or_create(
                    appraisal=appraisal,
                    criterion=crit,
                    defaults={
                        'score': r['score'],
                        'comments': r.get('comments', '')
                    }
                )
            except EvaluationCriterion.DoesNotExist:
                continue

        appraisal.status = AppraisalStatus.SUBMITTED
        appraisal.submitted_at = timezone.now()
        appraisal.save()

        return Response(AppraisalSerializer(appraisal).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsHR], url_path='publish')
    def publish_appraisal(self, request, pk=None):
        """HR publishes final evaluation with verified composite score."""
        appraisal = self.get_object()

        # Compute overall score via ScoringService
        calculation = ScoringService.calculate_cycle_score(appraisal.employee, appraisal.cycle)
        appraisal.overall_score = Decimal(str(calculation['overall_score']))
        appraisal.status = AppraisalStatus.PUBLISHED
        appraisal.published_at = timezone.now()

        final_notes = request.data.get('final_comments', '')
        if final_notes:
            appraisal.final_comments = final_notes
        appraisal.save()

        resp_data = AppraisalSerializer(appraisal).data
        resp_data['score_calculation'] = calculation
        return Response(resp_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='score-breakdown')
    def score_breakdown(self, request, pk=None):
        """Returns reproducible mathematical breakdown of employee scores for this cycle."""
        appraisal = self.get_object()
        calculation = ScoringService.calculate_cycle_score(appraisal.employee, appraisal.cycle)
        return Response(calculation, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='re-review', permission_classes=[permissions.IsAuthenticated])
    def re_review(self, request, pk=None):
        """Super Admin / HR can reopen appraisals for re-review (notebook requirement)."""
        if not (request.user.is_super_admin or request.user.is_hr):
            return Response({'code': 403, 'message': 'Only Admins and HR can reopen appraisals for re-review.'}, status=status.HTTP_403_FORBIDDEN)

        appraisal = self.get_object()
        appraisal.status = AppraisalStatus.DRAFT
        appraisal.save(update_fields=['status'])
        return Response({
            'code': 200,
            'message': f'Appraisal for {appraisal.employee.full_name} has been reopened for re-review.',
            'data': AppraisalSerializer(appraisal).data
        })


class PerformanceImprovementPlanViewSet(viewsets.ModelViewSet):
    serializer_class = PerformanceImprovementPlanSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['employee', 'status']
    search_fields = ['employee__first_name', 'employee__last_name', 'reason', 'objectives']
    ordering_fields = ['start_date', 'end_date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return PerformanceImprovementPlan.objects.none()

        base_qs = PerformanceImprovementPlan.objects.select_related('employee__user', 'created_by').all()

        if user.is_super_admin or user.is_hr:
            return base_qs

        if user.is_manager:
            return base_qs.filter(Q(employee__manager=user) | Q(employee__user=user))

        return base_qs.filter(employee__user=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManager()]
        return [permissions.IsAuthenticated()]

class RecognitionRewardViewSet(viewsets.ModelViewSet):
    queryset = RecognitionReward.objects.select_related('recipient', 'awarded_by').all()
    serializer_class = RecognitionRewardSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['recipient', 'awarded_by']
    search_fields = ['title', 'description', 'recipient__username']
    ordering_fields = ['awarded_at']

    def perform_create(self, serializer):
        serializer.save(awarded_by=self.request.user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManager()]
        return [permissions.IsAuthenticated()]
