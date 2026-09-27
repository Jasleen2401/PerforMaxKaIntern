import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChangePasswordMutation } from "../features/auth/authApi";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { passwordChangeCompleted } from "../features/auth/authSlice";
import { DailoqaLogo } from "../components/DailoqaLogo";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";

const ChangePasswordPage = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const isForced = Boolean(
    (user as any)?.password_change_required ||
    (user as any)?.user?.password_change_required
  );

  // Password rules validation
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const matchesConfirm = Boolean(newPassword && newPassword === confirmPassword);
  const isDifferentFromOld = Boolean(newPassword && newPassword !== oldPassword);

  const isFormValid =
    oldPassword.trim().length > 0 &&
    hasMinLength &&
    hasLetter &&
    hasNumber &&
    matchesConfirm &&
    isDifferentFromOld;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPassword.trim()) {
      setError("Please enter your current or temporary password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword === oldPassword) {
      setError("New password must be different from your current/temporary password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      const res = await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }).unwrap();

      dispatch(passwordChangeCompleted());
      toast.success(res.message || "Password updated successfully!");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.data?.detail ||
        err?.data?.new_password?.[0] ||
        err?.data?.old_password?.[0] ||
        err?.data?.confirm_password?.[0] ||
        err?.message ||
        "Failed to update password. Please check your credentials.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Left Form Panel */}
      <div className="flex-1 flex flex-col justify-between px-8 py-10 lg:px-16 xl:px-24 bg-white border-r border-slate-200/80">
        <div>
          {/* Logo */}
          <div className="mb-8">
            <DailoqaLogo size="md" showTagline={true} taglineText="Performance Intelligence" />
          </div>

          <div className="max-w-md">
            {/* Header Badge */}
            {isForced ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 mb-4 animate-fade-in">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                <span>First-Time Sign In &bull; Password Change Required</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 mb-4">
                <ShieldCheck size={14} className="text-indigo-600 shrink-0" />
                <span>Security Settings &bull; Update Password</span>
              </div>
            )}

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
              {isForced ? "Set Your Permanent Password" : "Change Account Password"}
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              {isForced
                ? "Your initial temporary credential must be replaced with a secure personal password to activate your PerforMax workspace."
                : "Choose a strong, unique password to keep your account protected."}
            </p>

            {/* Error Message Banner */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 animate-fade-in">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Old/Temporary Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  {isForced ? "Initial / Temporary Passcode" : "Current Password"}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showOld ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder={isForced ? "e.g. Your first name in lowercase" : "••••••••••••"}
                    required
                    className="w-full bg-slate-50/80 focus:bg-white text-sm text-slate-900 pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  New Secure Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-50/80 focus:bg-white text-sm text-slate-900 pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-50/80 focus:bg-white text-sm text-slate-900 pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
                <span className="block font-semibold text-slate-600 mb-1 text-[11px] uppercase tracking-wider">
                  Password Requirements
                </span>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className={hasMinLength ? "text-emerald-600" : "text-slate-300"}
                  />
                  <span className={hasMinLength ? "text-emerald-800 font-medium" : "text-slate-500"}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className={hasLetter && hasNumber ? "text-emerald-600" : "text-slate-300"}
                  />
                  <span className={hasLetter && hasNumber ? "text-emerald-800 font-medium" : "text-slate-500"}>
                    Contains both letters and numbers
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className={matchesConfirm ? "text-emerald-600" : "text-slate-300"}
                  />
                  <span className={matchesConfirm ? "text-emerald-800 font-medium" : "text-slate-500"}>
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full mt-2 dailoqa-btn-primary py-3 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating Password...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck size={16} />
                    {isForced ? "Save & Activate Workspace" : "Update Password"}
                    <ArrowRight size={14} />
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-400 mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span>Dailoqa Security & Identity Governance</span>
          <span>v2.4 Enterprise</span>
        </div>
      </div>

      {/* Right Brand Showcase Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B0F17] text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle, #4338CA 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-indigo-300">
            <Sparkles size={13} className="text-indigo-400" />
            <span>PERFORMAX &bull; Account Protection</span>
          </div>
        </div>

        <div className="relative z-10 my-auto py-12 max-w-lg">
          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white mb-6">
            Secure Onboarding for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
              Dailoqa Teams.
            </span>
          </h2>
          <p className="text-slate-300 text-sm xl:text-base leading-relaxed mb-8">
            Every user initializes their journey with verified corporate credentials and individualized security policies.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-white/10">
          <span>PERFORMAX Enterprise</span>
          <span className="text-slate-400 font-mono">Zero Trust Architecture</span>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
