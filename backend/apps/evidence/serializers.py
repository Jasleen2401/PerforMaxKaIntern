from rest_framework import serializers
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus

class EvidenceSubmissionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    goal_title = serializers.CharField(source='goal.title', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.username', read_only=True)

    class Meta:
        model = EvidenceSubmission
        fields = (
            'id', 'employee', 'employee_name', 'employee_code',
            'goal', 'goal_title', 'title', 'description',
            'file_attachment', 'external_url',
            'review_status', 'review_notes',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'created_at', 'updated_at'
        )
        read_only_fields = (
            'id', 'employee', 'review_status', 'review_notes',
            'reviewed_by', 'reviewed_at', 'created_at', 'updated_at'
        )

class ReviewEvidenceSerializer(serializers.Serializer):
    review_status = serializers.ChoiceField(
        choices=[
            EvidenceReviewStatus.APPROVED,
            EvidenceReviewStatus.REJECTED,
            EvidenceReviewStatus.REVISION_REQUESTED
        ]
    )
    review_notes = serializers.CharField(required=False, allow_blank=True)
