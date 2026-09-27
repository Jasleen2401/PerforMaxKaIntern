from django.urls import path, re_path
from apps.accounts.views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    CurrentUserView,
    ChangePasswordView,
    LogoutView,
    ValidateTokenView,
    SendOTPView,
    VerifyOTPView,
    ForgotPasswordView,
    ResetPasswordView,
)

urlpatterns = [
    re_path(r'^login/?$', CustomTokenObtainPairView.as_view(), name='auth_login'),
    re_path(r'^(?:token/)?refresh(?:-token)?/?$', CustomTokenRefreshView.as_view(), name='token_refresh'),
    re_path(r'^me/?$', CurrentUserView.as_view(), name='auth_me'),
    re_path(r'^change-password/?$', ChangePasswordView.as_view(), name='auth_change_password'),
    re_path(r'^forgot-password/?$', ForgotPasswordView.as_view(), name='auth_forgot_password'),
    re_path(r'^reset-password/?$', ResetPasswordView.as_view(), name='auth_reset_password'),
    re_path(r'^logout/?$', LogoutView.as_view(), name='auth_logout'),
    re_path(r'^validate/?$', ValidateTokenView.as_view(), name='auth_validate'),
    re_path(r'^otp/send/?$', SendOTPView.as_view(), name='auth_otp_send'),
    re_path(r'^otp/verify/?$', VerifyOTPView.as_view(), name='auth_otp_verify'),
]

