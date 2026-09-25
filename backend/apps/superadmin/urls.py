from django.urls import path
from . import views

app_name = 'superadmin'

urlpatterns = [
    path('dashboard/', views.SuperAdminDashboardView.as_view(), name='dashboard'),
    path('audit-logs/', views.SuperAdminAuditLogsView.as_view(), name='audit_logs'),
    path('employees/', views.SuperAdminEmployeesView.as_view(), name='employees'),
    path('employees/<uuid:pk>/lock-status/', views.SuperAdminToggleLockView.as_view(), name='toggle_lock'),
    path('security-matrix/', views.SuperAdminSecurityMatrixView.as_view(), name='security_matrix'),
]
