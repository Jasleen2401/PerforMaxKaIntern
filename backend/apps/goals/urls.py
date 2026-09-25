from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.goals.views import GoalViewSet, KPIViewSet

router = DefaultRouter()
router.register(r'kpis', KPIViewSet, basename='kpi')
router.register(r'', GoalViewSet, basename='goal')

urlpatterns = [
    path('', include(router.urls)),
]
