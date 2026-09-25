from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.training.views import TrainingCourseViewSet, EmployeeTrainingViewSet

router = DefaultRouter()
router.register(r'courses', TrainingCourseViewSet, basename='trainingcourse')
router.register(r'enrollments', EmployeeTrainingViewSet, basename='employeetraining')

urlpatterns = [
    path('', include(router.urls)),
]
