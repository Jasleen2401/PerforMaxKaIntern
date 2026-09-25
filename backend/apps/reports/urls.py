from django.urls import path, re_path
from apps.reports.views import (
    MyPerformanceReportView,
    TeamPerformanceReportView,
    OrganizationPerformanceReportView,
    ExportPerformanceReportCSVView
)
from apps.frontend_compat.views import ReportDownloadCompatView, ReportDataCompatView

urlpatterns = [
    path('my-performance/', MyPerformanceReportView.as_view(), name='my-performance-report'),
    path('team-performance/', TeamPerformanceReportView.as_view(), name='team-performance-report'),
    path('organization-performance/', OrganizationPerformanceReportView.as_view(), name='organization-performance-report'),
    path('export/csv/', ExportPerformanceReportCSVView.as_view(), name='export-performance-csv'),
    re_path(r'^(?:v1/)?(?P<endpoint>[^/]+)/download/?$', ReportDownloadCompatView.as_view(), name='report-download-compat'),
    re_path(r'^(?P<endpoint>[^/]+)/download/?$', ReportDownloadCompatView.as_view(), name='report-download-compat-direct'),
    re_path(r'^(?:v1/)?(?P<endpoint>[^/]+)/?$', ReportDataCompatView.as_view(), name='report-data-compat'),
    re_path(r'^(?P<endpoint>[^/]+)/?$', ReportDataCompatView.as_view(), name='report-data-compat-direct'),
]
