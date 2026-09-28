import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Target, Clock, ClipboardList, MessageSquare,
  FileText, CheckCircle2, Award, User, ExternalLink,
  ShieldCheck, ArrowRight, Sparkles, FolderGit2, Calendar,
  AlertCircle, RefreshCw, Briefcase, Mail, Hash, UserCheck,
  Send, UploadCloud, Paperclip, Link as LinkIcon, Check,
  ChevronDown, ChevronUp, Info, Edit3, Sliders
} from 'lucide-react';
import {
  useGetInternOverviewQuery,
  useGetInternGoalsQuery,
  useUpdateInternGoalProgressMutation,
  useAddInternGoalCommentMutation,
  useGetInternTasksQuery,
  useCompleteInternTaskMutation,
  useGetInternEvidenceQuery,
  useSubmitInternEvidenceMutation,
  useGetInternSelfAppraisalQuery,
  useSubmitInternSelfAppraisalMutation,
  useGetInternPublishedFeedbackQuery,
  useReplyToMentorFeedbackMutation
} from '../features/dashboard/dashboardApi';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';

type DashboardTab = 'overview' | 'goals' | 'tasks' | 'evidence' | 'evaluation' | 'results' | 'profile';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();

  // Primary Queries
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useGetInternOverviewQuery();

  const {
    data: goals = [],
    isLoading: isGoalsLoading,
    refetch: refetchGoals,
  } = useGetInternGoalsQuery();

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    refetch: refetchTasks,
  } = useGetInternTasksQuery();

  const {
    data: evidenceList = [],
    isLoading: isEvidenceLoading,
    refetch: refetchEvidence,
  } = useGetInternEvidenceQuery();

  const {
    data: selfAppraisal,
    refetch: refetchSelfAppraisal,
  } = useGetInternSelfAppraisalQuery();

  const {
    data: publishedFeedback,
    refetch: refetchFeedback,
  } = useGetInternPublishedFeedbackQuery();

  // Mutations
  const [updateGoalProgress] = useUpdateInternGoalProgressMutation();
  const [addGoalComment] = useAddInternGoalCommentMutation();
  const [completeTask] = useCompleteInternTaskMutation();
  const [submitEvidence] = useSubmitInternEvidenceMutation();
  const [submitSelfAppraisal] = useSubmitInternSelfAppraisalMutation();
  const [replyToFeedback] = useReplyToMentorFeedbackMutation();

  // UI States
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Goals tab states
  const [expandedGoalComments, setExpandedGoalComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);

  // Task complete modal/form states
  const [selectedTaskForComplete, setSelectedTaskForComplete] = useState<any | null>(null);
  const [taskCompletionDate, setTaskCompletionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [taskHoursSpent, setTaskHoursSpent] = useState<string>('3.5');
  const [taskCompletionNotes, setTaskCompletionNotes] = useState<string>('');
  const [taskArtifactUrl, setTaskArtifactUrl] = useState<string>('');

  // Evidence submission states
  const [showEvidenceModal, setShowEvidenceModal] = useState<boolean>(false);
  const [evidenceGoalId, setEvidenceGoalId] = useState<string>('');
  const [evidenceTitle, setEvidenceTitle] = useState<string>('');
  const [evidenceDescription, setEvidenceDescription] = useState<string>('');
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState<boolean>(false);

  // Self-appraisal form state
  const [selfRating, setSelfRating] = useState<number>(8.5);
  const [achievementsText, setAchievementsText] = useState<string>('');
  const [challengesText, setChallengesText] = useState<string>('');
  const [skillsText, setSkillsText] = useState<string>('');
  const [mentorshipNeedsText, setMentorshipNeedsText] = useState<string>('');
  const [reflectionText, setReflectionText] = useState<string>('');
  const [isAppraisalInitialized, setIsAppraisalInitialized] = useState<boolean>(false);

  // Feedback reply state
  const [mentorReplyText, setMentorReplyText] = useState<string>('');
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);

  // Initialize self appraisal fields when loaded
  if (selfAppraisal && !isAppraisalInitialized) {
    setSelfRating(selfAppraisal.selfRating || 8.5);
    setAchievementsText(selfAppraisal.achievements || '');
    setChallengesText(selfAppraisal.challenges || '');
    setSkillsText(selfAppraisal.skillsAcquired || '');
    setMentorshipNeedsText(selfAppraisal.mentorshipNeeds || '');
    setReflectionText(selfAppraisal.reflectionSummary || '');
    setIsAppraisalInitialized(true);
  }

  // Profile data from authenticated state and API
  const internProfile = {
    name: user?.staffName || (user as any)?.username || 'Jasleen Kaur',
    email: user?.email || 'jasleen.kaur@dailoqa.com',
    designation: (user as any)?.positionName || (user as any)?.profile?.designation || 'Software Engineering Intern',
    department: (user as any)?.currentDepartmentName || (user as any)?.profile?.department_name || 'Engineering',
    mentorName: overviewData?.mentor?.name || 'Elena Rostova',
    mentorEmail: overviewData?.mentor?.email || 'elena.qa@company.com',
    mentorDesignation: overviewData?.mentor?.designation || 'QA Automation & Engineering Lead',
    mentorDepartment: overviewData?.mentor?.department || 'Engineering',
    cohort: 'Summer 2025 Cohort',
    employeeCode: (user as any)?.employeeCode || (user as any)?.profile?.employee_code || 'DLQ-CC1-002',
    status: (user as any)?.profile?.employment_status || 'ACTIVE',
    joiningDate: (user as any)?.profile?.joining_date || '2025-06-01',
    phoneNumber: (user as any)?.profile?.phone_number || '+91 98765 43210',
  };

  const scorecard = overviewData?.personalScorecard;
  const cycle = overviewData?.cycle;
  const deadlines = overviewData?.deadlines || [];
  const publishedResults = overviewData?.publishedResults;

  const [showWeightDetails, setShowWeightDetails] = useState(false);
  const weightDist = publishedResults?.weightDistribution || scorecard?.weightDistribution || {
    goals_and_kpis: 40,
    manager_evaluation: 40,
    self_assessment: 20
  };
  const evalParams = publishedResults?.evaluationParameters || scorecard?.evaluationParameters || [
    { id: '1', name: 'Technical Competence', weight: 25, maximumScore: 100, description: 'Code quality, architectural design, debugging skills' },
    { id: '2', name: 'Problem Solving & Ownership', weight: 25, maximumScore: 100, description: 'Analytical approach, autonomy, root-cause fixes' },
    { id: '3', name: 'Code Quality & Testing', weight: 20, maximumScore: 100, description: 'Unit/integration testing, clean code conventions' },
    { id: '4', name: 'Collaboration & Communication', weight: 15, maximumScore: 100, description: 'Team syncs, PR reviews, documentation' },
    { id: '5', name: 'Velocity & Timeliness', weight: 15, maximumScore: 100, description: 'Achieving milestone sprint deadlines reliably' },
  ];

  // Handlers
  const handleUpdateProgress = async (goalId: string, newProgress: number) => {
    try {
      setUpdatingGoalId(goalId);
      await updateGoalProgress({ id: goalId, progress: newProgress }).unwrap();
      toast.success(`Goal progress updated to ${newProgress}%!`);
      refetchGoals();
      refetchOverview();
    } catch {
      toast.error('Failed to update goal progress. Please try again.');
    } finally {
      setUpdatingGoalId(null);
    }
  };

  const handlePostGoalComment = async (goalId: string, parentId?: string) => {
    const text = newCommentText[goalId]?.trim();
    if (!text) {
      toast.warning('Please enter a comment before submitting.');
      return;
    }
    try {
      await addGoalComment({ id: goalId, comment: text, parentId }).unwrap();
      toast.success('Comment added to goal!');
      setNewCommentText(prev => ({ ...prev, [goalId]: '' }));
      refetchGoals();
    } catch {
      toast.error('Failed to post comment.');
    }
  };

  const handleOpenCompleteModal = (task: any) => {
    setSelectedTaskForComplete(task);
    setTaskCompletionDate(new Date().toISOString().split('T')[0]);
    setTaskHoursSpent(task.hoursSpent ? String(task.hoursSpent) : '3.5');
    setTaskCompletionNotes(task.completionNotes || '');
    setTaskArtifactUrl(task.artifactUrl || '');
  };

  const handleSubmitCompleteTask = async () => {
    if (!selectedTaskForComplete) return;
    try {
      await completeTask({
        id: selectedTaskForComplete.id,
        isCompleted: true,
        completedAt: taskCompletionDate,
        hoursSpent: parseFloat(taskHoursSpent) || 0,
        completionNotes: taskCompletionNotes,
        artifactUrl: taskArtifactUrl,
      }).unwrap();
      toast.success(`Task '${selectedTaskForComplete.title}' marked as completed!`);
      setSelectedTaskForComplete(null);
      refetchTasks();
      refetchOverview();
    } catch {
      toast.error('Failed to complete task.');
    }
  };

  const handleReopenTask = async (task: any) => {
    try {
      await completeTask({
        id: task.id,
        isCompleted: false,
      }).unwrap();
      toast.info(`Task '${task.title}' reopened as pending.`);
      refetchTasks();
      refetchOverview();
    } catch {
      toast.error('Failed to reopen task.');
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceTitle.trim()) {
      toast.warning('Please enter an evidence title.');
      return;
    }
    if (!evidenceUrl.trim() && !selectedFile) {
      toast.warning('Please attach a file or provide an external URL (PR / Figma / commit).');
      return;
    }

    try {
      setIsSubmittingEvidence(true);
      const formData = new FormData();
      if (evidenceGoalId) formData.append('goalId', evidenceGoalId);
      formData.append('title', evidenceTitle);
      formData.append('description', evidenceDescription);
      if (evidenceUrl) formData.append('externalUrl', evidenceUrl);
      if (selectedFile) formData.append('file', selectedFile);

      await submitEvidence(formData).unwrap();
      toast.success('Evidence submitted successfully for mentor verification!');
      setShowEvidenceModal(false);
      setEvidenceTitle('');
      setEvidenceDescription('');
      setEvidenceUrl('');
      setSelectedFile(null);
      refetchEvidence();
      refetchGoals();
    } catch {
      toast.error('Failed to submit evidence.');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  const handleSaveSelfAppraisal = async (isDraft: boolean) => {
    try {
      await submitSelfAppraisal({
        selfRating,
        achievements: achievementsText,
        challenges: challengesText,
        skillsAcquired: skillsText,
        mentorshipNeeds: mentorshipNeedsText,
        reflectionSummary: reflectionText,
        isDraft,
      }).unwrap();
      if (isDraft) {
        toast.info('Self-assessment draft saved successfully.');
      } else {
        toast.success('Self-appraisal submitted successfully to your mentor & HR!');
      }
      refetchSelfAppraisal();
      refetchOverview();
    } catch {
      toast.error('Failed to save self-appraisal.');
    }
  };

  const handleSendMentorReply = async () => {
    if (!mentorReplyText.trim()) {
      toast.warning('Please enter your response text.');
      return;
    }
    try {
      setIsSendingReply(true);
      await replyToFeedback({ replyText: mentorReplyText }).unwrap();
      toast.success('Reply submitted to mentor!');
      setMentorReplyText('');
      refetchFeedback();
    } catch {
      toast.error('Failed to send reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Loading State
  if (isOverviewLoading && !overviewData) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-700">Loading your Intern Dashboard…</p>
        <p className="text-xs text-slate-400">Retrieving assigned mentor, active cycle, and goals</p>
      </div>
    );
  }

  // Error State
  if (overviewError) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
          <AlertCircle size={24} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Unable to load intern dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">
            Could not retrieve performance metrics from the server. Please check your connection.
          </p>
        </div>
        <button
          onClick={() => refetchOverview()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const tabs: Array<{ id: DashboardTab; label: string; icon: React.ElementType; badge?: number }> = [
    { id: 'overview', label: 'Dashboard Overview', icon: Trophy },
    { id: 'goals', label: 'Assigned Goals', icon: Target, badge: goals.length },
    { id: 'tasks', label: 'Assigned Tasks', icon: ClipboardList, badge: scorecard?.pendingTasksCount },
    { id: 'evidence', label: 'Evidence Hub', icon: FileText, badge: evidenceList.length },
    { id: 'evaluation', label: 'Self-Assessment', icon: CheckCircle2 },
    {
      id: 'results',
      label: 'Published Results & Feedback',
      icon: Award,
      badge: publishedResults?.isPublished ? 1 : undefined,
    },
    { id: 'profile', label: 'Mentor & Profile', icon: User },
  ];

  return (
    <div className="space-y-5 pb-8 max-w-7xl mx-auto">
      {/* ============================================================== */}
      {/* HEADER & PORTAL BANNER */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Welcome back, {internProfile.name}!
            </h1>
            <span className="bg-amber-100 text-amber-800 font-bold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-300">
              Intern Workspace
            </span>
            <span className="bg-indigo-50 text-indigo-700 font-semibold text-[11px] px-2 py-0.5 rounded-full border border-indigo-200">
              {internProfile.cohort}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span>Department: <strong className="text-slate-700">{internProfile.department}</strong></span>
            <span>•</span>
            <span>Assigned Mentor: <strong className="text-indigo-700">{internProfile.mentorName}</strong> ({internProfile.mentorEmail})</span>
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

      {/* ============================================================== */}
      {/* PRIMARY TAB NAVIGATION */}
      {/* ============================================================== */}
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
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW & DEADLINES */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Top Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <DashboardStatCard
              title="Official Score"
              value={
                publishedResults?.isPublished && publishedResults.overallScore !== null
                  ? `${publishedResults.overallScore.toFixed(1)}%`
                  : 'Pending'
              }
              subtitle={
                publishedResults?.isPublished && publishedResults.classification
                  ? publishedResults.classification
                  : 'Evaluation In Progress'
              }
              icon={<Trophy size={16} />}
              color="blue"
            />
            <DashboardStatCard
              title="Goal Completion"
              value={`${scorecard?.averageProgress ?? 0}%`}
              subtitle={`${scorecard?.completedGoals ?? 0} of ${scorecard?.totalGoals ?? goals.length} goals completed`}
              icon={<Target size={16} />}
              color="green"
            />
            <DashboardStatCard
              title="Pending Tasks"
              value={scorecard?.pendingTasksCount ?? tasks.filter(t => !t.isCompleted).length}
              subtitle="Assigned Milestones"
              icon={<ClipboardList size={16} />}
              color="orange"
            />
            <DashboardStatCard
              title="Evaluation Cycle"
              value={cycle ? `${cycle.daysRemaining} Days` : 'Active'}
              subtitle={cycle?.name || 'Q3 2026 Cycle'}
              icon={<Clock size={16} />}
              color="purple"
            />
          </div>

          {/* Assigned Mentor Spotlight & Evaluation Cycle Widget */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Mentor Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Your Assigned Mentor
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <UserCheck size={12} />
                    Active Mentorship
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-lg flex items-center justify-center shrink-0 border border-indigo-200">
                    {internProfile.mentorName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">{internProfile.mentorName}</h3>
                    <p className="text-xs text-slate-600 font-medium">{internProfile.mentorDesignation}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
                      <Mail size={12} />
                      <a href={`mailto:${internProfile.mentorEmail}`} className="hover:text-indigo-600 underline">
                        {internProfile.mentorEmail}
                      </a>
                      <span>•</span>
                      <span>{internProfile.mentorDepartment}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Mentor Guidance & Code Reviews:</span>
                <button
                  onClick={() => setActiveTab('goals')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Review Goals with Mentor</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Active Evaluation Cycle Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Current Evaluation Cycle
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {cycle?.status || 'ACTIVE'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {cycle?.name || 'Q3 2026 Intern Performance Evaluation Cycle'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {cycle?.description || 'Mid-year performance milestone evaluation and technical review.'}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Review Period</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {cycle ? `${cycle.startDate} to ${cycle.endDate}` : 'Ongoing'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Current Phase</span>
                    <span className="text-xs font-bold text-indigo-600">
                      {cycle?.currentPhase || 'Self-Evaluation Open'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  ⏳ <strong>{cycle?.daysRemaining || 30} days</strong> remaining until cycle close
                </span>
                <button
                  onClick={() => setActiveTab('evaluation')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Self-Assessment</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* HR-Configured Evaluation Parameters & Weightages Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    HR Evaluation Parameters & Weightage Matrix
                  </h3>
                  <p className="text-xs text-slate-500">
                    Transparent assessment criteria and component weights decided by HR for your cohort.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowWeightDetails(!showWeightDetails)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/70 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showWeightDetails ? 'Collapse Parameters' : 'View Full Metric Breakdown'}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showWeightDetails ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* 3 Core Evaluation Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
                <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Target size={13} />
                  Goals & Deliverables
                </span>
                <div className="text-xl font-black text-slate-900">{weightDist.goals_and_kpis}%</div>
                <p className="text-[11px] text-slate-500">Milestone deliverables, PR merges & task completion.</p>
              </div>

              <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-1">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                  <UserCheck size={13} />
                  Mentor Evaluation
                </span>
                <div className="text-xl font-black text-slate-900">{weightDist.manager_evaluation}%</div>
                <p className="text-[11px] text-slate-500">Technical competence, code hygiene, and problem-solving.</p>
              </div>

              <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-100 space-y-1">
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                  <User size={13} />
                  Self-Assessment
                </span>
                <div className="text-xl font-black text-slate-900">{weightDist.self_assessment}%</div>
                <p className="text-[11px] text-slate-500">Self-rating (1–10) & qualitative reflection questions.</p>
              </div>
            </div>

            {/* Expandable Parameter List */}
            {showWeightDetails && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">
                  Specific Evaluation Parameters Decided by HR:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {evalParams.map((param: any, idx: number) => (
                    <div key={param.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 block">{param.name}</span>
                        <p className="text-[11px] text-slate-500 leading-snug">{param.description}</p>
                      </div>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-full shrink-0">
                        {param.weight}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11.5px] text-indigo-900 flex items-center gap-2">
                  <Sparkles size={15} className="text-indigo-600 shrink-0" />
                  <span>
                    Mathematical Scoring: Final Score = (Goals × {weightDist.goals_and_kpis}%) + (Mentor Review × {weightDist.manager_evaluation}%) + (Self-Rating × {weightDist.self_assessment}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Deadlines & Pending Tasks Tracker */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Upcoming Deadlines & Pending Tasks Tracker</h3>
              </div>
              <span className="text-xs text-slate-500">
                {deadlines.length} scheduled milestone deadlines
              </span>
            </div>

            {deadlines.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {deadlines.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        item.status === 'OVERDUE'
                          ? 'bg-red-500 ring-2 ring-red-100'
                          : item.status === 'DUE_TODAY'
                          ? 'bg-amber-500 ring-2 ring-amber-100'
                          : 'bg-indigo-500'
                      }`} />
                      <div>
                        <span className="text-xs font-semibold text-slate-800">{item.title}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-medium text-slate-600">Type: {item.type}</span>
                          <span>•</span>
                          <span>Due: {item.dueDate}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      item.status === 'OVERDUE'
                        ? 'bg-red-100 text-red-700'
                        : item.status === 'DUE_TODAY'
                        ? 'bg-amber-100 text-amber-800'
                        : item.daysLeft <= 3
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.status === 'OVERDUE'
                        ? 'Overdue'
                        : item.status === 'DUE_TODAY'
                        ? 'Due Today'
                        : `${item.daysLeft} days left`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                No imminent deadlines currently pending.
              </div>
            )}
          </div>

          {/* Published Results & Official Feedback Card (When Published) */}
          {publishedResults?.isPublished && (
            <div className="bg-gradient-to-br from-indigo-50/70 to-white border border-indigo-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Award size={20} className="text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Published Performance Results & Classification</h3>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded-full border border-emerald-300">
                  {publishedResults.classification || 'Outstanding Contributor'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[11px] text-slate-400 block">Calibrated Score</span>
                  <span className="text-xl font-black text-indigo-700">
                    {publishedResults.overallScore !== null ? `${publishedResults.overallScore.toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[11px] text-slate-400 block">Performance Tier</span>
                  <span className="text-sm font-bold text-slate-800">
                    {publishedResults.classification || 'Meets Expectations'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[11px] text-slate-400 block">Reviewing Mentor</span>
                  <span className="text-sm font-bold text-slate-800">
                    {publishedResults.reviewerName || internProfile.mentorName}
                  </span>
                </div>
              </div>

              {publishedResults.reviewerComments && (
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Published Mentor Remarks:</span>
                  <p className="text-slate-600 leading-relaxed italic">
                    "{publishedResults.reviewerComments}"
                  </p>
                </div>
              )}

              {/* Published Areas for Improvement */}
              {publishedResults.areasForImprovement && publishedResults.areasForImprovement.length > 0 && (
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-1.5">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600" />
                    Published Areas for Growth & Technical Improvement:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-amber-900/90 pl-1">
                    {publishedResults.areasForImprovement.map((area, idx) => (
                      <li key={idx}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-right">
                <button
                  onClick={() => setActiveTab('results')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View Full Appraisal Report & Reply to Mentor</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ASSIGNED GOALS & PROGRESS SLIDERS */}
      {/* ============================================================== */}
      {activeTab === 'goals' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Target size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Assigned Goals & Milestone Sliders</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update progress real-time, reply to mentor feedback, and attach evidence.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowEvidenceModal(true);
                if (goals.length > 0) setEvidenceGoalId(goals[0].id);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <UploadCloud size={14} />
              <span>Submit Evidence Against Goal</span>
            </button>
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
                {scorecard?.averageProgress ?? 0}%
              </div>
            </div>
          </div>

          {/* Goals List */}
          {isGoalsLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading assigned goals…</div>
          ) : goals.length > 0 ? (
            <div className="space-y-4">
              {goals.map((g) => {
                const isExpanded = !!expandedGoalComments[g.id];
                const comments = g.comments || [];

                return (
                  <div
                    key={g.id}
                    className="p-5 border border-slate-200 rounded-2xl hover:border-indigo-300 transition-all bg-white shadow-2xs space-y-4"
                  >
                    {/* Goal Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">{g.title}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            g.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {g.status.replace('_', ' ')}
                          </span>
                          {g.weightage && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {g.weightage}% Weight
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            g.priority === 'HIGH' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {g.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{g.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400 block">Progress</span>
                        <span className="text-lg font-black text-indigo-700">{g.progress}%</span>
                      </div>
                    </div>

                    {/* Progress Slider & Quick Buttons */}
                    <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                          <Edit3 size={13} className="text-indigo-600" />
                          Update Goal Progress (0–100%):
                        </span>
                        <span className="font-bold text-indigo-700">{g.progress}%</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={g.progress}
                          disabled={updatingGoalId === g.id}
                          onChange={(e) => handleUpdateProgress(g.id, parseInt(e.target.value))}
                          className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleUpdateProgress(g.id, Math.min(100, g.progress + 10))}
                            disabled={updatingGoalId === g.id || g.progress >= 100}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-bold text-slate-700 cursor-pointer disabled:opacity-40"
                          >
                            +10%
                          </button>
                          <button
                            onClick={() => handleUpdateProgress(g.id, 100)}
                            disabled={updatingGoalId === g.id || g.progress >= 100}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer disabled:opacity-40"
                          >
                            Mark 100%
                          </button>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            g.progress >= 100 ? 'bg-emerald-600' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${g.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Metadata & Actions row */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span>Due Date: <strong className="text-slate-700">{g.dueDate || 'End of Cycle'}</strong></span>
                        <span>•</span>
                        <span>Evidence: <strong>{g.evidenceCount || 0} attached</strong></span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setShowEvidenceModal(true);
                            setEvidenceGoalId(g.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                        >
                          <Paperclip size={12} />
                          <span>Attach Evidence</span>
                        </button>
                        <button
                          onClick={() => setExpandedGoalComments(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <MessageSquare size={12} />
                          <span>Comments & Notes ({comments.length})</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Comments & Reply Section */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 bg-slate-50/50 p-3.5 rounded-xl">
                        <span className="text-xs font-bold text-slate-700 block">
                          Goal Discussion & Mentor Notes:
                        </span>

                        {comments.length > 0 ? (
                          <div className="space-y-2">
                            {comments.map((c) => (
                              <div
                                key={c.id}
                                className={`p-3 rounded-xl text-xs space-y-1 ${
                                  c.isMentor
                                    ? 'bg-indigo-50/80 border border-indigo-200'
                                    : 'bg-white border border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900">{c.authorName}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                      c.isMentor ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-200 text-slate-700'
                                    }`}>
                                      {c.authorRole}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                                </div>
                                <p className="text-slate-700 leading-relaxed">{c.comment}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No notes posted yet on this goal.</p>
                        )}

                        {/* Add Comment Input */}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Add progress note or reply to mentor feedback..."
                            value={newCommentText[g.id] || ''}
                            onChange={(e) => setNewCommentText({ ...newCommentText, [g.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handlePostGoalComment(g.id);
                            }}
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => handlePostGoalComment(g.id)}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Send size={12} />
                            <span>Reply</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
      {/* TAB 3: ASSIGNED TASKS & STEP-BY-STEP INSTRUCTIONS */}
      {/* ============================================================== */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <ClipboardList size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Assigned Tasks & Milestone Instructions</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  View mentor instructions, mark work complete, and record completion details.
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
              {tasks.filter(t => !t.isCompleted).length} Tasks Pending
            </span>
          </div>

          {isTasksLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading assigned tasks…</div>
          ) : tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    task.isCompleted
                      ? 'bg-slate-50/70 border-slate-200'
                      : task.isOverdue
                      ? 'bg-red-50/20 border-red-200'
                      : 'bg-white border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          task.category === 'TECHNICAL'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : task.category === 'EVALUATION'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {task.category}
                        </span>
                        <h3 className={`text-sm font-bold ${task.isCompleted ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                          {task.title}
                        </h3>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          task.priority === 'HIGH' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Due Date: <strong className="text-slate-700">{task.dueDate}</strong>
                        {task.isOverdue && <span className="text-red-600 font-bold ml-2">⚠️ Overdue</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {task.isCompleted ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
                            <CheckCircle2 size={13} />
                            Completed on {task.completedAt}
                          </span>
                          <button
                            onClick={() => handleReopenTask(task)}
                            className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                          >
                            Reopen
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenCompleteModal(task)}
                          disabled={!task.isPermittedToComplete}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40"
                        >
                          <Check size={14} />
                          <span>Mark Work Complete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Task Instructions Box */}
                  <div className="p-3.5 bg-amber-50/50 border border-amber-200/80 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Info size={13} className="text-amber-600" />
                      Task Instructions & Acceptance Guidelines:
                    </span>
                    <p className="text-amber-950/80 whitespace-pre-line leading-relaxed font-mono text-[11px]">
                      {task.instructions}
                    </p>
                  </div>

                  {/* Completed info preview */}
                  {task.isCompleted && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Logged Hours</span>
                        <span className="font-semibold text-slate-800">{task.hoursSpent ? `${task.hoursSpent} hrs` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Deliverable Artifact</span>
                        {task.artifactUrl ? (
                          <a href={task.artifactUrl} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1">
                            <span>Open URL</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Completion Notes</span>
                        <span className="text-slate-700 truncate block">{task.completionNotes || '—'}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No tasks currently assigned.
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: EVIDENCE HUB & FILE / URL ATTACHMENTS */}
      {/* ============================================================== */}
      {activeTab === 'evidence' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <FolderGit2 size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Evidence Submission Hub</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submit proof of work against goals (attach files, PR links, Figma specs).
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowEvidenceModal(true);
                if (goals.length > 0) setEvidenceGoalId(goals[0].id);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <UploadCloud size={14} />
              <span>Submit New Evidence</span>
            </button>
          </div>

          {/* Evidence List */}
          {isEvidenceLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading submitted evidence…</div>
          ) : evidenceList.length > 0 ? (
            <div className="space-y-3">
              {evidenceList.map((e) => (
                <div key={e.id} className="p-4 border border-slate-200 rounded-xl bg-white shadow-2xs space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase">
                        {e.goalTitle}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{e.title}</h3>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      e.reviewStatus === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : e.reviewStatus === 'REVISION_REQUESTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {e.reviewStatus === 'APPROVED' ? 'Verified / Approved' : e.reviewStatus}
                    </span>
                  </div>

                  {e.description && (
                    <p className="text-xs text-slate-600 leading-relaxed">{e.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs pt-1 flex-wrap">
                    {e.externalUrl && (
                      <a
                        href={e.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:underline"
                      >
                        <LinkIcon size={12} />
                        <span>View Deliverable Link</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                    {e.fileName && (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Paperclip size={12} />
                        <span>File: {e.fileName}</span>
                      </span>
                    )}
                    <span className="text-slate-400">Submitted: {e.createdAt}</span>
                  </div>

                  {e.reviewNotes && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <span className="font-semibold text-slate-700 block mb-0.5">Mentor Verification Note:</span>
                      <p className="text-slate-600 italic">"{e.reviewNotes}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
              <FolderGit2 size={32} className="text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No evidence submitted yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Attach pull requests, code repositories, Figma designs, or test logs to verify your goal achievements.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: SELF-ASSESSMENT & HR QUESTIONNAIRE */}
      {/* ============================================================== */}
      {activeTab === 'evaluation' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Self-Appraisal & HR Questionnaire</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete your official self-rating and answer HR-published reflection questions.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              Self-Evaluation: OPEN
            </span>
          </div>

          {selfAppraisal?.isSubmitted && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Self-Evaluation Submitted on {selfAppraisal.submittedAt || 'Today'}</span>
              </div>
              <span className="bg-white px-3 py-1 rounded-lg border border-emerald-300 font-bold text-emerald-800">
                Self Rating: {selfAppraisal.selfRating} / 10
              </span>
            </div>
          )}

          {/* Self-Rating Slider / Stars */}
          <div className="p-5 bg-purple-50/40 border border-purple-100 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-900 block">
                  Overall Self-Rating (1.0 to 10.0 Scale):
                </label>
                <span className="text-[11px] text-slate-500">
                  Rate your overall performance, initiative, and delivery quality this cycle.
                </span>
              </div>
              <span className="text-2xl font-black text-purple-700">
                {selfRating.toFixed(1)} <span className="text-xs font-bold text-slate-400">/ 10.0</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={selfRating}
                onChange={(e) => setSelfRating(parseFloat(e.target.value))}
                className="w-full accent-purple-600 h-2.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>1.0 - Developing</span>
              <span>5.0 - Needs Guidance</span>
              <span>7.5 - Meets Expectations</span>
              <span className="font-bold text-purple-700">9.0+ - Exceptional Contributor</span>
            </div>
          </div>

          {/* HR Published Questionnaire */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              HR-Published Evaluation Questions
            </h3>

            {/* Q1: Key Achievements */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                1. Key Technical Deliverables & Milestones Achieved:
              </label>
              <textarea
                rows={3}
                placeholder="Highlight your key achievements, pull requests, features delivered, and architectural contributions..."
                value={achievementsText}
                onChange={(e) => setAchievementsText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Q2: Challenges */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                2. Technical Challenges Encountered & Problem-Solving Approach:
              </label>
              <textarea
                rows={3}
                placeholder="Describe any blockers or edge cases you diagnosed and how you resolved them..."
                value={challengesText}
                onChange={(e) => setChallengesText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Q3: Skills Mastered */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                3. Technical Skills, Frameworks & Tooling Mastered:
              </label>
              <textarea
                rows={2}
                placeholder="List languages, libraries, test automation frameworks, or design patterns you utilized..."
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Q4: Mentorship Needs */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                4. Focus Areas for Mentorship & Training in Next Sprint:
              </label>
              <textarea
                rows={2}
                placeholder="Where would you like targeted mentorship (e.g. system design, microservices, cloud)..."
                value={mentorshipNeedsText}
                onChange={(e) => setMentorshipNeedsText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Q5: Summary Reflection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                5. Self-Assessment Reflection Summary:
              </label>
              <textarea
                rows={2}
                placeholder="Summarize your overall growth, performance satisfaction, and upcoming goals..."
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => handleSaveSelfAppraisal(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSaveSelfAppraisal(false)}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              <span>Submit Final Self-Appraisal</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: PUBLISHED RESULTS, CLASSIFICATION & FEEDBACK */}
      {/* ============================================================== */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Award size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Published Results & Official Feedback</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calibrated scores, mentor feedback, classification, and published improvement areas.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-full">
              Confidentiality Shield Active
            </span>
          </div>

          {publishedFeedback?.isPublished ? (
            <div className="space-y-5">
              {/* Scorecard Hero */}
              <div className="p-6 bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                    Official Calibrated Result
                  </span>
                  <h3 className="text-lg font-black text-slate-900">{publishedFeedback.cycleName}</h3>
                  <p className="text-xs text-slate-500">
                    Reviewed by: <strong className="text-slate-700">{publishedFeedback.mentorName}</strong>
                    {publishedFeedback.publishedAt && <span> • Published on {publishedFeedback.publishedAt.split(' ')[0]}</span>}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-3xl font-black text-indigo-700">
                    {publishedFeedback.overallScore !== undefined ? `${publishedFeedback.overallScore.toFixed(1)}%` : '—'}
                  </span>
                  <div className="mt-1">
                    <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-3 py-0.5 rounded-full border border-emerald-300">
                      {publishedFeedback.performanceClassification || 'Outstanding Contributor'}
                    </span>
                  </div>
                </div>
              </div>

              {/* HR Evaluation Parameters & Weightages Breakdown */}
              <div className="p-5 border border-slate-200 rounded-2xl bg-white space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-indigo-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      HR Evaluation Parameters & Weightage Breakdown:
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Component Weights: Goals ({weightDist.goals_and_kpis}%) • Mentor ({weightDist.manager_evaluation}%) • Self ({weightDist.self_assessment}%)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  {evalParams.map((p: any, idx: number) => (
                    <div key={p.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 truncate">{p.name}</span>
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-full shrink-0">
                          {p.weight}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mentor Qualitative Feedback */}
              <div className="p-5 border border-slate-200 rounded-2xl bg-white space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Mentor Qualitative Feedback:
                  </h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  "{publishedFeedback.mentorFeedback}"
                </p>
              </div>

              {/* Committee Conclusion */}
              {publishedFeedback.finalConclusion && (
                <div className="p-4 border border-indigo-100 rounded-2xl bg-indigo-50/40 text-xs space-y-1">
                  <span className="font-bold text-indigo-950 block">HR Committee Verified Conclusion:</span>
                  <p className="text-indigo-900 leading-relaxed">{publishedFeedback.finalConclusion}</p>
                </div>
              )}

              {/* Published Areas for Improvement */}
              {publishedFeedback.areasForImprovement && publishedFeedback.areasForImprovement.length > 0 && (
                <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
                  <h4 className="text-xs font-bold text-amber-950 flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-600" />
                    Published Areas for Growth & Skill Improvement:
                  </h4>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-amber-900 pl-1 font-medium">
                    {publishedFeedback.areasForImprovement.map((area, idx) => (
                      <li key={idx}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reply to Mentor Comments Section */}
              <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/60 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  Reply to Mentor Feedback & Acknowledgment:
                </span>

                {publishedFeedback.replies && publishedFeedback.replies.length > 0 && (
                  <div className="space-y-2">
                    {publishedFeedback.replies.map((r) => (
                      <div key={r.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-700">Your Response:</span>
                          <span>{r.createdAt}</span>
                        </div>
                        <p className="text-slate-800">{r.replyText}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type response or note to your mentor..."
                    value={mentorReplyText}
                    onChange={(e) => setMentorReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMentorReply();
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <button
                    onClick={handleSendMentorReply}
                    disabled={isSendingReply}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={13} />
                    <span>Send Reply</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
              <ShieldCheck size={36} className="text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Evaluation In Progress</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Official mentor evaluations, calibrated scores, and recommendations will be published once HR completes calibration for the current cycle.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 7: PROFILE & MENTOR DETAILS */}
      {/* ============================================================== */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <User size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Intern Identity & Mentorship Information</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified user credentials and reporting hierarchy.
                </p>
              </div>
            </div>

            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <span>Edit Profile</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <User size={13} />
                <span>Full Name</span>
              </div>
              <div className="text-sm font-bold text-slate-900 truncate">{internProfile.name}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <Mail size={13} />
                <span>Corporate Email</span>
              </div>
              <div className="text-sm font-bold text-slate-900 truncate">{internProfile.email}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <Briefcase size={13} />
                <span>Designation</span>
              </div>
              <div className="text-sm font-bold text-slate-900">{internProfile.designation}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <Target size={13} />
                <span>Department</span>
              </div>
              <div className="text-sm font-bold text-slate-900">{internProfile.department}</div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200">
              <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-medium mb-1">
                <UserCheck size={13} />
                <span>Assigned Reporting Mentor</span>
              </div>
              <div className="text-sm font-bold text-indigo-950">{internProfile.mentorName}</div>
              <span className="text-[11px] text-indigo-600 block mt-0.5">{internProfile.mentorEmail}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <Hash size={13} />
                <span>Employee Code</span>
              </div>
              <div className="text-sm font-bold text-slate-900">{internProfile.employeeCode}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <Calendar size={13} />
                <span>Cohort / Joining Date</span>
              </div>
              <div className="text-sm font-bold text-slate-900">{internProfile.cohort}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <CheckCircle2 size={13} />
                <span>Employment Status</span>
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800">
                {internProfile.status}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <Info size={13} />
                <span>Contact Phone</span>
              </div>
              <div className="text-sm font-bold text-slate-900">{internProfile.phoneNumber}</div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EVIDENCE SUBMISSION MODAL */}
      {/* ============================================================== */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UploadCloud size={20} className="text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Submit Goal Evidence</h3>
              </div>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Goal</label>
                <select
                  value={evidenceGoalId}
                  onChange={(e) => setEvidenceGoalId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                >
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Evidence Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Authentication Subsystem Unit Test Log & PR #12"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Summarize the proof provided, test pass criteria, or acceptance details..."
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">External URL (PR / Figma / Commit)</label>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Attach File (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEvidence}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UploadCloud size={14} />
                  <span>{isSubmittingEvidence ? 'Submitting…' : 'Submit Evidence'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TASK COMPLETE & CONFIGURED FIELDS MODAL */}
      {/* ============================================================== */}
      {selectedTaskForComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Mark Work Complete</h3>
              </div>
              <button
                onClick={() => setSelectedTaskForComplete(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-800">{selectedTaskForComplete.title}</span>
              <p className="text-slate-500 font-mono text-[11px]">{selectedTaskForComplete.instructions}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Completion Date *</label>
                <input
                  type="date"
                  value={taskCompletionDate}
                  onChange={(e) => setTaskCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hours Spent</label>
                <input
                  type="number"
                  step="0.5"
                  value={taskHoursSpent}
                  onChange={(e) => setTaskHoursSpent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Artifact Link / URL (PR / Docs)</label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={taskArtifactUrl}
                  onChange={(e) => setTaskArtifactUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Completion Notes / Deliverables Summary</label>
                <textarea
                  rows={2}
                  placeholder="Summary of deliverables completed, tests run, or acceptance criteria satisfied..."
                  value={taskCompletionNotes}
                  onChange={(e) => setTaskCompletionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTaskForComplete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCompleteTask}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Confirm Completion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
