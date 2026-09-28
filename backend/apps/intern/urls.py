from django.urls import path
from . import views

app_name = 'intern'

urlpatterns = [
    # Dashboard & Scorecard Overview
    path('overview/', views.InternOverviewView.as_view(), name='overview'),
    path('scorecard/', views.InternOverviewView.as_view(), name='scorecard'),

    # Goals, Progress Sliders & Goal Comments
    path('my-goals/', views.InternGoalsView.as_view(), name='my_goals'),
    path('my-goals/<uuid:pk>/progress/', views.InternUpdateProgressView.as_view(), name='update_progress'),
    path('my-goals/<uuid:pk>/comments/', views.InternGoalCommentsView.as_view(), name='goal_comments'),

    # Evidence Submissions (File attachments, URLs, status)
    path('evidence/', views.InternEvidenceView.as_view(), name='evidence_list'),
    path('evidence/submit/', views.InternEvidenceView.as_view(), name='submit_evidence'),

    # Assigned Tasks & Instructions
    path('tasks/', views.InternTasksView.as_view(), name='tasks_list'),
    path('tasks/<uuid:pk>/complete/', views.InternCompleteTaskView.as_view(), name='complete_task'),

    # Self-Rating & HR-Published Questionnaire
    path('self-appraisal/', views.InternSelfAppraisalView.as_view(), name='self_appraisal'),

    # Published Feedback, Scores, Classification, Improvement Areas & Reply
    path('published-feedback/', views.InternPublishedFeedbackView.as_view(), name='published_feedback'),
    path('published-feedback/reply/', views.InternPublishedFeedbackView.as_view(), name='reply_feedback'),
]
