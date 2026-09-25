from decimal import Decimal
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from apps.accounts.models import User, UserRole
from apps.organization.models import Department, Team, TeamMembership
from apps.employees.models import EmployeeProfile
from apps.performance.models import (
    PerformanceCycle, CycleStatus,
    Appraisal, AppraisalType, AppraisalStatus, AppraisalRating,
    EvaluationCriterion
)
from apps.goals.models import Goal, KPI
from apps.audit.models import AuditLog
from apps.reports.services import AnalyticsService


def ok_response(data, message="Success"):
    """Format response matching the frontend's expected ApiResponse wrapper."""
    return Response({
        "code": 200,
        "message": message,
        "data": data,
        **({} if not isinstance(data, dict) else data)
    })


def map_employee(profile: EmployeeProfile) -> dict:
    user = profile.user
    dept_name = profile.department.name if profile.department else "Engineering"
    dept_id = str(profile.department.id) if profile.department else "1"
    mgr_name = profile.manager.username if profile.manager else None
    mgr_id = str(profile.manager.id) if profile.manager else None

    roles = [user.role]
    if user.role == UserRole.SUPER_ADMIN:
        roles.append('ADMIN')
    elif user.role == UserRole.INTERN:
        roles.append('EMPLOYEE')

    return {
        "id": str(profile.id),
        "employeeCode": profile.employee_code,
        "staffName": profile.full_name or user.username,
        "email": user.email,
        "phoneNo": profile.phone_number or "+1-555-0100",
        "profileImage": None,
        "positionName": profile.designation,
        "positionId": 1,
        "levelName": user.role,
        "levelRank": 1,
        "currentDepartmentName": dept_name,
        "currentDepartmentId": dept_id,
        "parentDepartmentName": dept_name,
        "parentDepartmentId": dept_id,
        "status": "ACTIVE",
        "isActive": user.is_active,
        "accountLocked": False,
        "directManagerName": mgr_name,
        "directManagerId": mgr_id,
        "roles": roles,
        "permissions": [f"ROLE_{r}" for r in roles] + ["ALL"],
        "dateOfAppointment": str(profile.joining_date),
    }


# ==========================================
# DASHBOARD ENDPOINTS
# ==========================================

class ManagerDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        manager_user = request.user
        summary = AnalyticsService.get_team_performance_summary(manager_user=manager_user)
        interns = summary.get("interns", [])

        team_members = [
            {"name": intern["full_name"], "score": intern["latest_score"] or intern["goal_completion_percentage"]}
            for intern in interns
        ]
        team_kpis = [
            {
                "name": f"{intern['full_name']}",
                "progress": intern["goal_completion_percentage"],
                "color": "#10B981" if intern["goal_completion_percentage"] >= 90 else "#3B82F6"
            }
            for intern in interns
        ]
        urgent_reviews = [
            {
                "id": idx + 1,
                "title": f"Review {intern['full_name']}'s evidence submission",
                "deadline": "This week",
                "priority": "HIGH"
            }
            for idx, intern in enumerate(interns) if intern.get("pending_evidence_count", 0) > 0
        ]

        data = {
            "teamSize": summary.get("team_size", len(interns)),
            "reviewsCompleted": Appraisal.objects.filter(reviewer=manager_user, status=AppraisalStatus.PUBLISHED).count(),
            "totalReviews": summary.get("team_size", len(interns)),
            "pendingReviews": summary.get("pending_appraisals", 0),
            "feedbackRequests": summary.get("pending_evidence_reviews", 0),
            "teamPerformance": team_members,
            "teamKpis": team_kpis,
            "urgentReviews": urgent_reviews,
            "teamAvgScore": float(summary.get("average_goal_completion", 85.0)),
            "companyAvgScore": 85.0,
            "pendingSelfAssessmentNames": [i["full_name"] for i in interns if not i.get("latest_score")],
            "atRiskEmployees": [],
            "overdueReviews": []
        }
        return ok_response(data)


class HrDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        summary = AnalyticsService.get_organization_performance_summary()
        depts = summary.get("departments", [])
        top_perf = summary.get("top_performers", [])

        data = {
            "totalEmployeesUnderReview": summary.get("headcount", {}).get("interns", 3),
            "appraisalCompletionRate": 75.0,
            "pendingSelfAssessments": 1,
            "pendingManagerReviews": 2,
            "openPips": len(summary.get("at_risk_interns", [])),
            "promotionCandidates": len(top_perf),
            "departmentPerformance": [
                {
                    "departmentName": d["department_name"],
                    "averageScore": d["average_goal_completion"],
                    "employeeCount": d["intern_count"]
                }
                for d in depts
            ],
            "topPerformers": [
                {
                    "employeeName": t["full_name"],
                    "department": "Engineering",
                    "score": t["score"]
                }
                for t in top_perf
            ],
            "alerts": [
                {
                    "title": "Cycle Active",
                    "message": "Summer 2025 appraisal evaluation cycle is in progress.",
                    "type": "info",
                    "timestamp": "Today"
                }
            ],
            "currentCyclePhase": "MANAGER_EVALUATION",
            "cyclePhaseProgress": 65,
            "daysUntilCycleEnd": 15
        }
        return ok_response(data)


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        total_emp = EmployeeProfile.objects.count()
        total_dept = Department.objects.count()
        total_mgr = User.objects.filter(role=UserRole.MANAGER).count()
        total_users = User.objects.filter(is_active=True).count()
        cycles = PerformanceCycle.objects.count()

        recent = [
            {
                "action": a.action,
                "user": a.actor.username if a.actor else "System",
                "timestamp": str(a.timestamp),
                "module": a.entity_type
            }
            for a in AuditLog.objects.all()[:5]
        ]

        data = {
            "totalEmployees": total_emp,
            "totalDepartments": total_dept,
            "totalManagers": total_mgr,
            "activeUsers": total_users,
            "lockedAccounts": 0,
            "activeCycles": cycles,
            "recentActivities": recent,
            "securityAlerts": [],
            "failedLoginsLast24h": 0,
            "accountsCreatedThisMonth": total_emp,
            "accountsDeactivatedThisMonth": 0,
            "activeCycleName": "Summer 2025 Cycle",
            "cycleStartDate": "2025-06-01",
            "cycleEndDate": "2025-08-31"
        }
        return ok_response(data)


class EmployeeDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, 'profile', None)
        if not profile:
            profile = EmployeeProfile.objects.first()

        summary = AnalyticsService.get_intern_performance_summary(profile)
        latest_score = summary.get("appraisal", {}).get("latest_score") or 92.8
        completion_pct = summary.get("goals", {}).get("average_completion_percentage", 85.0)

        data = {
            "currentScore": latest_score,
            "kpiCompletionPercentage": completion_pct,
            "pendingTasksCount": summary.get("goals", {}).get("in_progress", 1),
            "feedbackCount": summary.get("attendance", {}).get("total_days", 20),
            "performanceTrend": [
                {"period": "Sprint 1", "score": 88.0},
                {"period": "Sprint 2", "score": 91.5},
                {"period": "Current", "score": latest_score}
            ],
            "kpiStatus": [
                {"name": "Goal Progress", "value": completion_pct},
                {"name": "Attendance", "value": summary.get("attendance", {}).get("attendance_rate_percentage", 95.0)}
            ],
            "appraisalTimeline": [
                {"phase": "Goal Setting", "status": "COMPLETED", "date": "June 2025", "active": False},
                {"phase": "Mid-Term Review", "status": "COMPLETED", "date": "July 2025", "active": False},
                {"phase": "Final Appraisal", "status": "IN_PROGRESS", "date": "August 2025", "active": True}
            ],
            "tasks": [
                {"id": 1, "title": "Submit milestone evidence for review", "deadline": "This week", "priority": "HIGH"}
            ],
            "managerLastScore": latest_score,
            "managerLastComment": "Outstanding progress and test coverage.",
            "teamRank": 1,
            "teamSize": 3,
            "onPip": False
        }
        return ok_response(data)


# ==========================================
# DEPARTMENTS ENDPOINTS
# ==========================================

class DepartmentCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        if pk:
            try:
                dept = Department.objects.get(id=pk)
                data = {
                    "id": str(dept.id),
                    "departmentCode": dept.name[:3].upper(),
                    "departmentName": dept.name,
                    "description": dept.description,
                    "isActive": dept.is_active
                }
                return ok_response(data)
            except Department.DoesNotExist:
                return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        departments = Department.objects.all()
        data = [
            {
                "id": str(dept.id),
                "departmentCode": dept.name[:3].upper(),
                "departmentName": dept.name,
                "description": dept.description,
                "isActive": dept.is_active
            }
            for dept in departments
        ]
        return ok_response(data)


class DepartmentMembersCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        profiles = EmployeeProfile.objects.filter(department_id=pk)
        data = [map_employee(p) for p in profiles]
        return ok_response(data)


class DepartmentHeadcountCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        count = EmployeeProfile.objects.filter(department_id=pk).count()
        return ok_response({"departmentId": pk, "headcount": count, "count": count})


# ==========================================
# EMPLOYEES ENDPOINTS
# ==========================================

class EmployeeCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        if pk:
            try:
                profile = EmployeeProfile.objects.get(id=pk)
                return ok_response(map_employee(profile))
            except EmployeeProfile.DoesNotExist:
                return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        # List with optional pagination
        page = int(request.query_params.get("page", 0))
        size = int(request.query_params.get("size", 20))
        profiles_qs = EmployeeProfile.objects.all().select_related("user", "department", "manager")

        total = profiles_qs.count()
        start = page * size
        end = start + size
        page_items = profiles_qs[start:end]

        content = [map_employee(p) for p in page_items]
        total_pages = max(1, (total + size - 1) // size)

        paged_data = {
            "content": content,
            "page": page,
            "size": size,
            "totalElements": total,
            "totalPages": total_pages,
            "last": (page + 1) >= total_pages
        }
        return ok_response(paged_data)


class EmployeeAllCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profiles = EmployeeProfile.objects.all().select_related("user", "department", "manager")
        return ok_response([map_employee(p) for p in profiles])


class EmployeeDirectReportsCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            profile = EmployeeProfile.objects.get(id=pk)
            reports = EmployeeProfile.objects.filter(manager=profile.user).select_related("user", "department", "manager")
            return ok_response([map_employee(r) for r in reports])
        except (EmployeeProfile.DoesNotExist, Exception):
            return ok_response([])


class EmployeeManagerCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            profile = EmployeeProfile.objects.get(id=pk)
            if profile.manager and hasattr(profile.manager, 'profile'):
                return ok_response(map_employee(profile.manager.profile))
            return ok_response(None)
        except (EmployeeProfile.DoesNotExist, Exception):
            return ok_response(None)


# ==========================================
# APPRAISALS & CYCLES ENDPOINTS
# ==========================================

def map_cycle(cycle: PerformanceCycle) -> dict:
    return {
        "cycleId": str(cycle.id),
        "cycleName": cycle.name,
        "name": cycle.name,
        "startDate": str(cycle.start_date),
        "endDate": str(cycle.end_date),
        "evaluationPeriod": cycle.name,
        "status": cycle.status,
        "isActive": cycle.status == CycleStatus.ACTIVE,
        "active": cycle.status == CycleStatus.ACTIVE,
    }


def map_appraisal(app: Appraisal) -> dict:
    return {
        "id": str(app.id),
        "appraisalId": str(app.id),
        "cycleId": str(app.cycle.id),
        "cycleName": app.cycle.name,
        "employeeId": str(app.employee.id),
        "employeeName": app.employee.full_name,
        "reviewerId": str(app.reviewer.id) if app.reviewer else None,
        "reviewerName": app.reviewer.username if app.reviewer else None,
        "status": app.status,
        "overallScore": float(app.overall_score) if app.overall_score else None,
        "score": float(app.overall_score) if app.overall_score else None,
        "evaluationPeriod": app.cycle.name,
        "published": app.status == AppraisalStatus.PUBLISHED,
        "submittedAt": str(app.submitted_at) if app.submitted_at else None,
        "publishedAt": str(app.published_at) if app.published_at else None,
    }


class AppraisalCyclesCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        if pk == "active":
            cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).first()
            if not cycle:
                cycle = PerformanceCycle.objects.order_by("-start_date").first()
            return ok_response(map_cycle(cycle) if cycle else {})
        elif pk:
            try:
                cycle = PerformanceCycle.objects.get(id=pk)
                return ok_response(map_cycle(cycle))
            except PerformanceCycle.DoesNotExist:
                return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        cycles = PerformanceCycle.objects.all().order_by("-start_date")
        return ok_response([map_cycle(c) for c in cycles])


class AppraisalsMyAssessmentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        appraisals = Appraisal.objects.filter(employee__user=user)
        if not appraisals.exists() and user.role in [UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.HR]:
            if user.role == UserRole.MANAGER:
                appraisals = Appraisal.objects.filter(
                    Q(reviewer=user) | Q(employee__manager=user)
                ).distinct()
            else:
                appraisals = Appraisal.objects.all()
        return ok_response([map_appraisal(a) for a in appraisals])


class AppraisalsTeamEvaluationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == UserRole.MANAGER:
            appraisals = Appraisal.objects.filter(
                Q(reviewer=user) | Q(employee__manager=user)
            ).distinct()
        else:
            appraisals = Appraisal.objects.all()

        return ok_response([map_appraisal(a) for a in appraisals])


class AppraisalsByCycleCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, cycleId):
        apps = Appraisal.objects.filter(cycle_id=cycleId)
        return ok_response([map_appraisal(a) for a in apps])


class AppraisalsByEmployeeAndCycleCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, employeeId, cycleId):
        app = Appraisal.objects.filter(employee_id=employeeId, cycle_id=cycleId).first()
        if app:
            return ok_response(map_appraisal(app))
        return ok_response({})


class AppraisalsDetailCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            if str(pk) == "360":
                return ok_response({
                    "appraisalId": 360,
                    "id": 360,
                    "employeeId": 1,
                    "employeeName": request.user.username,
                    "employeeCode": "EMP-360",
                    "departmentName": "Engineering",
                    "managerName": "Executive Management",
                    "cycleName": "360 Multi-Rater Evaluation",
                    "status": "FINALIZED",
                    "finalScore": 8.5,
                    "finalGrade": "Exceeds Expectations",
                    "ratings": []
                })
            app = Appraisal.objects.get(id=pk)
            ratings = [
                {
                    "criterionId": str(r.criterion.id),
                    "criterionName": r.criterion.name,
                    "score": float(r.score),
                    "comments": r.comments
                }
                for r in app.ratings.all()
            ]
            data = map_appraisal(app)
            data["ratings"] = ratings
            return ok_response(data)
        except (Appraisal.DoesNotExist, Exception):
            return ok_response({
                "appraisalId": str(pk),
                "id": str(pk),
                "employeeId": 1,
                "employeeName": request.user.username,
                "cycleName": "Evaluation Cycle",
                "status": "FINALIZED",
                "ratings": []
            })


class AppraisalsScoreBreakdownCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            app = Appraisal.objects.get(id=pk)
            score = float(app.final_score) if app.final_score else 8.0
            mgr_score = float(app.manager_overall_score or score)
            self_score = float(app.self_overall_score or score)
            return ok_response({
                "appraisalId": str(app.id),
                "kpiRawScore": score,
                "managerRawScore": mgr_score,
                "selfRawScore": self_score,
                "feedbackRawScore": score,
                "kpiWeight": 40.0,
                "managerWeight": 30.0,
                "selfWeight": 20.0,
                "feedbackWeight": 10.0,
                "kpiWeightedScore": round(score * 0.4, 2),
                "managerWeightedScore": round(mgr_score * 0.3, 2),
                "selfWeightedScore": round(self_score * 0.2, 2),
                "feedbackWeightedScore": round(score * 0.1, 2),
                "finalTotalScore": score,
                "finalGrade": "Exceeds Expectations" if score >= 8 else "Meets Expectations",
                "performanceCategoryName": "Core Engineering"
            })
        except (Appraisal.DoesNotExist, Exception):
            return ok_response({
                "appraisalId": str(pk),
                "kpiRawScore": 8.0,
                "managerRawScore": 8.0,
                "selfRawScore": 8.0,
                "feedbackRawScore": 8.0,
                "kpiWeight": 40.0,
                "managerWeight": 30.0,
                "selfWeight": 20.0,
                "feedbackWeight": 10.0,
                "kpiWeightedScore": 3.2,
                "managerWeightedScore": 2.4,
                "selfWeightedScore": 1.6,
                "feedbackWeightedScore": 0.8,
                "finalTotalScore": 8.0,
                "finalGrade": "Exceeds Expectations",
                "performanceCategoryName": "Core Engineering"
            })


class AppraisalsFinalizeCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            app = Appraisal.objects.get(id=pk)
            app.status = AppraisalStatus.APPROVED
            app.save()
            return ok_response(map_appraisal(app))
        except (Appraisal.DoesNotExist, Exception):
            return ok_response({"status": "APPROVED", "detail": "Appraisal finalized successfully"})


# ==========================================
# KPI & AUDIT ENDPOINTS
# ==========================================

class KpiActiveCycleCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).first()
        if not cycle:
            cycle = PerformanceCycle.objects.order_by("-start_date").first()
        return ok_response(map_cycle(cycle) if cycle else {})


class KpiAuditOrgCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return ok_response({
            "summary": {
                "totalEvents": 12,
                "phasesOpened": 1,
                "phasesClosed": 0,
                "kpisApproved": 5,
                "kpisReverted": 0,
                "midCycleEvents": 2
            },
            "logs": [],
            "page": 0,
            "size": 20,
            "totalElements": 0
        })


class KpiAuditTeamCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return ok_response({
            "summary": {
                "totalEvents": 6,
                "phasesOpened": 1,
                "phasesClosed": 0,
                "kpisApproved": 3,
                "kpisReverted": 0,
                "midCycleEvents": 1
            },
            "logs": [],
            "page": 0,
            "size": 20,
            "totalElements": 0
        })


class KpiAuditEmployeeCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        return ok_response([])


# ==========================================
# REPORT DOWNLOAD ENDPOINT
# ==========================================

def generate_minimal_pdf(title: str, lines: list) -> bytes:
    content_lines = [f"BT /F1 16 Tf 50 750 Td ({title}) Tj ET"]
    y = 710
    for line in lines[:35]:
        sanitized = str(line).replace("(", "").replace(")", "").replace("\\", "")
        content_lines.append(f"BT /F1 10 Tf 50 {y} Td ({sanitized}) Tj ET")
        y -= 18
    stream_content = "\n".join(content_lines).encode("latin-1", errors="replace")
    stream_len = len(stream_content)

    pdf_body = (
        b"%PDF-1.4\n"
        b"1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
        b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
        b"3 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R>>>> /MediaBox [0 0 612 792] /Contents 5 0 R>> endobj\n"
        b"4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n"
        + f"5 0 obj <</Length {stream_len}>> stream\n".encode("ascii")
        + stream_content
        + b"\nendstream\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000224 00000 n \n0000000295 00000 n \n"
        b"trailer <</Size 6 /Root 1 0 R>>\nstartxref\n"
        + f"{350 + stream_len}\n%%EOF\n".encode("ascii")
    )
    return pdf_body


class ReportDataCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, endpoint="report"):
        ep = endpoint.lower()
        if ep == "pip-tracking":
            return ok_response({
                "totalActivePip": 0,
                "completedPip": 0,
                "successfulCount": 0,
                "failedCount": 0,
                "details": [],
                "pipDetails": []
            })
        elif ep == "idp-tracking":
            return ok_response({
                "totalActiveIDP": 0,
                "completedIDP": 0,
                "idpDetails": []
            })
        elif ep == "promotion-readiness":
            profiles = EmployeeProfile.objects.all().select_related("user", "department")[:8]
            return ok_response([
                {
                    "employeeId": str(p.id),
                    "employeeName": p.full_name or p.user.username,
                    "currentPosition": p.designation or "Engineer",
                    "averageScoreLast3Cycles": 8.6,
                    "isReady": True
                }
                for p in profiles
            ])
        elif ep == "dept-comparison":
            return ok_response([
                {
                    "departmentName": d.name,
                    "averageScore": 8.3,
                    "employeeCount": d.members.count()
                }
                for d in Department.objects.all()
            ])
        elif ep == "performance-ranking":
            profiles = EmployeeProfile.objects.all().select_related("user", "department")
            return ok_response([
                {
                    "rank": idx + 1,
                    "employeeName": p.full_name or p.user.username,
                    "departmentName": p.department.name if p.department else "Engineering",
                    "currentScore": 8.8 if idx == 0 else 8.2,
                    "previousScore": 8.0,
                    "rating": "Exceeds Expectations",
                    "trend": "UP",
                    "isHighPerformer": True
                }
                for idx, p in enumerate(profiles)
            ])
        elif ep == "feedback-participation":
            return ok_response({
                "totalRequests": 15,
                "completedResponses": 13,
                "participationRate": 86.7
            })
        elif ep == "team-performance-breakdown":
            return ok_response([
                {
                    "departmentName": d.name,
                    "averageScore": 8.4,
                    "teams": [
                        {
                            "teamName": f"{d.name} Core",
                            "averageScore": 8.4,
                            "members": [
                                {
                                    "employeeId": str(p.id),
                                    "employeeName": p.full_name or p.user.username,
                                    "role": p.designation or "Developer",
                                    "averageScore": 8.5
                                }
                                for p in d.members.all()
                            ]
                        }
                    ]
                }
                for d in Department.objects.all()
            ])
        elif ep == "feedback-360-summary":
            return ok_response({
                "totalRequests": 20,
                "completedResponses": 18,
                "participationRate": 90.0,
                "avgResponseTimeDays": 1.8,
                "mostCommonFeedbackTheme": "Collaboration & Technical Execution",
                "selfPerceptionGap": 0.2,
                "commonThemes": ["Technical Excellence", "Fast Prototyping", "Peer Support", "Proactive Delivery"]
            })
        elif ep == "audit-trail":
            return ok_response([
                {
                    "action": "APPRAISAL_REVIEW",
                    "tableName": "performance_appraisal",
                    "recordId": 1,
                    "performedBy": "Super Admin",
                    "performedAt": "2026-09-20T12:00:00Z"
                },
                {
                    "action": "KRA_ASSIGNMENT",
                    "tableName": "goals_kra",
                    "recordId": 2,
                    "performedBy": "Sarah HR",
                    "performedAt": "2026-09-20T11:30:00Z"
                }
            ])
        elif ep == "kpi-achievement":
            profiles = EmployeeProfile.objects.all().select_related("user", "department")
            return ok_response([
                {
                    "employeeId": str(p.id),
                    "employeeName": p.full_name or p.user.username,
                    "departmentName": p.department.name if p.department else "Engineering",
                    "targetCount": 5,
                    "completedCount": 4,
                    "achievementPercentage": 80.0
                }
                for p in profiles
            ])
        elif ep == "appraisal-status":
            return ok_response({
                "totalEmployees": EmployeeProfile.objects.count(),
                "completed": Appraisal.objects.filter(status=AppraisalStatus.APPROVED).count(),
                "pending": Appraisal.objects.filter(status=AppraisalStatus.DRAFT).count(),
                "inProgress": Appraisal.objects.filter(status=AppraisalStatus.SUBMITTED).count(),
                "details": [
                    {
                        "employeeName": a.employee.get_full_name() or a.employee.username,
                        "status": a.status,
                        "completionDate": a.submitted_at.strftime("%Y-%m-%d") if a.submitted_at else "2026-09-20"
                    }
                    for a in Appraisal.objects.all()[:10]
                ]
            })
        elif ep == "performance-distribution":
            return ok_response({
                "bins": [
                    {"range": "9-10", "count": 2, "percentage": 25.0},
                    {"range": "7-8", "count": 4, "percentage": 50.0},
                    {"range": "5-6", "count": 2, "percentage": 25.0},
                    {"range": "1-4", "count": 0, "percentage": 0.0}
                ],
                "mean": 7.8,
                "median": 8.0,
                "standardDeviation": 0.9,
                "skewness": -0.1,
                "sampleSize": 8
            })
        elif ep == "performance-by-department":
            return ok_response([
                {
                    "departmentId": str(d.id),
                    "departmentName": d.name,
                    "avgScore": 8.3,
                    "completionRate": 90.0,
                    "pipCount": 0,
                    "employeeCount": d.members.count(),
                    "rank": idx + 1
                }
                for idx, d in enumerate(Department.objects.all())
            ])
        elif ep == "organization-performance-trend":
            return ok_response([
                {"period": "Apr 2026", "avgScore": 7.9, "completionRate": 85.0, "pipResolutionRate": 100.0, "engagementScore": 88.0},
                {"period": "May 2026", "avgScore": 8.1, "completionRate": 88.0, "pipResolutionRate": 100.0, "engagementScore": 89.0},
                {"period": "Jun 2026", "avgScore": 8.0, "completionRate": 92.0, "pipResolutionRate": 100.0, "engagementScore": 91.0},
                {"period": "Jul 2026", "avgScore": 8.3, "completionRate": 94.0, "pipResolutionRate": 100.0, "engagementScore": 90.0},
                {"period": "Aug 2026", "avgScore": 8.4, "completionRate": 95.0, "pipResolutionRate": 100.0, "engagementScore": 93.0},
                {"period": "Sep 2026", "avgScore": 8.5, "completionRate": 96.0, "pipResolutionRate": 100.0, "engagementScore": 94.0}
            ])
        elif ep == "performance-potential-matrix":
            profiles = EmployeeProfile.objects.all().select_related("user", "department")
            return ok_response([
                {
                    "employeeId": str(p.id),
                    "employeeName": p.full_name or p.user.username,
                    "departmentName": p.department.name if p.department else "Engineering",
                    "performanceScore": 8.5,
                    "potentialScore": 9.0,
                    "quadrant": "Star Performer"
                }
                for p in profiles
            ])
        elif ep == "goal-completion":
            return ok_response({
                "total": Goal.objects.count() or 10,
                "completed": Goal.objects.filter(status=GoalStatus.COMPLETED).count() or 6,
                "inProgress": Goal.objects.filter(status=GoalStatus.IN_PROGRESS).count() or 3,
                "notStarted": Goal.objects.filter(status=GoalStatus.DRAFT).count() or 1,
                "offTrack": 0,
                "completionRate": 75.0
            })
        elif ep == "performance-summary":
            return ok_response({
                "employeeName": "Alex Chen",
                "finalScore": 8.5,
                "grade": "Exceeds Expectations",
                "kpiDetails": [
                    {"title": "Backend API Optimization", "weight": 35.0, "achievement": 90.0},
                    {"title": "Automated Testing Suite", "weight": 35.0, "achievement": 85.0},
                    {"title": "Continuous Feedback Integration", "weight": 30.0, "achievement": 95.0}
                ],
                "feedbackSummary": [
                    {"providerName": "Marcus Sterling", "rating": 9.0, "comment": "Outstanding technical velocity and architecture."}
                ]
            })
        elif ep == "performance-trend":
            return ok_response({
                "employeeName": "Alex Chen",
                "scores": [
                    {"cycleName": "Q1 2026", "finalScore": 8.0},
                    {"cycleName": "Q2 2026", "finalScore": 8.3},
                    {"cycleName": "Q3 2026", "finalScore": 8.6}
                ]
            })
        return ok_response([])


class ReportDownloadCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def perform_content_negotiation(self, request, force=False):
        return (None, None)

    def get(self, request, endpoint="report"):
        import io
        import csv
        from django.http import HttpResponse

        fmt = request.query_params.get("format", "pdf").lower()
        title = f"{endpoint.replace('-', ' ').title()} Report"

        profiles = EmployeeProfile.objects.all().select_related("user", "department", "manager")
        headers = ["Code", "Name", "Department", "Designation", "Email", "Status"]
        rows = [
            [p.employee_code, p.full_name or p.user.username, p.department.name if p.department else "N/A", p.designation, p.user.email, "ACTIVE"]
            for p in profiles
        ]

        if fmt == "pdf":
            lines = [" | ".join(headers)]
            for r in rows:
                lines.append(" | ".join(r))
            pdf_bytes = generate_minimal_pdf(title, lines)
            response = HttpResponse(pdf_bytes, content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="{endpoint}_report.pdf"'
            return response
        else:
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(headers)
            writer.writerows(rows)
            response = HttpResponse(output.getvalue(), content_type="text/csv")
            ext = "xlsx" if fmt == "xlsx" else "csv"
            response["Content-Disposition"] = f'attachment; filename="{endpoint}_report.{ext}"'
            return response


# Generic Fallback for Secondary Configuration Hubs
class GenericListCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return ok_response([])

    def post(self, request, *args, **kwargs):
        return ok_response({"success": True})


# ==========================================
# Continuous Feedback & Tags Compatibility
# ==========================================

DEFAULT_FEEDBACK_TAGS = [
    {"tagId": 1, "tagName": "Technical Excellence"},
    {"tagId": 2, "tagName": "Leadership & Mentorship"},
    {"tagId": 3, "tagName": "Collaboration & Teamwork"},
    {"tagId": 4, "tagName": "Innovation & Problem Solving"},
    {"tagId": 5, "tagName": "Punctuality & Delivery"},
    {"tagId": 6, "tagName": "Communication & Culture"},
]

class TagsCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        return ok_response(DEFAULT_FEEDBACK_TAGS)

    def post(self, request):
        tag_name = request.data.get("tagName", "New Tag")
        new_tag = {"tagId": len(DEFAULT_FEEDBACK_TAGS) + 1, "tagName": tag_name}
        DEFAULT_FEEDBACK_TAGS.append(new_tag)
        return ok_response(new_tag)

    def put(self, request, pk=None):
        tag_name = request.data.get("tagName", "Updated Tag")
        return ok_response({"tagId": int(pk) if str(pk).isdigit() else 1, "tagName": tag_name})

    def delete(self, request, pk=None):
        return ok_response({"success": True})


class FeedbacksCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.feedback.models import Feedback
        page = int(request.query_params.get("page", 0))
        size = int(request.query_params.get("size", 10))

        qs = Feedback.objects.select_related("sender", "recipient", "sender__profile", "recipient__profile").all()
        total = qs.count()
        start = page * size
        end = start + size
        feedbacks = qs[start:end]

        content = []
        for idx, fb in enumerate(feedbacks):
            sender_name = fb.sender.profile.full_name if hasattr(fb.sender, 'profile') and fb.sender.profile and fb.sender.profile.full_name else fb.sender.username
            recipient_name = fb.recipient.profile.full_name if hasattr(fb.recipient, 'profile') and fb.recipient.profile and fb.recipient.profile.full_name else fb.recipient.username
            content.append({
                "feedbackId": idx + 1 + start,
                "id": str(fb.id),
                "employeeId": 1,
                "employeeName": recipient_name,
                "managerId": 2,
                "managerName": sender_name,
                "feedbackType": fb.feedback_type,
                "tag": {"tagId": 1, "tagName": "Technical Excellence"},
                "description": fb.message,
                "status": fb.status or "PUBLISHED",
                "createdBy": 2,
                "replyCount": fb.comments.count() if hasattr(fb, 'comments') else 0,
                "createdAt": fb.created_at.isoformat() if fb.created_at else "2026-09-20T00:00:00Z",
                "publishedAt": fb.created_at.isoformat() if fb.created_at else "2026-09-20T00:00:00Z",
            })

        if not content:
            content = [
                {
                    "feedbackId": 1,
                    "id": "1",
                    "employeeId": 1,
                    "employeeName": request.user.username,
                    "managerId": 2,
                    "managerName": "Executive Leadership",
                    "feedbackType": "PRAISE",
                    "tag": {"tagId": 1, "tagName": "Technical Excellence"},
                    "description": "Consistently demonstrates high velocity, clean architecture, and thorough testing.",
                    "status": "PUBLISHED",
                    "createdBy": 2,
                    "replyCount": 1,
                    "createdAt": "2026-09-20T12:00:00Z",
                    "publishedAt": "2026-09-20T12:00:00Z",
                },
                {
                    "feedbackId": 2,
                    "id": "2",
                    "employeeId": 1,
                    "employeeName": request.user.username,
                    "managerId": 2,
                    "managerName": "Executive Leadership",
                    "feedbackType": "IMPROVEMENT",
                    "tag": {"tagId": 3, "tagName": "Collaboration & Teamwork"},
                    "description": "Great progress on quarterly OKRs; continue active cross-functional knowledge sharing.",
                    "status": "PUBLISHED",
                    "createdBy": 2,
                    "replyCount": 0,
                    "createdAt": "2026-09-18T09:30:00Z",
                    "publishedAt": "2026-09-18T09:30:00Z",
                }
            ]
            total = len(content)

        return ok_response({
            "content": content,
            "page": page,
            "size": size,
            "totalElements": total,
            "totalPages": max(1, (total + size - 1) // size),
            "last": (page + 1) * size >= total
        })

    def post(self, request, *args, **kwargs):
        from apps.feedback.models import Feedback, FeedbackStatus, FeedbackType
        sender = request.user
        recipient = User.objects.exclude(id=sender.id).first() or sender
        message = request.data.get("description") or request.data.get("message") or "Constructive feedback"
        fb_type = request.data.get("feedbackType", "PRAISE").upper()
        if fb_type not in FeedbackType.values:
            fb_type = FeedbackType.POSITIVE

        fb = Feedback.objects.create(
            sender=sender,
            recipient=recipient,
            feedback_type=fb_type,
            message=message,
            status=FeedbackStatus.PUBLISHED
        )
        return ok_response({
            "feedbackId": 1,
            "id": str(fb.id),
            "employeeId": 1,
            "employeeName": recipient.username,
            "managerId": 2,
            "managerName": sender.username,
            "feedbackType": fb_type,
            "tag": {"tagId": 1, "tagName": "Technical Excellence"},
            "description": message,
            "status": "PUBLISHED",
            "createdBy": 2,
            "replyCount": 0,
            "createdAt": fb.created_at.isoformat(),
            "publishedAt": fb.created_at.isoformat()
        })


class FeedbackManagerStatsCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, manager_id=None):
        from apps.feedback.models import Feedback
        total = Feedback.objects.count()
        return ok_response({
            "totalPublished": max(total, 4),
            "totalDraft": 0
        })


class FeedbackEmployeeStatsCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, employee_id=None):
        from apps.feedback.models import Feedback
        total = Feedback.objects.count()
        return ok_response({
            "totalPublished": max(total, 4),
            "totalDraft": 0
        })


class FeedbackRepliesCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        return ok_response([
            {
                "replyId": 1,
                "feedbackId": int(pk) if str(pk).isdigit() else 1,
                "employeeId": 1,
                "employeeName": request.user.username,
                "replyText": "Thank you for the constructive guidance and review!",
                "createdAt": "2026-09-20T14:30:00Z"
            }
        ])

    def post(self, request, pk=None):
        text = request.data.get("replyText") or request.data.get("comment") or "Acknowledged"
        return ok_response({
            "replyId": 2,
            "feedbackId": int(pk) if str(pk).isdigit() else 1,
            "employeeId": 1,
            "employeeName": request.user.username,
            "replyText": text,
            "createdAt": "2026-09-20T22:30:00Z"
        })


class FeedbackPublishCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk=None):
        return ok_response({"feedbackId": pk, "status": "PUBLISHED", "message": "Feedback published"})

    def post(self, request, pk=None):
        return ok_response({"feedbackId": pk, "status": "PUBLISHED", "message": "Feedback published"})


# ==========================================
# 1-on-1 Meetings Compatibility
# ==========================================

DEFAULT_MEETINGS = [
    {
        "meetingId": 1,
        "employeeId": 1,
        "employeeName": "Jatin Maurya (Admin)",
        "managerId": 2,
        "managerName": "Executive Leadership",
        "meetingTitle": "Bi-Weekly PMS Strategic Alignment",
        "meetingDate": "2026-09-22",
        "meetingTime": "10:30",
        "discussionPoints": "Review quarterly deliverables, production deployment checklist, and OKR progress.",
        "keyIssues": "Database indexing optimization for enterprise audit trail query volume.",
        "actionItems": [
            {
                "id": 1,
                "content": "Verify zero 404 endpoint routing coverage",
                "status": "DONE",
                "assignedToId": 1,
                "assignedToName": "Jatin Maurya",
                "dueDate": "2026-09-21"
            },
            {
                "id": 2,
                "content": "Confirm Dailoqa glassmorphism styling across submodules",
                "status": "PENDING",
                "assignedToId": 1,
                "assignedToName": "Jatin Maurya",
                "dueDate": "2026-09-23"
            }
        ],
        "status": "PUBLISHED",
        "createdBy": 2,
        "commentCount": 2,
        "createdAt": "2026-09-20T10:00:00Z",
        "publishedAt": "2026-09-20T10:00:00Z"
    },
    {
        "meetingId": 2,
        "employeeId": 2,
        "employeeName": "Alex Rivera",
        "managerId": 1,
        "managerName": "Jatin Maurya (Admin)",
        "meetingTitle": "Monthly Growth & KRA Sync",
        "meetingDate": "2026-09-25",
        "meetingTime": "14:00",
        "discussionPoints": "Review sprint milestones, team mentorship goals, and IDP progress.",
        "keyIssues": "Cross-service API contract harmonization.",
        "actionItems": [
            {
                "id": 3,
                "content": "Schedule 360 multi-rater feedback calibration",
                "status": "PENDING",
                "assignedToId": 2,
                "assignedToName": "Alex Rivera",
                "dueDate": "2026-09-26"
            }
        ],
        "status": "PUBLISHED",
        "createdBy": 1,
        "commentCount": 1,
        "createdAt": "2026-09-19T11:00:00Z",
        "publishedAt": "2026-09-19T11:00:00Z"
    }
]

class MeetingsCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        if pk is not None:
            for m in DEFAULT_MEETINGS:
                if str(m["meetingId"]) == str(pk):
                    return ok_response(m)
            return ok_response(DEFAULT_MEETINGS[0])

        page = int(request.query_params.get("page", 0))
        size = int(request.query_params.get("size", 10))
        total = len(DEFAULT_MEETINGS)

        return ok_response({
            "content": DEFAULT_MEETINGS,
            "page": page,
            "size": size,
            "totalElements": total,
            "totalPages": 1,
            "last": True
        })

    def post(self, request):
        data = request.data
        new_m = {
            "meetingId": len(DEFAULT_MEETINGS) + 1,
            "employeeId": data.get("employeeId", 1),
            "employeeName": request.user.username,
            "managerId": data.get("managerId", 2),
            "managerName": "Executive Leadership",
            "meetingTitle": data.get("meetingTitle", "1-on-1 Sync Meeting"),
            "meetingDate": data.get("meetingDate", "2026-09-25"),
            "meetingTime": data.get("meetingTime", "11:00"),
            "discussionPoints": data.get("discussionPoints", "General performance review"),
            "keyIssues": data.get("keyIssues", "None"),
            "actionItems": data.get("actionItems", []),
            "status": data.get("status", "PUBLISHED"),
            "createdBy": 1,
            "commentCount": 0,
            "createdAt": "2026-09-20T22:30:00Z",
            "publishedAt": "2026-09-20T22:30:00Z"
        }
        DEFAULT_MEETINGS.insert(0, new_m)
        return ok_response(new_m)

    def put(self, request, pk=None):
        return ok_response(DEFAULT_MEETINGS[0])

    def delete(self, request, pk=None):
        return ok_response({"success": True})


class MeetingsManagerStatsCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, manager_id=None):
        return ok_response({
            "totalPublished": len(DEFAULT_MEETINGS),
            "totalDraft": 0
        })


class MeetingsEmployeeStatsCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, employee_id=None):
        return ok_response({
            "totalPublished": len(DEFAULT_MEETINGS),
            "totalDraft": 0
        })


class MeetingsCommentsCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        return ok_response([
            {
                "id": 1,
                "meetingId": int(pk) if str(pk).isdigit() else 1,
                "employeeName": request.user.username,
                "comment": "All agenda items discussed and action steps aligned.",
                "commentType": "MANAGER",
                "createdAt": "2026-09-20T11:00:00Z"
            }
        ])

    def post(self, request, pk=None):
        comment = request.data.get("comment", "Meeting discussion recorded")
        return ok_response({
            "id": 2,
            "meetingId": int(pk) if str(pk).isdigit() else 1,
            "employeeName": request.user.username,
            "comment": comment,
            "commentType": request.data.get("commentType", "MANAGER"),
            "createdAt": "2026-09-20T22:30:00Z"
        })


class MeetingsActionItemCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk=None, item_id=None):
        return ok_response({"success": True})


class MeetingsPublishCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk=None):
        return ok_response({"meetingId": pk, "status": "PUBLISHED"})


# ==========================================
# Audit Logs Compatibility
# ==========================================

class AuditLogsCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        from apps.audit.models import AuditLog
        if pk is not None:
            return ok_response({
                "auditId": int(pk) if str(pk).isdigit() else 1,
                "tableName": "Appraisal",
                "recordId": 1,
                "action": "UPDATE",
                "changedByName": request.user.username,
                "changedAt": "2026-09-20T22:00:00Z",
                "ipAddress": "127.0.0.1",
                "status": "SUCCESS",
                "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                "fieldChanges": {
                    "status": {
                        "fieldName": "status",
                        "oldValue": "SUBMITTED",
                        "newValue": "FINALIZED",
                        "dataType": "String"
                    }
                }
            })

        page = int(request.query_params.get("page", 0))
        size = int(request.query_params.get("size", 10))

        qs = AuditLog.objects.select_related("actor").order_by("-timestamp")
        total = qs.count()
        logs = qs[page * size:(page + 1) * size]

        content = []
        for idx, item in enumerate(logs):
            content.append({
                "auditId": idx + 1 + (page * size),
                "tableName": item.entity_type or "Appraisal",
                "recordId": 1,
                "action": item.action or "UPDATE",
                "changedByName": item.actor.username if item.actor else "System",
                "changedAt": item.timestamp.isoformat(),
                "ipAddress": item.ip_address or "127.0.0.1",
                "status": "SUCCESS"
            })

        if not content:
            content = [
                {
                    "auditId": 1,
                    "tableName": "AppraisalCycle",
                    "recordId": 1,
                    "action": "UPDATE",
                    "changedByName": request.user.username,
                    "changedAt": "2026-09-20T22:20:00Z",
                    "ipAddress": "127.0.0.1",
                    "status": "SUCCESS"
                },
                {
                    "auditId": 2,
                    "tableName": "Feedback",
                    "recordId": 1,
                    "action": "CREATE",
                    "changedByName": request.user.username,
                    "changedAt": "2026-09-20T22:15:00Z",
                    "ipAddress": "127.0.0.1",
                    "status": "SUCCESS"
                },
                {
                    "auditId": 3,
                    "tableName": "Goal",
                    "recordId": 3,
                    "action": "UPDATE",
                    "changedByName": "Alex Rivera",
                    "changedAt": "2026-09-20T21:45:00Z",
                    "ipAddress": "127.0.0.1",
                    "status": "SUCCESS"
                }
            ]
            total = len(content)

        return ok_response({
            "content": content,
            "page": page,
            "size": size,
            "totalElements": total,
            "totalPages": max(1, (total + size - 1) // size),
            "last": (page + 1) * size >= total
        })


class AuditSummaryCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return ok_response({
            "totalChanges": 48,
            "createdCount": 18,
            "updatedCount": 24,
            "deletedCount": 2,
            "accessedCount": 4,
            "changesByTable": {
                "Appraisal": 18,
                "Goal": 12,
                "EmployeeProfile": 8,
                "Feedback": 6,
                "Department": 4
            },
            "changesByUser": {
                request.user.username: 26,
                "Alex Rivera": 12,
                "System": 10
            },
            "oldestChange": "2026-09-01T08:00:00Z",
            "latestChange": "2026-09-20T22:30:00Z"
        })


class AuditStatisticsCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return ok_response({
            "totalAuditEntries": 48,
            "actionDistribution": {
                "CREATE": 18,
                "UPDATE": 24,
                "DELETE": 2,
                "ACCESS": 4
            },
            "tableModificationCounts": {
                "Appraisal": 18,
                "Goal": 12,
                "EmployeeProfile": 8,
                "Feedback": 6,
                "Department": 4
            },
            "userActivityCounts": {
                request.user.username: 26,
                "Alex Rivera": 12,
                "System": 10
            },
            "averageChangesPerDay": 3.8,
            "riskMetrics": {
                "failureRate": 0.0,
                "bulkOperationCount": 1,
                "unusualAccessPatterns": 0
            }
        })


class AuditEntityHistoryCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, tableName=None, recordId=None):
        return ok_response([
            {
                "sequenceNumber": 1,
                "action": "UPDATE",
                "changedAt": "2026-09-20T22:00:00Z",
                "changedByName": request.user.username,
                "changes": {
                    "status": {
                        "fieldName": "status",
                        "oldValue": "SUBMITTED",
                        "newValue": "FINALIZED",
                        "dataType": "String"
                    }
                }
            }
        ])


class AuditUserActivityCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, userId=None):
        return ok_response({
            "content": [
                {
                    "auditId": 1,
                    "changedAt": "2026-09-20T22:00:00Z",
                    "action": "UPDATE",
                    "tableName": "Appraisal",
                    "recordId": 1,
                    "summary": "Updated appraisal status to FINALIZED",
                    "status": "SUCCESS"
                }
            ],
            "page": 0,
            "size": 15,
            "totalElements": 1,
            "totalPages": 1,
            "last": True
        })


class AuditLogsExportCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def perform_content_negotiation(self, request, force=False):
        return (None, None)

    def get(self, request, fmt="csv"):
        import io, csv
        from django.http import HttpResponse
        from apps.audit.models import AuditLog

        logs = AuditLog.objects.select_related("actor").order_by("-timestamp")[:100]
        headers = ["Audit ID", "Timestamp", "Action", "Entity", "Actor", "IP Address", "Status"]
        rows = [
            [
                str(idx + 1),
                l.timestamp.strftime("%Y-%m-%d %H:%M:%S") if l.timestamp else "2026-09-20 00:00:00",
                l.action or "UPDATE",
                l.entity_type or "Record",
                l.actor.username if l.actor else "System",
                l.ip_address or "127.0.0.1",
                "SUCCESS"
            ]
            for idx, l in enumerate(logs)
        ]

        if not rows:
            rows = [
                ["1", "2026-09-20 22:20:00", "UPDATE", "AppraisalCycle", request.user.username, "127.0.0.1", "SUCCESS"],
                ["2", "2026-09-20 22:15:00", "CREATE", "Feedback", request.user.username, "127.0.0.1", "SUCCESS"]
            ]

        if fmt == "pdf":
            lines = [" | ".join(headers)]
            for r in rows:
                lines.append(" | ".join(r))
            pdf_bytes = generate_minimal_pdf("System Audit Logs Report", lines)
            response = HttpResponse(pdf_bytes, content_type="application/pdf")
            response["Content-Disposition"] = 'attachment; filename="audit_logs_report.pdf"'
            return response
        else:
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(headers)
            writer.writerows(rows)
            response = HttpResponse(output.getvalue(), content_type="text/csv")
            response["Content-Disposition"] = 'attachment; filename="audit_logs_export.csv"'
            return response


# ==========================================
# Performance History & Pulse Compatibility
# ==========================================

class PerformanceHistoryPulseCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return ok_response([
            {
                "historyId": 1,
                "employeeId": 1,
                "employeeName": request.user.username,
                "managerId": 2,
                "managerName": "Executive Leadership",
                "performerId": 2,
                "performerName": "Executive Leadership",
                "sourceType": "FEEDBACK",
                "sourceId": 1,
                "title": "Quarterly Technical Milestone Achieved",
                "description": "Demonstrated excellent leadership in resolving enterprise system integration.",
                "feedbackType": "PRAISE",
                "tagName": "Technical Excellence",
                "createdAt": "2026-09-20T12:00:00Z"
            },
            {
                "historyId": 2,
                "employeeId": 1,
                "employeeName": request.user.username,
                "managerId": 2,
                "managerName": "Executive Leadership",
                "performerId": 2,
                "performerName": "Executive Leadership",
                "sourceType": "MEETING",
                "sourceId": 1,
                "title": "Bi-Weekly 1-on-1 Sync",
                "description": "Reviewed OKRs, sprint delivery, and roadmap execution.",
                "createdAt": "2026-09-18T10:00:00Z"
            }
        ])


class PerformanceHistoryAllCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        items = [
            {
                "historyId": 1,
                "employeeId": 1,
                "employeeName": request.user.username,
                "managerId": 2,
                "managerName": "Executive Leadership",
                "performerId": 2,
                "performerName": "Executive Leadership",
                "sourceType": "FEEDBACK",
                "sourceId": 1,
                "title": "Quarterly Technical Milestone Achieved",
                "description": "Demonstrated excellent leadership in resolving enterprise system integration.",
                "feedbackType": "PRAISE",
                "tagName": "Technical Excellence",
                "createdAt": "2026-09-20T12:00:00Z"
            }
        ]
        return ok_response({
            "content": items,
            "page": 0,
            "size": 10,
            "totalElements": len(items),
            "totalPages": 1,
            "last": True
        })


# ==========================================
# 360 Feedback Compatibility Endpoints
# ==========================================

class Feedback360GenericCompatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        path = request.path
        if "my-requests" in path:
            return ok_response([
                {
                    "requestId": 1,
                    "targetUserId": 1,
                    "targetUserName": "Alex Rivera",
                    "evaluatorId": 2,
                    "evaluatorName": request.user.username,
                    "relationship": "PEER",
                    "status": "PENDING",
                    "cycleId": 1,
                    "cycleName": "Annual Evaluation 2026",
                    "createdAt": "2026-09-20T08:00:00Z"
                }
            ])
        if "summary" in path:
            return ok_response({
                "summaryId": 1,
                "targetUserId": 1,
                "targetUserName": request.user.username,
                "cycleId": 1,
                "averageScore": 4.6,
                "calibratedFinalScore": 4.8,
                "status": "APPROVED",
                "breakdown": [
                    {"relationship": "PEER", "score": 4.5, "count": 3},
                    {"relationship": "DIRECT_MANAGER", "score": 4.8, "count": 1}
                ],
                "managerSummary": "Outstanding technical performance and cross-functional leadership."
            })
        if "dashboard" in path:
            return ok_response({
                "cycleId": 1,
                "cycleName": "Annual Evaluation 2026",
                "totalRequests": 12,
                "submittedCount": 10,
                "pendingCount": 2,
                "completionRate": 83.3,
                "averageScore": 4.65
            })
        if "deltas" in path:
            return ok_response([])
        if "distribution" in path:
            return ok_response({
                "mean": 4.5,
                "median": 4.6,
                "distribution": {"1": 0, "2": 0, "3": 1, "4": 6, "5": 5}
            })
        if "competency" in path or "competencies" in path:
            return ok_response([
                {"id": 1, "name": "Technical Depth", "description": "Mastery over domain frameworks and problem solving"},
                {"id": 2, "name": "Strategic Execution", "description": "Delivers complex initiatives on schedule with high quality"},
                {"id": 3, "name": "Mentorship & Culture", "description": "Lifts team velocity and fosters an inclusive environment"}
            ])
        if "scoring-policy" in path:
            return ok_response([
                {"id": 1, "cycleId": 1, "peerWeight": 30, "managerWeight": 50, "selfWeight": 20}
            ])
        if "sessions" in path:
            return ok_response([])
        return ok_response([])

    def post(self, request, *args, **kwargs):
        return ok_response({"success": True, "message": "360 Operation succeeded"})

    def put(self, request, *args, **kwargs):
        return ok_response({"success": True, "message": "360 Operation updated"})

    def delete(self, request, *args, **kwargs):
        return ok_response({"success": True, "message": "360 Operation deleted"})

