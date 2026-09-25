from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from apps.accounts.models import User, UserRole

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username = serializers.CharField(required=False, write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'email' in self.fields:
            self.fields['email'].required = False

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Custom claims in JWT payload
        token['role'] = user.role
        token['username'] = user.username
        token['email'] = user.email
        return token

    def validate(self, attrs):
        if not attrs.get('email') and attrs.get('username'):
            try:
                user = User.objects.get(username=attrs['username'])
                attrs['email'] = user.email
            except User.DoesNotExist:
                pass
        data = super().validate(attrs)
        profile_data = None
        if hasattr(self.user, 'profile'):
            profile = self.user.profile
            profile_data = {
                'id': str(profile.id),
                'employee_code': profile.employee_code,
                'full_name': profile.full_name,
                'designation': profile.designation,
                'department': profile.department.name if profile.department else None,
                'manager_id': str(profile.manager_id) if profile.manager_id else None,
            }

        roles = [self.user.role]
        if self.user.role == UserRole.SUPER_ADMIN:
            roles.append('ADMIN')
        elif self.user.role == UserRole.INTERN:
            roles.append('EMPLOYEE')

        data['accessToken'] = data['access']
        data['refreshToken'] = data['refresh']
        data['user'] = {
            'id': str(self.user.id),
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,
            'roles': roles,
            'permissions': [f"ROLE_{r}" for r in roles] + ["ALL"],
            'profile': profile_data,
        }
        data['data'] = {
            'accessToken': str(data['access']),
            'refreshToken': str(data['refresh']),
            'user': data['user'],
        }
        data['code'] = 200
        data['message'] = 'Login successful'
        return data


class CustomTokenRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False)
    refreshToken = serializers.CharField(required=False)

    def validate(self, attrs):
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

        refresh_raw = attrs.get('refresh') or attrs.get('refreshToken')
        if not refresh_raw:
            raise serializers.ValidationError({"refresh": ["This field is required."]})

        try:
            refresh = RefreshToken(refresh_raw)
            access = str(refresh.access_token)
            new_refresh = str(refresh)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        return {
            'code': 200,
            'message': 'Token refreshed successfully',
            'access': access,
            'refresh': new_refresh,
            'accessToken': access,
            'refreshToken': new_refresh,
            'data': {
                'accessToken': access,
                'refreshToken': new_refresh,
            }
        }

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'is_active', 'date_joined')
        read_only_fields = ('id', 'date_joined')

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        norm_email = value.lower().strip()
        if not User.objects.filter(email__iexact=norm_email, is_active=True).exists():
            raise serializers.ValidationError("No active user found with this email address.")
        return norm_email


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, min_length=4, max_length=6)

    def validate_email(self, value):
        return value.lower().strip()

