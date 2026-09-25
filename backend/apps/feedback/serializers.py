from rest_framework import serializers
from apps.feedback.models import Feedback, FeedbackComment


class FeedbackCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_id = serializers.UUIDField(source='author.id', read_only=True)

    class Meta:
        model = FeedbackComment
        fields = ('id', 'feedback', 'author', 'author_id', 'author_name', 'comment', 'created_at')
        read_only_fields = ('id', 'author', 'created_at')

    def get_author_name(self, obj):
        if hasattr(obj.author, 'profile') and obj.author.profile.full_name:
            return obj.author.profile.full_name
        return obj.author.username


class FeedbackSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_designation = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()
    goal_title = serializers.CharField(source='goal.title', read_only=True)
    comments = FeedbackCommentSerializer(many=True, read_only=True)
    category = serializers.CharField(source='feedback_type', read_only=True)

    class Meta:
        model = Feedback
        fields = (
            'id', 'sender', 'sender_name', 'sender_designation',
            'recipient', 'recipient_name', 'goal', 'goal_title',
            'feedback_type', 'category', 'message', 'visibility',
            'is_anonymous', 'status', 'comments',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'sender', 'created_at', 'updated_at')

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        recipient_val = data.get('recipient') or data.get('recipientId') or data.get('employeeId')
        if recipient_val and not data.get('recipient'):
            from apps.accounts.models import User
            from django.db.models import Q
            user_target = User.objects.filter(
                Q(id__iexact=str(recipient_val)) |
                Q(profile__id__iexact=str(recipient_val)) |
                Q(profile__employee_code__iexact=str(recipient_val))
            ).first()
            if user_target:
                data['recipient'] = str(user_target.id)

        if 'category' in data and not data.get('feedback_type'):
            data['feedback_type'] = str(data['category']).upper()

        return super().to_internal_value(data)


    def get_sender_name(self, obj):
        request = self.context.get('request')
        current_user = request.user if request else None
        if obj.is_anonymous:
            # If current user is the sender or super admin, show author with note, else "Anonymous"
            if current_user and (current_user == obj.sender or current_user.is_super_admin):
                base_name = obj.sender.profile.full_name if hasattr(obj.sender, 'profile') else obj.sender.username
                return f"{base_name} (Posted Anonymously)"
            return "Anonymous"
        if hasattr(obj.sender, 'profile') and obj.sender.profile.full_name:
            return obj.sender.profile.full_name
        return obj.sender.username

    def get_sender_designation(self, obj):
        if obj.is_anonymous:
            return "Colleague"
        if hasattr(obj.sender, 'profile') and obj.sender.profile.designation:
            return obj.sender.profile.designation
        return obj.sender.get_role_display()

    def get_recipient_name(self, obj):
        if hasattr(obj.recipient, 'profile') and obj.recipient.profile.full_name:
            return f"{obj.recipient.profile.employee_code} - {obj.recipient.profile.full_name}"
        return obj.recipient.username

