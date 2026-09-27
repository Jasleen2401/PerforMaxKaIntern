import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Trophy, Target, Clock, ClipboardList, MessageSquare, AlertTriangle,
  TrendingUp, FileText, CheckCircle2, Award, User, ExternalLink,
  ShieldCheck, ArrowRight, Sparkles, FolderGit2, Calendar,
  AlertCircle, RefreshCw, Briefcase, Mail, Hash, UserCheck
} from 'lucide-react';
import {
  useGetEmployeeDashboardQuery,
  useGetInternScorecardQuery,
  useGetInternGoalsQuery,
  useGetInternAppraisalsQuery
} from '../features/dashboard/dashboardApi';
import { useDownloadReportMutation } from '../features/report/reportApi';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import ChartCard from '../components/dashboard/ChartCard';
import TaskPanel from '../components/dashboard/TaskPanel';

const PIE_COLORS = ['#1A56DB', '#10B981', '#F59E0B', '#8B5CF6'];

type DashboardTab = 'overview' | 'goals' | 'tasks' | 'evidence' | 'evaluation' | 'results' | 'profile';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    data: dashData,
    isLoading: isDashLoading,
    error: dashError,
    refetch: refetchDash,
  } = useGetEmployeeDashboardQuery();

  const {
    data: scorecard,
    isLoading: isScorecardLoading,
  } = useGetInternScorecardQuery();

  const {
    data: goals = [],
    isLoading: isGoalsLoading,
  } = useGetInternGoalsQuery();

  const {
    data: appraisals = [],
    isLoading: isAppraisalsLoading,
  } = useGetInternAppraisalsQuery();

  const [downloadReport] = useDownloadReportMutation();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const handleDownload = async (format: 'pdf' | 'excel') => {
    if (!user?.id) return;
    try {
      await downloadReport({
        endpoint: 'performance-trend',
        params: { employeeId: user.id, format },
        fileName: `Performance_Trend_${user.id}.${format === 'excel' ? 'xlsx' : 'pdf'}`,
      }).unwrap();
      toast.success(`Downloading performance trend as ${format.toUpperCase()}...`);
    } catch {
      toast.error('Failed to download performance trend.');
    }
  };

  // Loading State
  const isInitialLoading = isDashLoading && isScorecardLoading;
  if (isInitialLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-600">Loading your performance metrics…</p>
        <p className="text-xs text-slate-400">Fetching live intern dashboard data from PerforMax services</p>
      </div>
    );
  }

  // Error State
  if (dashError) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
          <AlertCircle size={24} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Unable to load dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">
            Could not retrieve performance metrics from the server. Please check your connection and try again.
          </p>
        </div>
        <button
          onClick={() => refetchDash()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  // Profile data from authenticated state
  const internProfile = {
    name: user?.staffName || (user as any)?.username || 'Intern',
    email: user?.email || '—',
    designation: (user as any)?.positionName || (user as any)?.profile?.designation || (user as any)?.designation || 'Intern',
    department: (user as any)?.currentDepartmentName || (user as any)?.profile?.department_name || (user as any)?.department || 'Engineering',
    mentor: (user as any)?.directManagerName || (user as any)?.profile?.manager_name || 'Assigned Mentor',
    cohort: (user as any)?.profile?.joining_date
      ? `Cohort ${new Date((user as any).profile.joining_date).getFullYear()}`
      : 'Summer 2025 Cohort',
    employeeCode: (user as any)?.employeeCode || (user as any)?.profile?.employee_code || '—',
    status: (user as any)?.profile?.employment_status || 'ACTIVE',
    joiningDate: (user as any)?.profile?.joining_date || (user as any)?.joining_date || '—',
    phoneNumber: (user as any)?.profile?.phone_number || (user as any)?.phoneNo || '—',
  };

  // Published appraisals & feedback
  const publishedAppraisals = appraisals.filter(a => a.published || a.status === 'PUBLISHED');

  const tabs: Array<{ id: DashboardTab; label: string; icon: React.ElementType; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: Trophy },
    { id: 'goals', label: 'My Goals', icon: Target, badge: goals.length },
    { id: 'tasks', label: 'My Tasks', icon: ClipboardList, badge: dashData?.pendingTasksCount },
    { id: 'evidence', label: 'Evidence', icon: FileText },
    { id: 'evaluation', label: 'Evaluation / Self Assessment', icon: CheckCircle2 },
    { id: 'results', label: 'Results & Feedback', icon: Award, badge: publishedAppraisals.length },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Header and Portal Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Welcome back, {internProfile.name}!
            </h1>
            <span className="bg-amber-50 text-amber-800 font-semibold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-200">
              Intern Workspace
            </span>
            <span className="bg-indigo-50 text-indigo-700 font-medium text-[11px] px-2 py-0.5 rounded-full border border-indigo-200">
              {internProfile.cohort}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department: <strong className="text-slate-700">{internProfile.department}</strong> • Mentor: <strong className="text-slate-700">{internProfile.mentor}</strong>
          </p>
        </div>

        <Link
          to="/intern"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 border border-amber-200 transition-all shadow-2xs shrink-0"
        >
          <Sparkles size={14} className="text-amber-600" />
          <span>Intern Learning Portal</span>
          <ArrowRight size={13} className="text-amber-600" />
        </Link>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/80 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <DashboardStatCard
              title="Performance Score"
              value={
                dashData?.currentScore !== undefined
                  ? `${dashData.currentScore.toFixed(1)}%`
                  : scorecard?.publishedScore !== null && scorecard?.publishedScore !== undefined
                  ? `${scorecard.publishedScore.toFixed(1)}%`
                  : 'Pending'
              }
              subtitle={
                dashData?.currentScore !== undefined || scorecard?.publishedScore
                  ? 'Published Official Score'
                  : 'Evaluation In Progress'
              }
              icon={<Trophy size={16} />}
              color="blue"
            />
            <DashboardStatCard
              title="Goal Completion"
              value={`${scorecard?.averageProgress ?? dashData?.kpiCompletionPercentage ?? 0}%`}
              subtitle={`${scorecard?.completedGoals ?? 0} of ${scorecard?.totalGoals ?? goals.length} goals done`}
              icon={<Target size={16} />}
              color="green"
            />
            <DashboardStatCard
              title="Pending Tasks"
              value={dashData?.pendingTasksCount ?? 0}
              subtitle="Milestones & Actions"
              icon={<ClipboardList size={16} />}
              color="orange"
            />
            <DashboardStatCard
              title="Attendance / Days"
              value={dashData?.feedbackCount ?? 0}
              subtitle="Logged Active Days"
              icon={<MessageSquare size={16} />}
              color="purple"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Performance Trend Chart */}
            <div className="lg:col-span-2">
              <ChartCard 
                title="Performance Trend"
                action={
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload('pdf')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <ClipboardList size={11} /> PDF
                    </button>
                    <button
                      onClick={() => handleDownload('excel')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <ClipboardList size={11} /> Excel
                    </button>
                  </div>
                }
              >
                {dashData?.performanceTrend && dashData.performanceTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashData.performanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F6" />
                      <XAxis dataKey="period" stroke="#9EA3B0" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#9EA3B0" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "0.5px solid #E4E6EC", boxShadow: "none", fontSize: 12 }} />
                      <Line type="monotone" dataKey="score" stroke="#1A56DB" strokeWidth={2.5} dot={{ r: 4, fill: '#1A56DB', strokeWidth: 2, stroke: '#fff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <TrendingUp size={28} className="text-slate-300 mb-2" />
                    <span>No historical performance trend data available yet</span>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* KPI Status Distribution */}
            <div>
              <ChartCard title="KPI Status Distribution">
                {dashData?.kpiStatus && dashData.kpiStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashData.kpiStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {dashData.kpiStatus.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: "0.5px solid #E4E6EC", boxShadow: "none", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <Target size={28} className="text-slate-300 mb-2" />
                    <span>No KPI distribution metrics recorded</span>
                  </div>
                )}
              </ChartCard>
            </div>
          </div>

          {/* Tasks & Appraisal Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TaskPanel
              tasks={(dashData?.tasks || []).map(t => ({
                id: t.id,
                title: t.title,
                deadline: t.deadline,
                priority: (t.priority.charAt(0).toUpperCase() + t.priority.slice(1).toLowerCase()) as 'High' | 'Medium' | 'Low',
              }))}
            />

            {/* Timeline */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">Appraisal Cycle Timeline</h3>
              </div>
              {dashData?.appraisalTimeline && dashData.appraisalTimeline.length > 0 ? (
                <div className="space-y-4">
                  {dashData.appraisalTimeline.map((step, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            step.active
                              ? 'bg-indigo-600 ring-4 ring-indigo-50'
                              : step.status === 'COMPLETED'
                              ? 'bg-emerald-500'
                              : 'bg-slate-300'
                          }`}
                        />
                        {idx !== dashData.appraisalTimeline.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 my-1" />
                        )}
                      </div>
                      <div className="pb-1">
                        <p className={`text-xs font-semibold ${step.active ? 'text-indigo-600' : 'text-slate-900'}`}>
                          {step.phase}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {step.date} — <span className="font-medium text-slate-700">{step.status}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No active appraisal timeline phases scheduled.
                </div>
              )}
            </div>
          </div>

          {/* PIP and Manager Feedback */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashData?.onPip && (
              <div className="lg:col-span-2 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-900">Performance Improvement Plan (PIP) Notice</h4>
                  <p className="text-xs text-red-700 mt-1">
                    You have an active performance improvement review plan. Work with your assigned mentor on designated deliverables.
                  </p>
                </div>
              </div>
            )}

            {/* Team Rank & Cohort Stats */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Cohort Benchmarking</h3>
              <div className="grid grid-cols-2 gap-3">
                {dashData?.teamRank !== undefined ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <span className="text-[11px] text-slate-400 block mb-1">Team Rank</span>
                    <span className="text-lg font-bold text-indigo-700">
                      #{dashData.teamRank}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">of {dashData.teamSize || 1} interns</span>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-400">
                    Rank: Not Published
                  </div>
                )}

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <span className="text-[11px] text-slate-400 block mb-1">Active Cycle</span>
                  <span className="text-xs font-semibold text-slate-800 block truncate">
                    {goals[0]?.cycleName || 'Summer 2025'}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">In Progress</span>
                </div>
              </div>
            </div>

            {/* Manager Feedback */}
            {dashData?.managerLastScore !== undefined && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={16} className="text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Published Mentor Feedback</h3>
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs text-slate-500">Evaluation Score</span>
                    <span className="text-base font-bold text-indigo-700">
                      {dashData.managerLastScore.toFixed(1)}%
                    </span>
                  </div>
                  {dashData.managerLastComment && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400 block mb-1">Mentor Qualitative Remarks:</span>
                      <p className="text-xs text-slate-600 leading-relaxed italic">
                        "{dashData.managerLastComment}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: MY GOALS */}
      {/* ============================================================== */}
      {activeTab === 'goals' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Target size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">My Assigned Goals & KRAs</h2>
                <p className="text-xs text-slate-500 mt-0.5">Live deliverables assigned by your mentor with milestone tracking.</p>
              </div>
            </div>
            <Link
              to="/kpi/my"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>Open Goals Workspace</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          {/* Goal Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-400">Total Goals</span>
              <div className="text-xl font-bold text-slate-800 mt-0.5">{goals.length}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-400">Completed</span>
              <div className="text-xl font-bold text-emerald-600 mt-0.5">
                {goals.filter(g => g.status === 'COMPLETED').length}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-400">In Progress</span>
              <div className="text-xl font-bold text-amber-600 mt-0.5">
                {goals.filter(g => g.status === 'IN_PROGRESS').length}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-400">Average Progress</span>
              <div className="text-xl font-bold text-indigo-700 mt-0.5">
                {scorecard?.averageProgress ?? dashData?.kpiCompletionPercentage ?? 0}%
              </div>
            </div>
          </div>

          {/* Live Goals List */}
          {isGoalsLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading assigned goals…</div>
          ) : goals.length > 0 ? (
            <div className="space-y-3">
              {goals.map((g) => (
                <div key={g.id} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{g.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        g.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : g.status === 'IN_PROGRESS'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {g.status.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        g.priority === 'HIGH' || g.priority === 'CRITICAL'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {g.priority}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-indigo-700">
                      {g.completionPercentage ?? g.progress}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-3">{g.description}</p>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        (g.completionPercentage ?? g.progress) >= 100
                          ? 'bg-emerald-600'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, g.completionPercentage ?? g.progress)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Cycle: {g.cycleName}</span>
                    <span>{g.dueDate ? `Due: ${g.dueDate}` : 'No deadline set'}</span>
                    {g.assignedByName && <span>Assigned by: {g.assignedByName}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
              <Target size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No active goals currently assigned to your account.</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: MY TASKS */}
      {/* ============================================================== */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <ClipboardList size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Assigned Tasks & Milestones</h2>
                <p className="text-xs text-slate-500 mt-0.5">Actionable milestones assigned by your mentor for review.</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {dashData?.pendingTasksCount ?? 0} Pending
            </span>
          </div>

          <TaskPanel
            tasks={(dashData?.tasks || []).map(t => ({
              id: t.id,
              title: t.title,
              deadline: t.deadline,
              priority: (t.priority.charAt(0).toUpperCase() + t.priority.slice(1).toLowerCase()) as 'High' | 'Medium' | 'Low',
            }))}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: EVIDENCE */}
      {/* ============================================================== */}
      {activeTab === 'evidence' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <FolderGit2 size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Evidence Submission Summary</h2>
                <p className="text-xs text-slate-500 mt-0.5">Proof of work submissions attached to your goals.</p>
              </div>
            </div>
            <Link
              to="/kpi/my"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>Submit Evidence in Goals</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs mb-2">1</div>
              <h3 className="text-sm font-semibold text-slate-800">Attach Proof</h3>
              <p className="text-xs text-slate-500 mt-1">Provide external links to GitHub PRs, commits, Figma specs, or file attachments.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs mb-2">2</div>
              <h3 className="text-sm font-semibold text-slate-800">Mentor Review</h3>
              <p className="text-xs text-slate-500 mt-1">Your assigned manager evaluates code quality and verifies completion criteria.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs mb-2">3</div>
              <h3 className="text-sm font-semibold text-slate-800">Status Verification</h3>
              <p className="text-xs text-slate-500 mt-1">Evidence transitions from PENDING to APPROVED or REVISION_REQUESTED.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900">
            <span className="font-semibold">Interactive Submission:</span> Multi-file attachment and evidence review status updates will be activated in Phase 5.
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: EVALUATION / SELF ASSESSMENT */}
      {/* ============================================================== */}
      {activeTab === 'evaluation' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Appraisal & Self Assessment</h2>
                <p className="text-xs text-slate-500 mt-0.5">Track your official evaluation cycles and self-assessment status.</p>
              </div>
            </div>
            <Link
              to="/appraisal"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>Go to Appraisal Workflow</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          {/* Active Cycle Status Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Appraisal Cycle</span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                {scorecard?.activeAppraisalStatus
                  ? `${goals[0]?.cycleName || 'Active Cycle'} — ${scorecard.activeAppraisalStatus}`
                  : 'Summer 2025 Intern Appraisal Cycle'}
              </h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              scorecard?.activeAppraisalStatus === 'SUBMITTED'
                ? 'bg-blue-100 text-blue-700'
                : scorecard?.activeAppraisalStatus === 'PUBLISHED'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {scorecard?.activeAppraisalStatus || 'IN_PROGRESS'}
            </span>
          </div>

          {/* Appraisal Records */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Appraisal Records</h3>
            {isAppraisalsLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading appraisal records…</div>
            ) : appraisals.length > 0 ? (
              appraisals.map((a) => (
                <div key={a.id} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between bg-white">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{a.cycleName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {a.appraisalType}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block">
                      Status: <strong className="text-slate-700">{a.status}</strong>
                    </span>
                  </div>
                  <div>
                    {a.overallScore !== null ? (
                      <span className="text-base font-bold text-indigo-700">{a.overallScore.toFixed(1)}%</span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Score pending publication</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No appraisal cycles recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: RESULTS & FEEDBACK */}
      {/* ============================================================== */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Award size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Published Results & Official Feedback</h2>
                <p className="text-xs text-slate-500 mt-0.5">Verified performance scores and published manager feedback.</p>
              </div>
            </div>
            <Link
              to="/appraisal"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>View Appraisal Records</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          {/* Privacy Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <ShieldCheck size={20} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800">Privacy & Confidentiality Shield Active</p>
              <p className="mt-1">
                Internal manager scoring and committee notes remain confidential until officially approved and published by HR. Only <strong>PUBLISHED</strong> results appear here.
              </p>
            </div>
          </div>

          {/* Published Results List */}
          {publishedAppraisals.length > 0 ? (
            <div className="space-y-4">
              {publishedAppraisals.map((a) => (
                <div key={a.id} className="p-5 border border-slate-200 rounded-xl bg-white space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                        Published Evaluation
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{a.cycleName}</h3>
                    </div>
                    {a.overallScore !== null && (
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Final Score</span>
                        <span className="text-xl font-extrabold text-indigo-700">{a.overallScore.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>

                  {a.reviewerComments && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <span className="font-semibold text-slate-700 block mb-1">Mentor Feedback:</span>
                      <p className="text-slate-600 leading-relaxed italic">"{a.reviewerComments}"</p>
                    </div>
                  )}

                  {a.finalComments && (
                    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs">
                      <span className="font-semibold text-indigo-900 block mb-1">HR & Committee Final Conclusion:</span>
                      <p className="text-indigo-800 leading-relaxed">{a.finalComments}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
              <Award size={28} className="text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No published results yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Your performance evaluation results will be displayed here once HR completes calibration and publishes the final scores.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 7: PROFILE */}
      {/* ============================================================== */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <User size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Intern Profile & Account Identity</h2>
                <p className="text-xs text-slate-500 mt-0.5">Live authenticated profile data retrieved from PerforMax user service.</p>
              </div>
            </div>
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>Manage Profile</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <User size={13} />
                <span>Full Name</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 truncate">{internProfile.name}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <Mail size={13} />
                <span>Email Address</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 truncate">{internProfile.email}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <Briefcase size={13} />
                <span>Designation</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">{internProfile.designation}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <Target size={13} />
                <span>Department</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">{internProfile.department}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <UserCheck size={13} />
                <span>Reporting Mentor / Manager</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">{internProfile.mentor}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <Hash size={13} />
                <span>Employee Code</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">{internProfile.employeeCode}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <Calendar size={13} />
                <span>Cohort / Joining Date</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {internProfile.joiningDate !== '—' ? internProfile.joiningDate : internProfile.cohort}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <CheckCircle2 size={13} />
                <span>Employment Status</span>
              </div>
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                {internProfile.status}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <PhoneIcon />
                <span>Contact Phone</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">{internProfile.phoneNumber}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PhoneIcon: React.FC = () => (
  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

export default EmployeeDashboard;
