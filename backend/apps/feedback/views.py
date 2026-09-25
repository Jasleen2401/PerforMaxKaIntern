from django.db.models import Q, Count
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.feedback.models import Feedback, FeedbackVisibility, FeedbackStatus, FeedbackComment
from apps.feedback.serializers import FeedbackSerializer, FeedbackCommentSerializer
from apps.accounts.models import User


class FeedbackViewSet(viewsets.ModelViewSet):
    serializer_class = FeedbackSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['feedback_type', 'visibility', 'recipient', 'status']
    search_fields = ['message', 'sender__username', 'recipient__username']
    ordering_fields = ['created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Feedback.objects.none()

        qs = Feedback.objects.select_related('sender', 'recipient', 'goal', 'sender__profile', 'recipient__profile').prefetch_related('comments', 'comments__author', 'comments__author__profile')

        employee_param = self.request.query_params.get('employeeId') or self.request.query_params.get('employee_id')
        feedback_type_param = self.request.query_params.get('feedbackType') or self.request.query_params.get('category')
        tab_type = self.request.query_params.get('direction') or self.request.query_params.get('type') # 'received' or 'given'


        if not (user.is_super_admin or user.is_hr):
            qs = qs.filter(
                Q(visibility=FeedbackVisibility.PUBLIC) |
                Q(sender=user) |
                Q(recipient=user) |
                Q(recipient__profile__manager=user)
            )

        if employee_param:
            # Match either user UUID or employee_code or integer id
            user_target = User.objects.filter(
                Q(id__iexact=str(employee_param)) |
                Q(profile__id__iexact=str(employee_param)) |
                Q(profile__employee_code__iexact=str(employee_param))
            ).first()
            if user_target:
                if tab_type == 'given':
                    qs = qs.filter(sender=user_target)
                else:
                    qs = qs.filter(recipient=user_target)

        if feedback_type_param and feedback_type_param.upper() != 'ALL':
            qs = qs.filter(feedback_type__iexact=feedback_type_param)

        return qs

    def perform_create(self, serializer):
        recipient_id = self.request.data.get('recipient') or self.request.data.get('recipientId') or self.request.data.get('employeeId')
        recipient_user = None
        if recipient_id:
            recipient_user = User.objects.filter(
                Q(id__iexact=str(recipient_id)) |
                Q(profile__id__iexact=str(recipient_id)) |
                Q(profile__employee_code__iexact=str(recipient_id))
            ).first()

        feedback_type = self.request.data.get('feedback_type') or self.request.data.get('category') or 'POSITIVE'
        is_anon = bool(self.request.data.get('is_anonymous') or self.request.data.get('anonymous', False))

        kwargs = {
            'sender': self.request.user,
            'feedback_type': feedback_type.upper(),
            'is_anonymous': is_anon,
            'status': FeedbackStatus.PUBLISHED,
        }
        if recipient_user:
            kwargs['recipient'] = recipient_user

        serializer.save(**kwargs)

    @action(detail=False, methods=['get'], url_path='employee/(?P<employee_id>[^/.]+)')
    def by_employee(self, request, employee_id=None):
        """Retrieve feedbacks received by a given employee."""
        user_target = User.objects.filter(
            Q(id__iexact=str(employee_id)) |
            Q(profile__id__iexact=str(employee_id)) |
            Q(profile__employee_code__iexact=str(employee_id))
        ).first()

        if not user_target:
            return Response({'code': 200, 'data': [], 'message': 'Employee not found'})

        qs = self.get_queryset().filter(recipient=user_target)
        serializer = self.get_serializer(qs, many=True)
        return Response({'code': 200, 'data': serializer.data})

    @action(detail=False, methods=['get'], url_path='stats/(?P<employee_id>[^/.]+)')
    def stats(self, request, employee_id=None):
        """Returns categorized counts matching the UI counter cards in media_1789919618455.png."""
        user_target = User.objects.filter(
            Q(id__iexact=str(employee_id)) |
            Q(profile__id__iexact=str(employee_id)) |
            Q(profile__employee_code__iexact=str(employee_id))
        ).first()

        if not user_target:
            return Response({'code': 200, 'data': {
                'all': 0, 'positive': 0, 'negative': 0, 'observation': 0,
                'rewards': 0, 'training': 0, 'satisfactory': 0, 'constructive': 0,
            }})

        feedbacks = Feedback.objects.filter(recipient=user_target)
        stats_map = {
            'all': feedbacks.count(),
            'positive': feedbacks.filter(feedback_type__in=['POSITIVE', 'PRAISE']).count(),
            'negative': feedbacks.filter(feedback_type__in=['NEGATIVE', 'WARNING']).count(),
            'observation': feedbacks.filter(feedback_type__in=['OBSERVATION', 'PROGRESS']).count(),
            'rewards': feedbacks.filter(feedback_type='REWARDS').count(),
            'training': feedbacks.filter(feedback_type__in=['TRAINING', 'COACHING']).count(),
            'satisfactory': feedbacks.filter(feedback_type__in=['SATISFACTORY', 'SUGGESTION']).count(),
            'constructive': feedbacks.filter(feedback_type='CONSTRUCTIVE').count(),
        }
        return Response({'code': 200, 'data': stats_map})

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """HR / Manager publish feedback (notebook requirement)."""
        feedback = self.get_object()
        feedback.status = FeedbackStatus.PUBLISHED
        feedback.save(update_fields=['status'])
        return Response({'code': 200, 'message': 'Feedback published successfully.', 'data': FeedbackSerializer(feedback, context={'request': request}).data})

    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        """Comment / thread management for feedback item."""
        feedback = self.get_object()
        if request.method == 'GET':
            comments = feedback.comments.select_related('author', 'author__profile').all()
            serializer = FeedbackCommentSerializer(comments, many=True)
            return Response({'code': 200, 'data': serializer.data})

        comment_text = request.data.get('comment') or request.data.get('message')
        if not comment_text:
            return Response({'code': 400, 'message': 'Comment text is required.'}, status=status.HTTP_400_BAD_REQUEST)

        comment = FeedbackComment.objects.create(
            feedback=feedback,
            author=request.user,
            comment=comment_text.strip()
        )
        serializer = FeedbackCommentSerializer(comment)
        return Response({'code': 201, 'message': 'Comment posted successfully.', 'data': serializer.data}, status=status.HTTP_201_CREATED)

