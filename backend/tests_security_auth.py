"""
Automated Test Suite for PerforMax Authentication Upgrade
Validates all 18 Security & Functional Requirements
"""

import os
import sys
import json
import uuid
import hashlib
from datetime import timedelta
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.test import Client
from django.utils import timezone
from apps.accounts.models import User, UserRole, PasswordResetToken
from apps.employees.models import EmployeeProfile

def run_all_tests():
    client = Client()
    passed = 0
    failed = 0
    total = 18

    def assert_test(cond, num, desc):
        nonlocal passed, failed
        if cond:
            print(f"  [PASS] Test {num:02d}: {desc}")
            passed += 1
        else:
            print(f"  [FAIL] Test {num:02d}: {desc}")
            failed += 1

    print("\n" + "=" * 75)
    print(" Executing 18 PerforMax Authentication Security & Functional Tests")
    print("=" * 75 + "\n")

    # Setup test intern
    test_email = "jasleen.kaur@dailoqa.com"
    test_user = User.objects.filter(email=test_email).first()
    if not test_user:
        test_user = User.objects.create_user(
            email=test_email,
            username="jasleen_kaur",
            password="jasleen",
            role=UserRole.INTERN,
            password_change_required=True
        )
    else:
        test_user.set_password("jasleen")
        test_user.password_change_required = True
        test_user.save()

    # 1. Valid Dailoqa Email Login
    res1 = client.post('/api/auth/login/', data=json.dumps({
        'email': test_email,
        'password': 'jasleen'
    }), content_type='application/json')
    d1 = res1.json()
    assert_test(res1.status_code == 200 and 'accessToken' in d1, 1, "Valid Dailoqa email login succeeds")
    token_1 = d1.get('accessToken')

    # 2. Invalid email domain rejected
    res2 = client.post('/api/auth/login/', data=json.dumps({
        'email': 'unauthorized.user@gmail.com',
        'password': 'somepassword123'
    }), content_type='application/json')
    assert_test(res2.status_code in (400, 401), 2, "Invalid email domain is rejected by backend")

    # 3. Incorrect password
    res3 = client.post('/api/auth/login/', data=json.dumps({
        'email': test_email,
        'password': 'wrongpassword123'
    }), content_type='application/json')
    assert_test(res3.status_code in (400, 401), 3, "Incorrect password returns authentication failure")

    # 4. First-time login detects password_change_required=True
    assert_test(d1.get('password_change_required') is True and d1.get('user', {}).get('password_change_required') is True, 4, "First-time login returns password_change_required=True")

    # 5. Forced password change redirect detection
    # Tested by verifying user has password_change_required=True and me endpoint reports it
    res5 = client.get('/api/auth/me/', HTTP_AUTHORIZATION=f'Bearer {token_1}')
    d5 = res5.json()
    assert_test(d5.get('password_change_required') is True, 5, "User profile flags forced password change required")

    # 6. Reject reuse of old temporary password during change
    res6 = client.post('/api/auth/change-password/', data=json.dumps({
        'old_password': 'jasleen',
        'new_password': 'jasleen',
        'confirm_password': 'jasleen'
    }), content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {token_1}')
    assert_test(res6.status_code == 400 and 'different' in str(res6.json()).lower(), 6, "Reject setting new password to the same temporary password")

    # 7. Successful password change & normal login after password change
    res7a = client.post('/api/auth/change-password/', data=json.dumps({
        'old_password': 'jasleen',
        'new_password': 'PermanentJasleen2026!',
        'confirm_password': 'PermanentJasleen2026!'
    }), content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {token_1}')
    # Old password no longer works
    res7b = client.post('/api/auth/login/', data=json.dumps({
        'email': test_email,
        'password': 'jasleen'
    }), content_type='application/json')
    # New password works and password_change_required is False
    res7c = client.post('/api/auth/login/', data=json.dumps({
        'email': test_email,
        'password': 'PermanentJasleen2026!'
    }), content_type='application/json')
    d7c = res7c.json()
    assert_test(
        res7a.status_code == 200 and
        res7b.status_code in (400, 401) and
        res7c.status_code == 200 and
        d7c.get('password_change_required') is False,
        7,
        "Normal login with permanent password succeeds & old temporary credential fails"
    )

    # 8. Forgot password endpoint
    res8 = client.post('/api/auth/forgot-password/', data=json.dumps({
        'email': test_email
    }), content_type='application/json')
    assert_test(res8.status_code == 200 and "instructions have been sent" in res8.json().get('message', ''), 8, "Forgot password request accepted and processed")

    # 9. Expired reset token rejected
    raw_exp = "expired_raw_token_test_123"
    exp_hash = hashlib.sha256(raw_exp.encode()).hexdigest()
    PasswordResetToken.objects.create(
        user=test_user,
        token_hash=exp_hash,
        expires_at=timezone.now() - timedelta(minutes=10),
        is_used=False
    )
    res9 = client.post('/api/auth/reset-password/', data=json.dumps({
        'token': raw_exp,
        'new_password': 'SomeNewPassword123!',
        'confirm_password': 'SomeNewPassword123!'
    }), content_type='application/json')
    assert_test(res9.status_code == 400 and 'expired' in str(res9.json()).lower(), 9, "Expired reset token is rejected")

    # 10. Reused reset token rejected
    raw_used = "used_raw_token_test_456"
    used_hash = hashlib.sha256(raw_used.encode()).hexdigest()
    PasswordResetToken.objects.create(
        user=test_user,
        token_hash=used_hash,
        expires_at=timezone.now() + timedelta(minutes=15),
        is_used=True
    )
    res10 = client.post('/api/auth/reset-password/', data=json.dumps({
        'token': raw_used,
        'new_password': 'AnotherNewPassword123!',
        'confirm_password': 'AnotherNewPassword123!'
    }), content_type='application/json')
    assert_test(res10.status_code == 400, 10, "Already used reset token is rejected")

    # 11. Password confirmation mismatch rejected
    res11 = client.post('/api/auth/change-password/', data=json.dumps({
        'old_password': 'PermanentJasleen2026!',
        'new_password': 'BrandNewPassword123!',
        'confirm_password': 'MismatchPassword999!'
    }), content_type='application/json', HTTP_AUTHORIZATION=f"Bearer {d7c.get('accessToken')}")
    assert_test(res11.status_code == 400 and 'match' in str(res11.json()).lower(), 11, "Password confirmation mismatch rejected")

    # 12. Weak password rejected by Django validators
    res12 = client.post('/api/auth/change-password/', data=json.dumps({
        'old_password': 'PermanentJasleen2026!',
        'new_password': 'password',
        'confirm_password': 'password'
    }), content_type='application/json', HTTP_AUTHORIZATION=f"Bearer {d7c.get('accessToken')}")
    assert_test(res12.status_code == 400 and 'common' in str(res12.json()).lower(), 12, "Weak password rejected by Django password validators")

    # 13. Unauthenticated access to change-password rejected
    res13 = client.post('/api/auth/change-password/', data=json.dumps({
        'old_password': 'PermanentJasleen2026!',
        'new_password': 'SomeValidPassword123!',
        'confirm_password': 'SomeValidPassword123!'
    }), content_type='application/json')
    assert_test(res13.status_code in (401, 403), 13, "Unauthenticated access to change-password rejected")

    # 14. Account enumeration prevention on forgot-password
    res14_unknown = client.post('/api/auth/forgot-password/', data=json.dumps({
        'email': 'completely.fake.user@dailoqa.com'
    }), content_type='application/json')
    assert_test(
        res14_unknown.status_code == 200 and
        res14_unknown.json().get('message') == res8.json().get('message'),
        14,
        "Forgot password response is identical for existent and non-existent accounts"
    )

    # 15. Existing HR login
    res15 = client.post('/api/auth/login/', data=json.dumps({
        'email': 'sarah.hr@company.com',
        'password': 'SarahPassword123!'
    }), content_type='application/json')
    d15 = res15.json()
    assert_test(res15.status_code == 200 and d15.get('user', {}).get('role') == 'HR', 15, "Existing HR login works & identifies HR role")

    # 16. Existing Manager login
    res16 = client.post('/api/auth/login/', data=json.dumps({
        'email': 'marcus.tech@company.com',
        'password': 'MarcusPassword123!'
    }), content_type='application/json')
    d16 = res16.json()
    assert_test(res16.status_code == 200 and d16.get('user', {}).get('role') == 'MANAGER', 16, "Existing Manager login works & identifies MANAGER role")

    # 17. Existing Intern login
    res17 = client.post('/api/auth/login/', data=json.dumps({
        'email': 'alex.dev@company.com',
        'password': 'AlexPassword123!'
    }), content_type='application/json')
    d17 = res17.json()
    assert_test(res17.status_code == 200 and d17.get('user', {}).get('role') == 'INTERN', 17, "Existing Intern login works & identifies INTERN role")

    # 18. Existing Admin login
    res18 = client.post('/api/auth/login/', data=json.dumps({
        'email': 'admin@company.com',
        'password': 'AdminPassword123!'
    }), content_type='application/json')
    d18 = res18.json()
    assert_test(res18.status_code == 200 and d18.get('user', {}).get('role') == 'SUPER_ADMIN', 18, "Existing Admin login works & identifies SUPER_ADMIN role")

    print("\n" + "=" * 75)
    print(f" Summary: {passed}/{total} Passed, {failed}/{total} Failed")
    print("=" * 75 + "\n")

    # Finally restore test user jasleen to initial temporary password for user demo testing
    test_user.set_password("jasleen")
    test_user.password_change_required = True
    test_user.save()
    print("[*] Re-initialized 'jasleen.kaur@dailoqa.com' to temporary passcode 'jasleen' for live browser demo.\n")

if __name__ == '__main__':
    run_all_tests()
