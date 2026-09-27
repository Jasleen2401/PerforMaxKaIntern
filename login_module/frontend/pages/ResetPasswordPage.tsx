import { useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { useResetPasswordMutation } from "../features/auth/authApi";
import { DailoqaLogo } from "../components/DailoqaLogo";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-toastify";

const ResetPasswordPage = () => {
  const { token: routeToken } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get("token");
  const token = routeToken || queryToken || "";

  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validation
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const matchesConfirm = Boolean(password && password === confirmPassword);

  const isFormValid = hasMinLength && hasLetter && hasNumber && matchesConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Password reset token is missing. Please check your reset link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await resetPassword({
        token,
        new_password: password,
        confirm_password: confirmPassword,
      }).unwrap();

      setSuccess(true);
      toast.success("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.data?.detail ||
        err?.data?.new_password?.[0] ||
        err?.message ||
        "Failed to reset password. The link may have expired or already been used.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <DailoqaLogo size="md" showTagline={true} taglineText="Performance Intelligence" />
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Set New Password</h1>
              <p className="text-xs text-slate-500">Corporate Password Recovery</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
            Please choose a strong, new password for your Dailoqa PERFORMAX account.
          </p>

          {/* Missing Token Warning */}
          {!token && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
              <AlertCircle size={16} className="shrink-0 text-amber-600" />
              <span>No reset token detected. Please use the complete link provided in your email.</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 animate-fade-in">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {success ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-2 mb-6 animate-fade-in">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Password Reset Successfully!</span>
              </div>
              <p className="text-slate-600">
                Your password has been updated. You will be redirected to the login page momentarily...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    disabled={!token || isLoading}
                    className="w-full bg-slate-50/80 focus:bg-white text-sm text-slate-900 pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

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
                    disabled={!token || isLoading}
                    className="w-full bg-slate-50/80 focus:bg-white text-sm text-slate-900 pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none disabled:opacity-50"
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

              {/* Requirements Checklist */}
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
                    Contains letters and numbers
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

              <button
                type="submit"
                disabled={!token || isLoading || !isFormValid}
                className="w-full mt-2 dailoqa-btn-primary py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Reset Password & Sign In
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <ArrowLeft size={14} />
              Return to Login
            </Link>
            <span className="text-[11px] text-slate-400">Zero Trust Authentication</span>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Dailoqa Enterprise Performance Management
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
