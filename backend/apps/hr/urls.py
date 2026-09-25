from django.urls import path
from . import views

app_name = 'hr'

urlpatterns = [
    path('dashboard/', views.HrDashboardView.as_view(), name='dashboard'),
    path('cycles/', views.HrCyclesView.as_view(), name='cycles'),
    path('cycles/<uuid:pk>/publish/', views.HrPublishCycleView.as_view(), name='publish_cycle'),
    path('criteria/', views.HrCriteriaView.as_view(), name='criteria'),
    path('pips/', views.HrPipOverviewView.as_view(), name='pips'),
    path('analytics/bell-curve/', views.HrBellCurveAnalyticsView.as_view(), name='bell_curve'),
]
