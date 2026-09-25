import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGetCurrentUserQuery } from "../features/employee/employeeapi";
import { useGetGoalSetByEmployeeQuery, useGetActiveCycleQuery } from "../services/kpiApi";
import {
  Settings,
  ThumbsUp,
  ThumbsDown,
  Star,
  Award,
  Eye,
  MessageSquare,
  Plus,
  Send,
  MessageCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "react-toastify";
import ProvideFeedbackModal from "../components/feedback/ProvideFeedbackModal";
import ChooseKraWeightageModal from "../components/kpi/ChooseKraWeightageModal";


const TABS = [
  "Key Accountability",
  "Goals",
  "KRA vs Goals",
  "Competency",
  "Skill Set",
  "Feedback",
  "Appraisal Data",
  "Multi-Rater Selection",
] as const;

type TabType = typeof TABS[number];

const AVATAR_COLORS = [
  { bg: "#EEF3FD", text: "#0C447C" },
  { bg: "#EAF3DE", text: "#27500A" },
  { bg: "#FAEEDA", text: "#633806" },
  { bg: "#F1EFE8", text: "#444441" },
  { bg: "#FCEBEB", text: "#791F1F" },
];

interface FeedbackItem {
  id: string;
  sender_name: string;
  sender_designation: string;
  recipient_name: string;
  feedback_type: string;
  category: string;
  message: string;
  is_anonymous: boolean;
  status: string;
  created_at: string;
  comments: Array<{
    id: string;
    author_name: string;
    comment: string;
    created_at: string;
  }>;
}

const formatDate = (date?: string) => {
  if (!date) return "Not set";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading: isProfileLoading } = useGetCurrentUserQuery();
  const { data: activeCycleResp } = useGetActiveCycleQuery();
  const activeCycle = activeCycleResp?.data;
  const activeCycleId = activeCycle?.cycleId;

  const [activeTab, setActiveTab] = useState<TabType>("Feedback");
  const [feedbackDirection, setFeedbackDirection] = useState<"received" | "given">("received");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isKraModalOpen, setIsKraModalOpen] = useState(false);

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackStats, setFeedbackStats] = useState({
    all: 0,
    positive: 0,
    negative: 0,
    observation: 0,
    rewards: 0,
    training: 0,
    satisfactory: 0,
    constructive: 0,
  });
  const [isFeedbacksLoading, setIsFeedbacksLoading] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});

  const { data: goalSetResp, refetch: refetchGoals } = useGetGoalSetByEmployeeQuery(
    { employeeId: profile?.id ?? 0, cycleId: activeCycleId ?? 0 },
    { skip: !profile?.id || !activeCycleId }
  );
  const goalSet = goalSetResp?.data;
  const goalItems = useMemo<any[]>(
    () => goalSet?.kpiItems ?? goalSet?.items ?? [],
    [goalSet?.items, goalSet?.kpiItems]
  );

  const fetchFeedbacks = useCallback(async () => {
    if (!profile?.id && !profile?.employeeCode) return;
    try {
      setIsFeedbacksLoading(true);
      const token = localStorage.getItem("accessToken") || "";
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const statsRes = await fetch(`/api/feedbacks/stats/${profile.id || profile.employeeCode}/`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.data) setFeedbackStats(statsData.data);
      }

      const queryParams = new URLSearchParams();
      queryParams.set("employeeId", String(profile.id || profile.employeeCode));
      queryParams.set("direction", feedbackDirection);
      if (categoryFilter && categoryFilter !== "ALL") {
        queryParams.set("category", categoryFilter);
      }

      const feedRes = await fetch(`/api/feedbacks/?${queryParams.toString()}`, { headers });
      if (feedRes.ok) {
        const feedData = await feedRes.json();
        const results = feedData.results || feedData.data || feedData;
        setFeedbacks(Array.isArray(results) ? results : []);
      }
    } catch {
      // ignore
    } finally {
      setIsFeedbacksLoading(false);
    }
  }, [profile, feedbackDirection, categoryFilter]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleAddComment = async (feedbackId: string) => {
    const comment = (newCommentText[feedbackId] || "").trim();
    if (!comment) return;

    try {
      const token = localStorage.getItem("accessToken") || "";
      const res = await fetch(`/api/feedbacks/${feedbackId}/comments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ comment }),
      });

      if (res.ok) {
        toast.success("Comment posted!");
        setNewCommentText((prev) => ({ ...prev, [feedbackId]: "" }));
        fetchFeedbacks();
      }
    } catch {
      toast.error("Error posting comment.");
    }
  };

  if (isProfileLoading || !profile) {
    return (
      <div className="py-16 text-center text-slate-400 text-sm">
        Loading employee profile...
      </div>
    );
  }

  const avatarColor = AVATAR_COLORS[(profile.staffName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Card matching media_1789919618455.png */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden shadow-xs"
            style={{ background: avatarColor.bg, color: avatarColor.text }}
          >
            {profile.profileImage && profile.profileImage !== "default.jpg" ? (
              <img
                src={`http://localhost:8000${profile.profileImage}`}
                alt={profile.staffName}
                className="w-full h-full object-cover"
              />
            ) : (
              profile.staffName?.charAt(0) || "?"
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">
                {profile.employeeCode} - {profile.staffName}
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {(profile as any).employmentStatus || "ACTIVE"}
              </span>

            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {profile.positionName || "Software Developer"} &bull;{" "}
              {profile.currentDepartmentName || "Engineering"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/profile/edit")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <Settings size={13} />
          Account Settings
        </button>
      </div>

      {/* 8 Sub-navigation Tabs */}
      <div className="border-b border-slate-200 bg-white px-3 pt-2 rounded-t-xl overflow-x-auto shadow-xs">
        <nav className="flex space-x-6 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* FEEDBACK TAB matching media_1789919618455.png */}
      {/* ========================================================================= */}
      {activeTab === "Feedback" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            {/* Segmented Toggle */}
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setFeedbackDirection("received")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  feedbackDirection === "received"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Received Feedback ({feedbackStats.all})
              </button>
              <button
                type="button"
                onClick={() => setFeedbackDirection("given")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  feedbackDirection === "given"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Given Feedback
              </button>
            </div>

            {/* Filter & Provide Feedback Button */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-lg outline-none cursor-pointer hover:border-slate-300 shadow-xs"
                >
                  <option value="ALL">All Feedback</option>
                  <option value="POSITIVE">Positive</option>
                  <option value="NEGATIVE">Negative</option>
                  <option value="OBSERVATION">Observation</option>
                  <option value="REWARDS">Rewards</option>
                  <option value="TRAINING">Training</option>
                  <option value="SATISFACTORY">Satisfactory</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                style={{ backgroundColor: "#007BFF" }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Provide Feedback
              </button>
            </div>
          </div>

          {/* 7 Counter Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div
              onClick={() => setCategoryFilter("ALL")}
              className={`p-3 rounded-xl border bg-white transition-all cursor-pointer shadow-xs ${
                categoryFilter === "ALL" ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"
              }`}
            >
              <div className="text-xs font-medium text-slate-500">All Feedback</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {String(feedbackStats.all).padStart(2, "0")}
              </div>
            </div>

            <div
              onClick={() => setCategoryFilter("POSITIVE")}
              className={`p-3 rounded-xl border bg-emerald-50/60 transition-all cursor-pointer shadow-xs ${
                categoryFilter === "POSITIVE" ? "border-emerald-500 ring-2 ring-emerald-100" : "border-emerald-200"
              }`}
            >
              <div className="text-xs font-medium text-emerald-800">Positive</div>
              <div className="text-xl font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                <ThumbsUp size={16} />
                {String(feedbackStats.positive).padStart(2, "0")}
              </div>
            </div>

            <div
              onClick={() => setCategoryFilter("NEGATIVE")}
              className={`p-3 rounded-xl border bg-rose-50/60 transition-all cursor-pointer shadow-xs ${
                categoryFilter === "NEGATIVE" ? "border-rose-500 ring-2 ring-rose-100" : "border-rose-200"
              }`}
            >
              <div className="text-xs font-medium text-rose-800">Negative</div>
              <div className="text-xl font-bold text-rose-700 mt-1 flex items-center gap-1.5">
                <ThumbsDown size={16} />
                {String(feedbackStats.negative).padStart(2, "0")}
              </div>
            </div>

            <div
              onClick={() => setCategoryFilter("OBSERVATION")}
              className={`p-3 rounded-xl border bg-slate-100/70 transition-all cursor-pointer shadow-xs ${
                categoryFilter === "OBSERVATION" ? "border-slate-400 ring-2 ring-slate-200" : "border-slate-200"
              }`}
            >
              <div className="text-xs font-medium text-slate-700">Observation</div>
              <div className="text-xl font-bold text-slate-700 mt-1 flex items-center gap-1.5">
                <Eye size={16} />
                {String(feedbackStats.observation).padStart(2, "0")}
              </div>
            </div>

            <div
              onClick={() => setCategoryFilter("REWARDS")}
              className={`p-3 rounded-xl border bg-amber-50/60 transition-all cursor-pointer shadow-xs ${
                categoryFilter === "REWARDS" ? "border-amber-500 ring-2 ring-amber-100" : "border-amber-200"
              }`}
            >
              <div className="text-xs font-medium text-amber-800">Rewards</div>
              <div className="text-xl font-bold text-amber-700 mt-1 flex items-center gap-1.5">
                <Award size={16} />
                {String(feedbackStats.rewards).padStart(2, "0")}
              </div>
            </div>

            <div
              onClick={() => setCategoryFilter("TRAINING")}
              className={`p-3 rounded-xl border bg-orange-50/60 transition-all cursor-pointer shadow-xs ${
                categoryFilter === "TRAINING" ? "border-orange-500 ring-2 ring-orange-100" : "border-orange-200"
              }`}
            >
              <div className="text-xs font-medium text-orange-800">Training</div>
              <div className="text-xl font-bold text-orange-700 mt-1 flex items-center gap-1.5">
                <Star size={16} />
                {String(feedbackStats.training).padStart(2, "0")}
              </div>
            </div>

            <div
              onClick={() => setCategoryFilter("SATISFACTORY")}
              className={`p-3 rounded-xl border bg-sky-50/60 transition-all cursor-pointer shadow-xs ${
                categoryFilter === "SATISFACTORY" ? "border-sky-500 ring-2 ring-sky-100" : "border-sky-200"
              }`}
            >
              <div className="text-xs font-medium text-sky-800">Satisfactory</div>
              <div className="text-xl font-bold text-sky-700 mt-1 flex items-center gap-1.5">
                <Star size={16} />
                {String(feedbackStats.satisfactory).padStart(2, "0")}
              </div>
            </div>
          </div>

          {/* Feedback Feed */}
          <div className="space-y-3">
            {isFeedbacksLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Loading feedbacks...</div>
            ) : feedbacks.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-sm text-slate-700">No feedbacks in this category</p>
              </div>
            ) : (
              feedbacks.map((fb) => {
                const isPositive =
                  fb.category === "POSITIVE" || fb.feedback_type === "POSITIVE" || fb.feedback_type === "PRAISE";
                const isNegative =
                  fb.category === "NEGATIVE" || fb.feedback_type === "NEGATIVE" || fb.feedback_type === "WARNING";
                const isTraining = fb.category === "TRAINING" || fb.category === "CONSTRUCTIVE";
                const accentColor = isPositive
                  ? "#22C55E"
                  : isNegative
                  ? "#EF4444"
                  : isTraining
                  ? "#F97316"
                  : "#3B82F6";

                const isExpanded = !!expandedComments[fb.id];

                return (
                  <div
                    key={fb.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                    style={{ borderLeft: `4px solid ${accentColor}` }}
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-700 overflow-hidden shrink-0 border border-slate-200">
                            {fb.sender_name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              You have received a {fb.category || "General"} Feedback from{" "}
                              <span className="text-blue-600 font-semibold cursor-pointer hover:underline">
                                {fb.sender_name}
                              </span>
                              .
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{formatDate(fb.created_at)}</div>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isNegative
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {isPositive ? <ThumbsUp size={12} /> : <Star size={12} />}
                          {fb.category || fb.feedback_type}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-700 leading-relaxed font-normal">
                        {fb.message}
                      </p>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComments((prev) => ({ ...prev, [fb.id]: !prev[fb.id] }))
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <MessageCircle size={13} />
                          Comments {fb.comments?.length ? `(${fb.comments.length})` : ""}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 bg-slate-50/50 p-3 rounded-lg">
                          {fb.comments && fb.comments.length > 0 ? (
                            fb.comments.map((c) => (
                              <div key={c.id} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between text-slate-500 mb-1">
                                  <span className="font-semibold text-slate-800">{c.author_name}</span>
                                  <span>{formatDate(c.created_at)}</span>
                                </div>
                                <p className="text-slate-700">{c.comment}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic">No comments yet.</p>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={newCommentText[fb.id] || ""}
                              onChange={(e) =>
                                setNewCommentText((prev) => ({ ...prev, [fb.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddComment(fb.id);
                              }}
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(fb.id)}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                              <Send size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* KRA vs Goals */}
      {activeTab === "KRA vs Goals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-800">My KRAs & Goal Alignments</h2>
              <p className="text-xs text-slate-500 mt-0.5">Assigned weightages summing to 100%.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsKraModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
              style={{ backgroundColor: "#007BFF" }}
            >
              <Plus size={14} />
              Review / Update KRAs
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
            {goalItems.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.customKpiName || item.kpiName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.categoryName || "Core KRA"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-full border border-blue-200">
                    {item.weightage ?? 35}%
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {item.status || "IN_PROGRESS"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competency (1-10 Rating) */}
      {activeTab === "Competency" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800">Assigned Competencies & Ratings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "Technical Problem Solving", rating: 9, desc: "Proficiency in debugging, database design, and algorithmic execution." },
              { name: "Code Quality & Documentation", rating: 8, desc: "High test coverage, code readability, and architecture diagrams." },
              { name: "Agile Ownership & Execution", rating: 9, desc: "Delivers sprint commitments on time with proactive communication." },
            ].map((c, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">{c.name}</span>
                  <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Star size={12} className="fill-amber-500 text-amber-500" />
                    {c.rating} / 10
                  </span>
                </div>
                <p className="text-xs text-slate-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill Set */}
      {activeTab === "Skill Set" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800">Skills & Proficiency</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: "Django & Python", level: "Advanced", pct: 92 },
              { name: "React & TypeScript", level: "Advanced", pct: 88 },
              { name: "PostgreSQL & SQL", level: "Advanced", pct: 85 },
            ].map((s, i) => (
              <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>{s.name}</span>
                  <span className="text-blue-600">{s.level}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <ProvideFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSuccess={fetchFeedbacks}
        defaultEmployeeId={profile?.id}
        employees={[
          {
            id: profile.id,
            employeeCode: profile.employeeCode,
            staffName: profile.staffName,
            designation: profile.positionName,
          },
        ]}
      />

      <ChooseKraWeightageModal
        isOpen={isKraModalOpen}
        onClose={() => setIsKraModalOpen(false)}
        onSuccess={() => {
          refetchGoals();
          toast.success("KRA goals updated!");
        }}
        employeeId={profile.id}
        employeeName={profile.staffName}
      />
    </div>
  );
};

export default ProfilePage;
