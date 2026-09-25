from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.accounts.models import UserRole
from apps.accounts.permissions import IsHR, IsManager
from apps.employees.models import EmployeeProfile
from apps.employees.serializers import EmployeeProfileSerializer, CreateEmployeeSerializer

class EmployeeProfileViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeProfileSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'manager', 'employment_status', 'user__role']
    search_fields = ['first_name', 'last_name', 'employee_code', 'user__email', 'designation']
    ordering_fields = ['first_name', 'employee_code', 'joining_date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return EmployeeProfile.objects.none()

        base_qs = EmployeeProfile.objects.select_related('user', 'department', 'manager').all()

        if user.is_super_admin or user.is_hr:
            return base_qs

        if user.is_manager:
            # Managers see their direct reports and their own profile
            return base_qs.filter(Q(manager=user) | Q(user=user))

        # Interns see only their own profile
        return base_qs.filter(user=user)

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsHR()]
        if self.action in ['update', 'partial_update']:
            return [IsHR()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = CreateEmployeeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        output = EmployeeProfileSerializer(profile)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[IsManager])
    def interns(self, request):
        """Dedicated roster of interns accessible by Managers and HR."""
        user = request.user
        qs = EmployeeProfile.objects.select_related('user', 'department', 'manager').filter(
            user__role=UserRole.INTERN
        )
        if user.is_manager and not (user.is_hr or user.is_super_admin):
            qs = qs.filter(manager=user)

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def update_status(self, request, pk=None):
        """Admin/HR can deactivate or terminate accounts, change employment status."""
        if not (request.user.is_super_admin or request.user.is_hr):
            return Response({'code': 403, 'message': 'Only Admins and HR can modify account status.'}, status=status.HTTP_403_FORBIDDEN)
        
        profile = self.get_object()
        new_status = request.data.get('employment_status') or request.data.get('status')
        is_active = request.data.get('is_active')

        if new_status:
            profile.employment_status = new_status
            if new_status == 'TERMINATED':
                profile.user.is_active = False
                profile.user.save(update_fields=['is_active'])
            profile.save(update_fields=['employment_status'])

        if is_active is not None:
            profile.user.is_active = bool(is_active)
            profile.user.save(update_fields=['is_active'])

        return Response({
            'code': 200,
            'message': f'Employee status successfully updated to {profile.employment_status}.',
            'data': EmployeeProfileSerializer(profile).data
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def assign_mentor(self, request, pk=None):
        """Assign mentor / manager to employee."""
        if not (request.user.is_super_admin or request.user.is_hr or request.user.is_manager):
            return Response({'code': 403, 'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        profile = self.get_object()
        mentor_id = request.data.get('mentor_id') or request.data.get('manager_id')
        from apps.accounts.models import User
        mentor = User.objects.filter(id=mentor_id).first()
        if not mentor:
            return Response({'code': 404, 'message': 'Mentor user not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile.manager = mentor
        profile.save(update_fields=['manager'])
        return Response({
            'code': 200,
            'message': f'Mentor {mentor.username} successfully assigned.',
            'data': EmployeeProfileSerializer(profile).data
        })

    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.IsAuthenticated])
    def competencies(self, request, pk=None):
        """Manage competencies with 1-10 rating scale."""
        profile = self.get_object()
        if request.method == 'GET':
            return Response({'code': 200, 'data': profile.competencies or []})

        # Add or update competency
        if not (request.user.is_super_admin or request.user.is_hr or request.user.is_manager):
            return Response({'code': 403, 'message': 'Only HR and Managers can assign competencies.'}, status=status.HTTP_403_FORBIDDEN)

        new_competencies = request.data.get('competencies')
        if new_competencies is not None and isinstance(new_competencies, list):
            profile.competencies = new_competencies
        else:
            name = request.data.get('name')
            rating = request.data.get('rating', 7)
            description = request.data.get('description', '')
            category = request.data.get('category', 'Technical')
            current = list(profile.competencies or [])
            # Update if exists or append
            found = False
            for comp in current:
                if comp.get('name', '').lower() == (name or '').lower():
                    comp['rating'] = rating
                    comp['description'] = description
                    comp['category'] = category
                    found = True
                    break
            if not found and name:
                current.append({
                    'name': name,
                    'rating': rating,
                    'description': description,
                    'category': category,
                })
            profile.competencies = current

        profile.save(update_fields=['competencies'])
        return Response({'code': 200, 'message': 'Competencies updated.', 'data': profile.competencies})

    @action(detail=True, methods=['post', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def skills_experience(self, request, pk=None):
        """Update skills and experience tracking."""
        profile = self.get_object()
        if profile.user != request.user and not (request.user.is_super_admin or request.user.is_hr):
            return Response({'code': 403, 'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if 'skills' in request.data:
            profile.skills = request.data['skills']
        if 'experience' in request.data:
            profile.experience = request.data['experience']

        profile.save(update_fields=['skills', 'experience'])
        return Response({
            'code': 200,
            'message': 'Skills and experience updated successfully.',
            'data': EmployeeProfileSerializer(profile).data
        })

