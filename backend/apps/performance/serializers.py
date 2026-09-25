from decimal import Decimal
from rest_framework import serializers
from apps.performance.models import (
    PerformanceCycle,
    EvaluationCriterion,
    Appraisal,
    AppraisalRating,
    PerformanceImprovementPlan,
    RecognitionReward,
)

class PerformanceCycleSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    goals_count = serializers.IntegerField(source='goals.count', read_only=True)

    class Meta:
        model = PerformanceCycle
        fields = (
            'id', 'name', 'description', 'start_date', 'end_date',
            'status', 'created_by', 'created_by_name', 'goals_count',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date must be on or after start date."})
        return attrs

class EvaluationCriterionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationCriterion
        fields = ('id', 'name', 'description', 'maximum_score', 'weight', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

class AppraisalRatingSerializer(serializers.ModelSerializer):
    criterion_name = serializers.CharField(source='criterion.name', read_only=True)
    criterion_weight = serializers.DecimalField(source='criterion.weight', max_digits=5, decimal_places=2, read_only=True)
    maximum_score = serializers.DecimalField(source='criterion.maximum_score', max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = AppraisalRating
        fields = ('id', 'criterion', 'criterion_name', 'criterion_weight', 'maximum_score', 'score', 'comments')
        read_only_fields = ('id',)

class AppraisalSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True)
    ratings = AppraisalRatingSerializer(many=True, read_only=True)

    class Meta:
        model = Appraisal
        fields = (
            'id', 'employee', 'employee_name', 'employee_code', 'cycle', 'cycle_name',
            'reviewer', 'reviewer_name', 'appraisal_type', 'status', 'overall_score',
            'self_comments', 'reviewer_comments', 'final_comments', 'ratings',
            'submitted_at', 'published_at', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'overall_score', 'submitted_at', 'published_at', 'created_at', 'updated_at')

from decimal import Decimal

class RatingInputSerializer(serializers.Serializer):
    criterion_id = serializers.UUIDField(required=True)
    score = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal('0.00'), required=True)
    comments = serializers.CharField(required=False, allow_blank=True)

class SubmitAppraisalSerializer(serializers.Serializer):
    comments = serializers.CharField(required=False, allow_blank=True)
    ratings = RatingInputSerializer(many=True, required=False)

class PerformanceImprovementPlanSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = PerformanceImprovementPlan
        fields = (
            'id', 'employee', 'employee_name', 'employee_code',
            'created_by', 'created_by_name', 'reason', 'objectives',
            'start_date', 'end_date', 'status', 'review_notes',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

class RecognitionRewardSerializer(serializers.ModelSerializer):
    recipient_name = serializers.CharField(source='recipient.username', read_only=True)
    awarded_by_name = serializers.CharField(source='awarded_by.username', read_only=True)

    class Meta:
        model = RecognitionReward
        fields = ('id', 'recipient', 'recipient_name', 'awarded_by', 'awarded_by_name', 'title', 'description', 'awarded_at')
        read_only_fields = ('id', 'awarded_by', 'awarded_at')
