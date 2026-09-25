from django.urls import path
from . import views

app_name = 'manager'

urlpatterns = [
    path('dashboard/', views.ManagerDashboardView.as_view(), name='dashboard'),
    path('team-goals/', views.ManagerTeamGoalsView.as_view(), name='team_goals'),
    path('evidence-reviews/', views.ManagerEvidenceReviewsView.as_view(), name='evidence_reviews'),
    path('evidence-reviews/<uuid:pk>/decision/', views.ManagerEvidenceDecisionView.as_view(), name='evidence_decision'),
    path('appraisals/', views.ManagerAppraisalSubmissionsView.as_view(), name='appraisals'),
]
