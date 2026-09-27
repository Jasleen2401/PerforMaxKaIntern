"""
Dual-Engine Email Service for PERFORMAX (EPMS)
Supports:
1. Resend.com API (for verified domains / dev account email)
2. Django Gmail / Standard SMTP Backend (for sending directly to ANY @dailoqa.com recipient without DNS setup)
3. Local Dev Fallback (in-memory / console log)
"""

import os
import logging
from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives

logger = logging.getLogger('apps.accounts')


def send_otp_email(recipient_email: str, otp_code: str, valid_minutes: int = 5) -> dict:
    """
    Dispatches an OTP verification email.
    Tries Resend first; if Resend fails or restricted, seamlessly uses Gmail SMTP.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your PERFORMAX Verification Code</title>
      <style>
        body {{
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 24px;
          color: #0f172a;
        }}
        .container {{
          max-width: 520px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
        }}
        .header {{
          background-color: #0f172a;
          padding: 32px 24px;
          text-align: center;
        }}
        .header h1 {{
          color: #ffffff;
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }}
        .header p {{
          color: #94a3b8;
          margin: 6px 0 0 0;
          font-size: 13px;
        }}
        .content {{
          padding: 36px 32px;
          text-align: center;
        }}
        .content h2 {{
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-top: 0;
        }}
        .content p {{
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
        }}
        .otp-box {{
          display: inline-block;
          background-color: #f1f5f9;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 16px 36px;
          margin: 12px 0 24px 0;
        }}
        .otp-code {{
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 8px;
          color: #4338ca;
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        }}
        .footer {{
          background-color: #f8fafc;
          padding: 20px 32px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
        }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PERFORMAX</h1>
          <p>Enterprise Performance Management System</p>
        </div>
        <div class="content">
          <h2>Verification Passcode</h2>
          <p>You requested a secure one-time passcode to sign in to your PERFORMAX account. Enter the code below to complete authentication:</p>
          
          <div class="otp-box">
            <span class="otp-code">{otp_code}</span>
          </div>
          
          <p style="font-size: 12.5px; color: #94a3b8;">
            This verification code is valid for <strong>{valid_minutes} minutes</strong>.<br>
            If you did not request this login, please ignore this email or notify IT Security.
          </p>
        </div>
        <div class="footer">
          &copy; PERFORMAX Intelligence Platform &bull; Automated Security Dispatch
        </div>
      </div>
    </body>
    </html>
    """

    subject = f"Your PERFORMAX Login Passcode: {otp_code}"
    plain_text = f"Your PERFORMAX verification passcode is {otp_code}. Valid for {valid_minutes} minutes."

    # 1. Try Gmail / Standard SMTP if credentials configured
    smtp_user = getattr(settings, 'EMAIL_HOST_USER', '') or os.getenv('EMAIL_HOST_USER', '')
    smtp_pass = getattr(settings, 'EMAIL_HOST_PASSWORD', '') or os.getenv('EMAIL_HOST_PASSWORD', '')

    if smtp_user and smtp_pass:
        try:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '') or f"PERFORMAX Security <{smtp_user}>"
            msg = EmailMultiAlternatives(
                subject=subject,
                body=plain_text,
                from_email=from_email,
                to=[recipient_email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            logger.info(f"OTP email successfully sent via SMTP to {recipient_email}")
            return {
                'success': True,
                'provider': 'SMTP',
                'message_id': 'smtp_dispatched',
                'error': None
            }
        except Exception as e:
            logger.error(f"SMTP dispatch failed to {recipient_email}: {str(e)}")

    # 2. Try Resend.com
    resend_api_key = getattr(settings, 'RESEND_API_KEY', '') or os.getenv('RESEND_API_KEY', '')
    resend_from = getattr(settings, 'RESEND_FROM_EMAIL', '') or os.getenv('RESEND_FROM_EMAIL', 'PERFORMAX <onboarding@resend.dev>')

    if resend_api_key:
        try:
            import resend
            resend.api_key = resend_api_key
            params = {
                "from": resend_from,
                "to": [recipient_email],
                "subject": subject,
                "html": html_content,
            }
            response = resend.Emails.send(params)
            message_id = response.get('id') if isinstance(response, dict) else getattr(response, 'id', None)
            logger.info(f"Resend OTP email successfully dispatched to {recipient_email} (ID: {message_id})")
            return {
                'success': True,
                'provider': 'Resend',
                'message_id': message_id,
                'error': None
            }
        except Exception as e:
            logger.warning(f"Resend dispatch failed to {recipient_email}: {str(e)}")
            return {
                'success': False,
                'provider': 'Resend',
                'message_id': None,
                'error': str(e)
            }

    # 3. Fallback
    return {
        'success': False,
        'provider': 'None',
        'message_id': None,
        'error': 'Neither SMTP nor Resend API is configured.'
    }


def send_password_reset_email(recipient_email: str, reset_url: str, valid_minutes: int = 15) -> dict:
    """
    Dispatches a password reset email containing a secure one-time link.
    Supports SMTP, Resend API, and dev logging fallback.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your PERFORMAX Password</title>
      <style>
        body {{
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 24px;
          color: #0f172a;
        }}
        .container {{
          max-width: 520px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }}
        .header {{
          background-color: #0f172a;
          padding: 32px 24px;
          text-align: center;
        }}
        .header h1 {{
          color: #ffffff;
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }}
        .header p {{
          color: #94a3b8;
          margin: 6px 0 0 0;
          font-size: 13px;
        }}
        .content {{
          padding: 36px 32px;
          text-align: center;
        }}
        .content h2 {{
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-top: 0;
        }}
        .content p {{
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
        }}
        .btn {{
          display: inline-block;
          background-color: #4338ca;
          color: #ffffff !important;
          padding: 12px 28px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          border-radius: 8px;
          margin: 16px 0;
        }}
        .footer {{
          background-color: #f8fafc;
          padding: 20px 32px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
        }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PERFORMAX</h1>
          <p>Enterprise Performance Management System</p>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your PERFORMAX password. Click the button below to choose a new password:</p>
          
          <a href="{reset_url}" class="btn" target="_blank">Reset Password</a>
          
          <p style="font-size: 12.5px; color: #94a3b8; margin-top: 20px;">
            This link is valid for <strong>{valid_minutes} minutes</strong> and can only be used once.<br>
            If you did not request a password reset, please ignore this email or notify IT Security.
          </p>
        </div>
        <div class="footer">
          &copy; PERFORMAX Intelligence Platform &bull; Automated Security Dispatch
        </div>
      </div>
    </body>
    </html>
    """

    subject = "Reset Your PERFORMAX Password"
    plain_text = f"You requested a password reset for PERFORMAX. Use this link to reset your password: {reset_url}\n\nThis link is valid for {valid_minutes} minutes."

    # 1. Try Gmail / Standard SMTP
    smtp_user = getattr(settings, 'EMAIL_HOST_USER', '') or os.getenv('EMAIL_HOST_USER', '')
    smtp_pass = getattr(settings, 'EMAIL_HOST_PASSWORD', '') or os.getenv('EMAIL_HOST_PASSWORD', '')

    if smtp_user and smtp_pass:
        try:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '') or f"PERFORMAX Security <{smtp_user}>"
            msg = EmailMultiAlternatives(
                subject=subject,
                body=plain_text,
                from_email=from_email,
                to=[recipient_email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            logger.info(f"Password reset email sent via SMTP to {recipient_email}")
            return {'success': True, 'provider': 'SMTP', 'error': None}
        except Exception as e:
            logger.error(f"SMTP dispatch failed to {recipient_email}: {str(e)}")

    # 2. Try Resend.com
    resend_api_key = getattr(settings, 'RESEND_API_KEY', '') or os.getenv('RESEND_API_KEY', '')
    resend_from = getattr(settings, 'RESEND_FROM_EMAIL', '') or os.getenv('RESEND_FROM_EMAIL', 'PERFORMAX <onboarding@resend.dev>')

    if resend_api_key:
        try:
            import resend
            resend.api_key = resend_api_key
            params = {
                "from": resend_from,
                "to": [recipient_email],
                "subject": subject,
                "html": html_content,
            }
            response = resend.Emails.send(params)
            message_id = response.get('id') if isinstance(response, dict) else getattr(response, 'id', None)
            logger.info(f"Resend password reset email dispatched to {recipient_email} (ID: {message_id})")
            return {'success': True, 'provider': 'Resend', 'message_id': message_id, 'error': None}
        except Exception as e:
            logger.warning(f"Resend dispatch failed to {recipient_email}: {str(e)}")
            return {'success': False, 'provider': 'Resend', 'error': str(e)}

    # 3. Fallback (local console/dev)
    logger.info(f"[DEV FALLBACK] Password reset email link for {recipient_email}: {reset_url}")
    return {'success': False, 'provider': 'None', 'error': 'SMTP/Resend not configured (Dev fallback used)'}

