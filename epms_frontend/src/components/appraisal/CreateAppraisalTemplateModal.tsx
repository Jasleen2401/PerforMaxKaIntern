import React, { useState } from "react";
import { X, User, Users, ShieldCheck, RefreshCw, Coins, Check } from "lucide-react";
import { toast } from "react-toastify";

interface CreateAppraisalTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateAppraisalTemplateModal: React.FC<CreateAppraisalTemplateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [templateName, setTemplateName] = useState("Q1 Appraisal Cycle 2025");
  const [description, setDescription] = useState("A comprehensive review of Q1 performance");

  // Assessment stages toggles
  const [selfAppraisal, setSelfAppraisal] = useState(true);
  const [multiRater, setMultiRater] = useState(false);
  const [managerReview, setManagerReview] = useState(true);

  // Post-appraisal processes toggles
  const [normalisation, setNormalisation] = useState(true);
  const [salaryHike, setSalaryHike] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Template name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("accessToken") || "";
      const response = await fetch("/api/performance/cycles/create-template/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          template_name: templateName.trim(),
          description: description.trim(),
          stages: {
            self_appraisal: selfAppraisal,
            multi_rater: multiRater,
            manager_review: managerReview,
          },
          post_processes: {
            normalisation: normalisation,
            salary_hike: salaryHike,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create appraisal template");
      }

      toast.success(data.message || "Appraisal template created successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Could not create appraisal template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(3px)" }}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        style={{ animation: "fadeIn 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Create Appraisal Template</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2-Column Form matching media_1789919691069.png */}
        <form onSubmit={handleCreate} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Template name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Q1 Appraisal Cycle 2025"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Template Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the scope, objectives, and cycle criteria..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              style={{ backgroundColor: "#4338CA" }}
            >
              {isSubmitting ? "Creating..." : "Create Appraisal Template"}
            </button>
          </div>

          {/* Right Column */}
          <div className="md:col-span-6 space-y-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            {/* Assessment Stages Section */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">
                How do you want to assess your employees?
              </h3>
              <div className="space-y-2.5">
                {/* Self Appraisal Card */}
                <div
                  onClick={() => setSelfAppraisal(!selfAppraisal)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selfAppraisal
                      ? "bg-blue-50/40 border-blue-400 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Self Appraisal</div>
                      <div className="text-xs text-slate-400">An employee’s analysis of their own performance</div>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      selfAppraisal ? "bg-blue-600 text-white" : "border-2 border-slate-300 bg-white"
                    }`}
                  >
                    {selfAppraisal && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>

                {/* Multi-rater Card */}
                <div
                  onClick={() => setMultiRater(!multiRater)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    multiRater
                      ? "bg-purple-50/40 border-purple-400 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <Users size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Multi-rater</div>
                      <div className="text-xs text-slate-400">Feedback taken from other team members with whom...</div>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      multiRater ? "bg-blue-600 text-white" : "border-2 border-slate-300 bg-white"
                    }`}
                  >
                    {multiRater && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>

                {/* Manager Review Card */}
                <div
                  onClick={() => setManagerReview(!managerReview)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    managerReview
                      ? "bg-emerald-50/40 border-emerald-400 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Manager Review</div>
                      <div className="text-xs text-slate-400">The final stage of feedback given by the reviewers chosen...</div>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      managerReview ? "bg-blue-600 text-white" : "border-2 border-slate-300 bg-white"
                    }`}
                  >
                    {managerReview && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Post-Appraisal Processes Section */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">
                What processes do you want to run after the appraisal?
              </h3>
              <div className="space-y-2.5">
                {/* Normalisation Card */}
                <div
                  onClick={() => setNormalisation(!normalisation)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    normalisation
                      ? "bg-amber-50/40 border-amber-400 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <RefreshCw size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Normalisation</div>
                      <div className="text-xs text-slate-400">It is the process of adjusting employee ratings according...</div>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      normalisation ? "bg-blue-600 text-white" : "border-2 border-slate-300 bg-white"
                    }`}
                  >
                    {normalisation && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>

                {/* Salary Hike Card */}
                <div
                  onClick={() => setSalaryHike(!salaryHike)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    salaryHike
                      ? "bg-rose-50/40 border-rose-400 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <Coins size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Salary Hike</div>
                      <div className="text-xs text-slate-400">The process of altering the salary of an employee at the end ...</div>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      salaryHike ? "bg-blue-600 text-white" : "border-2 border-slate-300 bg-white"
                    }`}
                  >
                    {salaryHike && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAppraisalTemplateModal;
