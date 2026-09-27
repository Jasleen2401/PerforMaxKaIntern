import { useState } from "react";
import { Link } from "react-router-dom";
import { useForgotPasswordMutation } from "../features/auth/authApi";
import { DailoqaLogo } from "../components/DailoqaLogo";
import { Mail, ArrowLeft, Send, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your registered Dailoqa corporate email.");
      return;
    }

    try {
      await forgotPassword({ email: email.trim() }).unwrap();
      setSubmitted(true);
    } catch (err: any) {
      // Even on failure, to protect against account enumeration, show generic guidance
      // unless it's a domain/network failure
      if (err?.status === "FETCH_ERROR" || err?.status === 502) {
        setError("Unable to connect to authentication server. Please check your network.");
      } else {
        setSubmitted(true);
      }
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
              <ShieldAlert size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Forgot Password</h1>
              <p className="text-xs text-slate-500">Corporate Account Recovery</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
            Enter your approved Dailoqa email address. If an account is registered, you will receive a secure password reset link.
          </p>

          {/* Success Message Banner */}
          {submitted ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-2 mb-6 animate-fade-in">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Reset Instructions Dispatched</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                If an active account exists for <strong>{email}</strong>, we have sent a secure password reset link. Please check your inbox and follow the instructions.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 animate-fade-in">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Corporate Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="name@dailoqa.com"
                      className="w-full bg-slate-50/80 focus:bg-white text-sm text-slate-900 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 dailoqa-btn-primary py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending Instructions...
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <ArrowLeft size={14} />
              Return to Login
            </Link>
            <span className="text-[11px] text-slate-400">Dailoqa EPMS Security</span>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Dailoqa Enterprise Performance Management
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
