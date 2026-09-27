import { useState, useEffect } from "react";
import { useLoginMutation } from "../features/auth/authApi";
import { useAppDispatch } from "../hooks/reduxHooks";
import { loginSuccess } from "../features/auth/authSlice";
import { useNavigate, useLocation, Link } from "react-router-dom";

import { DailoqaLogo } from "../components/DailoqaLogo";
import {
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "react-toastify";

const DEMO_ACCOUNTS = [
  { role: "Super Admin", email: "admin@company.com", pass: "AdminPassword123!", badge: "Full Access" },
  { role: "HR Partner", email: "sarah.hr@company.com", pass: "SarahPassword123!", badge: "HR Ops" },
  { role: "Tech Manager", email: "marcus.tech@company.com", pass: "MarcusPassword123!", badge: "Evaluator" },
  { role: "Intern", email: "alex.dev@company.com", pass: "AlexPassword123!", badge: "Self-Review" },
];

const LoginPage = () => {
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // OTP state
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);

  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  // Clean any legacy lockout keys on mount
  useEffect(() => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("login_attempts"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await login({ email: email.trim(), password }).unwrap();
      dispatch(loginSuccess(response));

      const needsChange = Boolean(
        response.password_change_required ||
        response.user?.password_change_required ||
        response.data?.password_change_required
      );

      if (needsChange) {
        toast.info("First-time sign in detected. Please choose your permanent password.");
        navigate("/change-password", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {

      let msg =
        err?.data?.detail ||
        err?.data?.message ||
        err?.message;
      if (!msg || err?.status === 502 || err?.status === "FETCH_ERROR") {
        if (err?.status === 502 || err?.status === "FETCH_ERROR") {
          msg = "Unable to connect to authentication server. Please ensure backend is running.";
        } else {
          msg = "Invalid credentials. Please try again.";
        }
      }
      setError(msg);
    }
  };

  // Handle Send OTP (Module 1 in notebook)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }
    setError("");
    setIsOtpSending(true);

    try {
      const res = await fetch("/api/auth/otp/send/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to dispatch verification code.");
      }
      setOtpSent(true);
      if (data.data?.emailDispatched) {
        setOtpInfo("Verification code delivered to your registered email inbox.");
        toast.success("Verification code dispatched to your email!");
      } else {
        setOtpInfo(data.data?.otp ? `Dev Passcode: ${data.data.otp}` : "Verification code generated.");
        toast.info("Passcode generated! Enter code or use universal passcode.");
      }
    } catch (err: any) {
      setError(err.message || "Could not dispatch OTP. Verify your email address.");
    } finally {
      setIsOtpSending(false);
    }
  };

  // Handle Verify OTP & Login (Module 1 in notebook)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setError("");
    setIsOtpVerifying(true);

    try {
      const res = await fetch("/api/auth/otp/verify/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid or expired verification code.");
      }

      const authData = data.data;
      const userPayload: any = {
        accessToken: authData.access,
        token: authData.access,
        refreshToken: authData.refresh,
        user: {
          id: authData.user.id,
          username: authData.user.username,
          email: authData.user.email,
          staffName: authData.profile?.full_name || authData.user.username,
          role: authData.roles?.[0] || "INTERN",
          department: authData.profile?.department,
          designation: authData.profile?.designation,
          roles: authData.roles || ["INTERN"],
          permissions: authData.permissions || [],
        },
      };

      dispatch(loginSuccess(userPayload as any));
      toast.success("Authenticated via OTP!");
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setIsOtpVerifying(false);
    }
  };

  const handleQuickPersona = (account: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(account.email);
    setPassword(account.pass);
    setError("");
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Left Form Panel */}
      <div className="flex-1 flex flex-col justify-between px-8 py-10 lg:px-16 xl:px-24 bg-white border-r border-slate-200/80">
        <div>
          {/* Dailoqa Logo */}
          <div className="mb-8">
            <DailoqaLogo size="md" showTagline={true} taglineText="Performance Intelligence" />
          </div>

          <div className="max-w-md">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
              Sign In to PERFORMAX
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              Enterprise Performance Management System (EPMS).
            </p>

            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setLoginMode("password");
                  setError("");
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  loginMode === "password"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode("otp");
                  setError("");
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  loginMode === "otp"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                One-Time Passcode (OTP)
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 animate-fade-in">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Password Login Form */}
            {loginMode === "password" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Corporate Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@dailoqa.com"
                      required
                      className="w-full bg-slate-50/80 focus:bg-white text-sm text-slate-900 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Security Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full bg-slate-50/80 focus:bg-white text-sm text-slate-900 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11.5px] text-indigo-900 leading-relaxed">
                  <span className="font-semibold">💡 First-time signing in?</span> Use your Dailoqa email (e.g. <code>jasleen.kaur@dailoqa.com</code>) and your first name in lowercase (e.g. <code>jasleen</code>) as your initial passcode.
                </div>


                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 dailoqa-btn-primary py-3 text-sm font-semibold rounded-xl"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <LogIn size={16} />
                      Sign In to PMS
                    </span>
                  )}
                </button>
              </form>
            ) : (
              /* OTP Login Form */
              <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.dev@company.com"
                      required
                      disabled={otpSent}
                      className="w-full bg-slate-50/80 focus:bg-white text-sm text-slate-900 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

                {otpSent && (
                  <div className="animate-fade-in space-y-3">
                    {otpInfo && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-medium">
                          <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                          <span>{otpInfo}</span>
                        </span>
                        {otpInfo.includes("Dev Passcode:") && (
                          <button
                            type="button"
                            onClick={() => {
                              const match = otpInfo.match(/\d{6}/);
                              if (match) setOtpCode(match[0]);
                            }}
                            className="text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-100/60 px-2.5 py-1 rounded-lg border border-indigo-200 shadow-xs transition-colors shrink-0"
                          >
                            ⚡ Auto-Fill Code
                          </button>
                        )}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                          6-Digit Verification Passcode
                        </label>
                        <button
                          type="button"
                          onClick={() => setOtpCode("123456")}
                          className="text-[10.5px] text-indigo-600 hover:underline font-semibold"
                        >
                          Use Universal (123456)
                        </button>
                      </div>
                      <div className="relative">
                        <KeyRound size={16} className="absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="••••••"
                          maxLength={6}
                          required
                          className="w-full bg-slate-50/80 focus:bg-white text-base tracking-widest font-mono text-slate-900 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none text-center"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isOtpSending || isOtpVerifying}
                  className="w-full mt-2 dailoqa-btn-indigo py-3 text-sm font-semibold rounded-xl"
                >
                  {isOtpSending ? (
                    "Dispatching OTP..."
                  ) : isOtpVerifying ? (
                    "Verifying & Logging in..."
                  ) : otpSent ? (
                    <span className="flex items-center justify-center gap-2">
                      <ShieldCheck size={16} />
                      Verify & Access Workspace
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Zap size={16} />
                      Send Verification Code
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* 1-Click Persona Quick Fill for Testing */}
            <div className="mt-8 pt-6 border-t border-slate-200/70">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  Instant Demo Persona Sign-In
                </span>
                <span className="text-[10.5px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  1-Click Select
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickPersona(acc)}
                    className="flex flex-col text-left p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-indigo-50/70 hover:border-indigo-200 transition-all group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700">
                        {acc.role}
                      </span>
                      <span className="text-[9.5px] font-semibold text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.2">
                        {acc.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 group-hover:text-indigo-600 truncate mt-0.5">
                      {acc.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-400 mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span>Dailoqa Combined Intelligence Architecture</span>
          <span>v2.4 Enterprise</span>
        </div>
      </div>

      {/* Right Brand Showcase Panel (Dailoqa Dark Obsidian) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B0F17] text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Background gradient orb */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #4338CA 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)",
          }}
        />

        {/* Top Tagline Pill */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-indigo-300">
            <Sparkles size={13} className="text-indigo-400" />
            <span>PERFORMAX • Performance Intelligence Platform</span>
          </div>
        </div>

        {/* Center Philosophy & Quote */}
        <div className="relative z-10 my-auto py-12 max-w-lg">
          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white mb-6">
            Human expertise and performance intelligence,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
              working as one.
            </span>
          </h2>
          <p className="text-slate-300 text-sm xl:text-base leading-relaxed mb-8">
            “Continuous feedback, calibrated weightages, and objective growth for every team member.”
          </p>

          {/* Value Props Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                Continuous Feedback
              </div>
              <div className="text-xs text-slate-300">
                Peer & 360 multi-rater streams with anonymous sentiment tagging.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                KRA 100% Weightage
              </div>
              <div className="text-xs text-slate-300">
                Automated calibration strictly enforcing objective balance.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                Governance by Design
              </div>
              <div className="text-xs text-slate-300">
                Full audit trail, super admin re-reviews, and executive exports.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                1–10 Rating Scale
              </div>
              <div className="text-xs text-slate-300">
                Unified competency matrices for self and managerial evaluations.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Citation */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-white/10">
          <span>PERFORMAX Enterprise</span>
          <span className="text-slate-400 font-mono">v2.0 • Production</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;