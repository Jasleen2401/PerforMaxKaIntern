from django.urls import path
from . import views

app_name = 'intern'

urlpatterns = [
    path('scorecard/', views.InternScorecardView.as_view(), name='scorecard'),
    path('my-goals/', views.InternGoalsView.as_view(), name='my_goals'),
    path('my-goals/<uuid:pk>/progress/', views.InternUpdateProgressView.as_view(), name='update_progress'),
    path('evidence/submit/', views.InternSubmitEvidenceView.as_view(), name='submit_evidence'),
    path('my-appraisals/', views.InternMyAppraisalsView.as_view(), name='my_appraisals'),
]
