from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.performance.views import (
    PerformanceCycleViewSet,
    EvaluationCriterionViewSet,
    AppraisalViewSet,
    PerformanceImprovementPlanViewSet,
    RecognitionRewardViewSet,
)

router = DefaultRouter()
router.register(r'cycles', PerformanceCycleViewSet, basename='performancecycle')
router.register(r'criteria', EvaluationCriterionViewSet, basename='evaluationcriterion')
router.register(r'appraisals', AppraisalViewSet, basename='appraisal')
router.register(r'pips', PerformanceImprovementPlanViewSet, basename='pip')
router.register(r'rewards', RecognitionRewardViewSet, basename='recognitionreward')

urlpatterns = [
    path('', include(router.urls)),
]
