import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, Eye, Info, Mail, Shield, Users } from "lucide-react";
import { useSearchEmployeesQuery } from "../../features/employee/employeeapi";
import { useGetDepartmentsQuery } from "../../features/org/departmentApi";
import { useGetTeamsQuery, useGetTeamMembersQuery } from "../../features/org/teamApi";
import type { TeamResponse } from "../../features/org/orgTypes";
import type { EmployeeResponse } from "../../features/employee/employeeTypes";

const AVATAR_COLORS = [
  { bg: "#EEF3FD", text: "#0C447C" },
  { bg: "#EAF3DE", text: "#27500A" },
  { bg: "#FAEEDA", text: "#633806" },
  { bg: "#F1EFE8", text: "#444441" },
  { bg: "#FCEBEB", text: "#791F1F" },
];

const isManagerRole = (emp: EmployeeResponse) =>
  emp.roles.some((r) => r === "ROLE_MANAGER" || r === "MANAGER" || r.includes("MANAGER"));

// ─── Main Page ────────────────────────────────────────────────────────────────
const DepartmentMembers = () => {
  const { id } = useParams();
  const departmentId = Number(id);
  const navigate = useNavigate();

  const { data: departments, isLoading: isDeptLoading } = useGetDepartmentsQuery();
  const department = departments?.find((d) => d.id === departmentId);

  // Full employee data for everyone in this department
  const { data: membersResp, isLoading: isMembersLoading } = useSearchEmployeesQuery(
    { departmentId: String(departmentId), page: 0, size: 200 },
    { skip: !departmentId },
  );
  const allMembers: EmployeeResponse[] = membersResp?.content ?? [];

  // All teams — filter to ones belonging to this department
  const { data: allTeams, isLoading: isTeamsLoading } = useGetTeamsQuery();
  const departmentTeams = allTeams?.filter((t) => t.departmentId === departmentId) ?? [];
  const hasTeams = departmentTeams.length > 0;

  const managers = allMembers.filter(isManagerRole);
  const nonManagers = allMembers.filter((e) => !isManagerRole(e));

  if (isDeptLoading || isMembersLoading || isTeamsLoading) {
    return (
      <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>
        Loading department members...
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ── */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 mb-2 transition-colors"
          style={{ color: "#5A6070", fontSize: 12 }}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>
          {department?.departmentName ?? "Department"} — Members
        </h1>

        <div className="flex flex-wrap gap-3 mt-1.5 items-center">
          <span style={{ fontSize: 12, color: "#9EA3B0" }}>
            Code:{" "}
            <span style={{ fontFamily: "monospace", color: "#1A56DB" }}>
              {department?.departmentCode}
            </span>
          </span>
          <span style={{ fontSize: 12, color: "#9EA3B0" }}>
            {allMembers.length} member{allMembers.length !== 1 ? "s" : ""}
          </span>
          {hasTeams ? (
            <span style={{ fontSize: 12, color: "#9EA3B0" }}>
              {departmentTeams.length} team{departmentTeams.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 500,
                color: "#BA7517",
                background: "#FAEEDA",
                border: "0.5px solid #F0D4A4",
                borderRadius: 20,
                padding: "2px 9px",
              }}
            >
              <Info size={10} />
              No teams in this department
            </span>
          )}
        </div>
      </div>

      {/* ── Managers Section ── */}
      <SectionCard
        icon={<Shield size={15} style={{ color: "#1A56DB" }} />}
        title="Department Managers"
        count={managers.length}
        accentBg="#EEF3FD"
        accentText="#0C447C"
      >
        {managers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {managers.map((emp) => (
              <EmployeeCard key={emp.id} employee={emp} badgeLabel="Manager" />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#9EA3B0", padding: "6px 0" }}>
            No managers assigned to this department.
          </p>
        )}
      </SectionCard>

      {/* ── Teams or flat member list ── */}
      {hasTeams ? (
        // For each team, a sub-component that fetches its own member list
        departmentTeams.map((team) => (
          <TeamSection key={team.teamId} team={team} allMembers={allMembers} />
        ))
      ) : (
        // Department has no teams — show all non-managers in one flat section
        <SectionCard
          icon={<Users size={15} style={{ color: "#5A6070" }} />}
          title="Team Members"
          count={nonManagers.length}
          accentBg="#F1EFE8"
          accentText="#444441"
        >
          {nonManagers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {nonManagers.map((emp) => (
                <EmployeeCard key={emp.id} employee={emp} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#9EA3B0", padding: "6px 0" }}>
              No team members found in this department.
            </p>
          )}
        </SectionCard>
      )}
    </div>
  );
};

// ─── Team Section — has its own hook call per team ────────────────────────────
/**
 * Fetches members for a specific team using `useGetTeamMembersQuery(teamId)`,
 * then cross-references with `allMembers` (full EmployeeResponse) to get complete info.
 * A manager who is also assigned to a team will appear in BOTH sections.
 */
const TeamSection = ({
  team,
  allMembers,
}: {
  team: TeamResponse;
  allMembers: EmployeeResponse[];
}) => {
  const { data: teamMemberList, isLoading } = useGetTeamMembersQuery(team.teamId);

  // Map TeamMemberResponse employeeIds → full EmployeeResponse objects
  const teamEmployees: EmployeeResponse[] = (teamMemberList ?? [])
    .map((tm) => allMembers.find((emp) => emp.id === tm.employeeId))
    .filter((emp): emp is EmployeeResponse => emp !== undefined);

  return (
    <SectionCard
      icon={<Users size={15} style={{ color: "#5A6070" }} />}
      title={team.teamName}
      count={teamEmployees.length}
      accentBg="#F1EFE8"
      accentText="#444441"
    >
      {isLoading ? (
        <p style={{ fontSize: 12, color: "#9EA3B0" }}>Loading team members...</p>
      ) : teamEmployees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teamEmployees.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} badgeLabel={team.teamName} />
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#9EA3B0", padding: "6px 0" }}>
          No members assigned to <strong>{team.teamName}</strong> yet.
        </p>
      )}
    </SectionCard>
  );
};

// ─── Section Card Wrapper ─────────────────────────────────────────────────────
const SectionCard = ({
  icon,
  title,
  count,
  accentBg,
  accentText,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accentBg: string;
  accentText: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      background: "#FFFFFF",
      border: "0.5px solid #E4E6EC",
      borderRadius: 12,
      padding: 20,
    }}
  >
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{title}</h2>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          background: accentBg,
          color: accentText,
          borderRadius: 20,
          padding: "1px 8px",
          marginLeft: 2,
        }}
      >
        {count}
      </span>
    </div>
    {children}
  </div>
);

// ─── Employee Card ─────────────────────────────────────────────────────────────
const EmployeeCard = ({
  employee,
  badgeLabel,
}: {
  employee: EmployeeResponse;
  badgeLabel?: string;
}) => {
  const avatarColor =
    AVATAR_COLORS[(employee.staffName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

  return (
    <div
      style={{
        border: "0.5px solid #E4E6EC",
        borderRadius: 10,
        padding: 16,
        background: "#FAFBFF",
        position: "relative",
      }}
      className="group"
    >
      {/* Top row: Avatar + name */}
      <div className="flex items-start gap-3 pr-9">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-medium shrink-0 overflow-hidden"
          style={{ background: avatarColor.bg, color: avatarColor.text }}
        >
          {employee.profileImage && employee.profileImage !== "default.jpg" ? (
            <img
              src={`http://localhost:8000${employee.profileImage}`}
              alt={employee.staffName}
              className="w-full h-full object-cover"
            />
          ) : (
            employee.staffName?.charAt(0) ?? "?"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#111827",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {employee.staffName}
          </p>
          <p
            style={{ fontSize: 11, color: "#9EA3B0", fontFamily: "monospace", marginTop: 2 }}
          >
            {employee.employeeCode}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2" style={{ fontSize: 12, color: "#5A6070" }}>
          <Briefcase size={12} style={{ color: "#C0C4CF" }} />
          <span className="truncate">{employee.positionName || "No position"}</span>
        </div>
        <div className="flex items-center gap-2" style={{ fontSize: 12, color: "#5A6070" }}>
          <Mail size={12} style={{ color: "#C0C4CF" }} />
          <span className="truncate">{employee.email || "No email"}</span>
        </div>

        {/* Team / role badge */}
        {badgeLabel && (
          <div className="pt-1">
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "#0C447C",
                background: "#EEF3FD",
                border: "0.5px solid #C8CCE0",
                borderRadius: 20,
                padding: "2px 8px",
              }}
            >
              {badgeLabel}
            </span>
          </div>
        )}
      </div>

      {/* View Profile — appears on hover */}
      <Link
        to={`/employees/${employee.id}/profile`}
        title="View Profile"
        className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          background: "#FFFFFF",
          border: "0.5px solid #E4E6EC",
          borderRadius: 8,
          color: "#1A56DB",
        }}
      >
        <Eye size={14} />
      </Link>
    </div>
  );
};

export default DepartmentMembers;
