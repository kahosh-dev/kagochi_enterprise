import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  LogIn,
  ShieldCheck,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import "./App.css";
import "./styles/design.css";
import PublicWebsite from "./views/PublicWebsite";
import Header from "./components/Header";
import SideNav from "./components/SideNav";
import BottomNav from "./components/BottomNav";
import HomeView from "./views/HomeView";
import PoultryView from "./views/PoultryView";
import LivestockView from "./views/LivestockView";
import ProductionView from "./views/ProductionView";
import FeedingView from "./views/FeedingView";
import ExpensesView from "./views/ExpensesView";
import PerformanceView from "./views/PerformanceView";
import AdvisorView from "./views/AdvisorView";
import AdminView from "./views/AdminView";
import VaccinationsView from "./views/VaccinationsView";
import SurvivorView from "./views/SurvivorView";
import MortalityView from "./views/MortalityView";

import {
  loadPoultry,
  loadLivestock,
  loadProduction,
  loadExpenses,
  loadSurvivorSummary,
  loadVaccinations,
} from "./services/storage";
import { PeriodProvider } from "./context/PeriodContext";

import {
  getCurrentUser,
  login,
  register,
  logout,
  googleSignIn,
} from "./services/authService";

// Extend window for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, unknown>
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

type User = { id: string; name: string; email: string };

function App() {
  const [activeView, setActiveView] = useState("home");
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const [poultryCount, setPoultryCount] = useState(0);
  const [livestockCount, setLivestockCount] = useState(0);
  const [productionCount, setProductionCount] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [totalPoultryBirds, setTotalPoultryBirds] = useState(0);
  const [totalLivestockActive, setTotalLivestockActive] = useState(0);
  const [loadingFarmData, setLoadingFarmData] = useState(false);
  const [overdueVacCount, setOverdueVacCount] = useState(0);
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [publicView, setPublicView] = useState<'home' | 'about' | 'features' | 'how-it-works' | 'founder' | 'login'>('home');

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const authApiUrl = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://kagochi-enterprise.onrender.com" : "http://localhost:3001")).replace(/\/+$/, "");

  useEffect(() => {
    let active = true;
    fetch(`${authApiUrl}/api/health`, { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to check registration settings.");
        return response.json() as Promise<{ registrationEnabled?: boolean }>;
      })
      .then((data) => {
        if (active) setRegistrationEnabled(data.registrationEnabled === true);
      })
      .catch(() => {
        if (active) setRegistrationEnabled(false);
      });
    return () => { active = false; };
  }, [authApiUrl]);

  /* =====================================================
     CHECK LOGIN
     ===================================================== */

  useEffect(() => {
    async function checkAuthentication() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoadingAuth(false);
      }
    }

    checkAuthentication();
  }, []);

  /* =====================================================
     GOOGLE SIGN-IN BUTTON
     ===================================================== */

  useEffect(() => {
    // The auth form is mounted only after the visitor chooses Sign In.
    // Re-run when that view opens so the asynchronous Google SDK can render.
    setGoogleButtonReady(false);
    if (user || publicView !== "login" || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return;

    let attempts = 0;
    let interval: ReturnType<typeof setInterval> | undefined;

    const initGoogle = () => {
      const target = googleButtonRef.current;
      if (!window.google || !target) return false;

      target.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            setAuthLoading(true);
            setAuthError("");
            const res = await googleSignIn(response.credential);
            if (res.user) setUser(res.user);
            else { const current = await getCurrentUser(); setUser(current); }
          } catch (error) {
            setAuthError(error instanceof Error ? error.message : "Google sign-in failed. Please try again.");
          } finally {
            setAuthLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(target, {
        theme: "outline",
        size: "large",
        width: Math.min(360, Math.max(260, target.clientWidth || 320)),
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
      });
      setGoogleButtonReady(true);
      return true;
    };

    if (!initGoogle()) {
      interval = setInterval(() => {
        attempts += 1;
        if (initGoogle() || attempts >= 50) {
          if (interval) clearInterval(interval);
          if (attempts >= 50) setGoogleButtonReady(false);
        }
      }, 200);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, publicView]);

  /* =====================================================
     LOAD DASHBOARD DATA
     ===================================================== */

  useEffect(() => {
    if (!user) return;

    async function loadDashboardData() {
      try {
        setLoadingFarmData(true);
        const [poultry, livestock, production, expenses, survivors, vacData] = await Promise.all([
          loadPoultry(),
          loadLivestock(),
          loadProduction(),
          loadExpenses(),
          loadSurvivorSummary(),
          loadVaccinations(),
        ]);
        setPoultryCount(poultry.length);
        setLivestockCount(livestock.length);
        setProductionCount(production.length);
        setExpenseTotal(
          expenses.reduce((t, e) => t + Number(e.amount), 0)
        );
        setTotalPoultryBirds(survivors.totalPoultryBirds);
        setTotalLivestockActive(survivors.totalLivestockAnimals);
        const today = new Date().toISOString().slice(0, 10);
        const overdue = vacData.filter(v => v.status !== "completed" && v.dateDue && v.dateDue.slice(0, 10) < today);
        setOverdueVacCount(overdue.length);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoadingFarmData(false);
      }
    }

    loadDashboardData();
  }, [user, activeView]);

  /* =====================================================
     LOGIN / REGISTER
     ===================================================== */

  async function handleAuth() {
    setAuthError("");
    if (!email.trim() || !password) {
      setAuthError("Enter your email address and password to continue.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setAuthError("Enter a valid email address.");
      return;
    }
    if (authMode === "register") {
      if (registrationEnabled === false) {
        setAuthError("Self-registration is currently disabled. Ask the farm administrator to create your account.");
        return;
      }
      if (name.trim().length < 2) {
        setAuthError("Enter your name (at least 2 characters).");
        return;
      }
      if (password.length < 10 || password.length > 128) {
        setAuthError("Password must be at least 10 characters.");
        return;
      }
      if (!/[A-Za-z]/.test(password)) {
        setAuthError("Password must contain at least one letter.");
        return;
      }
      if (!/[0-9]/.test(password)) {
        setAuthError("Password must contain at least one number.");
        return;
      }
      if (password !== confirmPassword) {
        setAuthError("Your passwords do not match.");
        return;
      }
    }
    try {
      setAuthLoading(true);
      const response =
        authMode === "register"
          ? await register(name.trim(), email.trim(), password)
          : await login(email.trim(), password);
      if (response.user) setUser(response.user);
      else { const u = await getCurrentUser(); setUser(u); }
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed. Check your connection and try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  /* =====================================================
     LOGOUT
     ===================================================== */

  function handleLogout() {
    logout();
    setUser(null);
    setActiveView("home");
    setPoultryCount(0); setLivestockCount(0);
    setProductionCount(0); setExpenseTotal(0);
    setTotalPoultryBirds(0); setTotalLivestockActive(0);
    setOverdueVacCount(0);
  }

  /* =====================================================
     AUTH LOADING
     ===================================================== */

  if (loadingAuth) {
    return (
      <div className="kf-boot">
        <div className="kf-logo-mark"><Leaf size={26} strokeWidth={2} /></div>
        <h1>Kagochi Farm Enterprise</h1>
        <Loader2 size={28} className="kf-spin" aria-hidden="true" />
        <p>Loading your farm workspace…</p>
      </div>
    );
  }

  /* =====================================================
     LOGIN / REGISTER PAGE
     ===================================================== */

  if (!user) {
    if (publicView === 'login') {
      const isRegister = authMode === "register";
      // Strength: 0=empty 1=weak(<6) 2=fair(6-9) 3=good(10-12) 4=strong(13+)
      const strength =
        password.length === 0 ? 0
        : password.length < 6 ? 1
        : password.length < 10 ? 2
        : password.length < 13 ? 3 : 4;
      const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength] ?? "";
      const passwordSatisfied = password.length >= 6;
      const confirmMatch = confirmPassword.length > 0 && confirmPassword === password;
      const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== password;

      return (
        <div className="kf-auth-page">
          <div className="kf-auth-shell">

            {/* LEFT PANEL */}
            <aside className="kf-auth-showcase" aria-label="Farm management at a glance">
              <div className="kf-auth-showcase-top">
                <div className="kf-auth-brand">
                  <div className="kf-logo-mark"><Leaf size={22} strokeWidth={2} /></div>
                  <div>
                    <strong>Kagochi Farm</strong>
                    <span>Enterprise System</span>
                  </div>
                </div>

                <div className="kf-auth-hero-copy">
                  <span className="kf-auth-kicker"><span className="kf-auth-live-dot" /> Smart farming, made simple</span>
                  <h2 className="kf-auth-headline">Better decisions.<br /><em>Healthier returns.</em></h2>
                  <p className="kf-auth-copy">
                    One clear workspace for your poultry, livestock, production and farm finances.
                  </p>
                </div>

                <div className="kf-auth-features" aria-hidden="true">
                  <div className="kf-auth-feature"><img src="/images/farm/chicken.webp" alt="" className="kf-auth-feature-img" /> Poultry</div>
                  <div className="kf-auth-feature"><img src="/images/farm/cow.webp" alt="" className="kf-auth-feature-img" /> Livestock</div>
                  <div className="kf-auth-feature"><img src="/images/farm/eggs.webp" alt="" className="kf-auth-feature-img" /> Production</div>
                  <div className="kf-auth-feature"><img src="/images/farm/animal-feed.webp" alt="" className="kf-auth-feature-img" /> Feeding</div>
                  <div className="kf-auth-feature"><img src="/images/farm/vaccination.webp" alt="" className="kf-auth-feature-img" /> Vaccinations</div>
                  <div className="kf-auth-feature"><img src="/images/farm/chick.webp" alt="" className="kf-auth-feature-img" /> Survivors</div>
                  <div className="kf-auth-feature"><img src="/images/farm/operating-loss.webp" alt="" className="kf-auth-feature-img" /> Mortality</div>
                </div>

                <ul className="kf-auth-benefits" aria-hidden="true">
                  <li><CheckCircle2 size={14} /> Track poultry and livestock in one place</li>
                  <li><CheckCircle2 size={14} /> Monitor survivors, mortality and vaccinations</li>
                  <li><CheckCircle2 size={14} /> Understand income, expenses and profit</li>
                </ul>
              </div>

              <div className="kf-auth-showcase-bottom">
                <div className="kf-callout kf-callout--dark">
                  <div className="kf-callout-icon kf-callout-icon--lime"><TrendingUp size={18} /></div>
                  <div>
                    <strong className="kf-callout-title-light">Farm data that works for you</strong>
                    <p className="kf-callout-body-light">Track records, spot trends and plan with confidence.</p>
                  </div>
                </div>
                <div className="kf-auth-secure"><ShieldCheck size={15} /> Secure access to your farm workspace</div>
              </div>
            </aside>

            {/* RIGHT FORM CARD */}
            <div className="kf-auth-card" role="main" aria-labelledby="auth-title">

              {/* Back to website — polished pill */}
              <button
                type="button"
                className="kf-auth-back"
                onClick={() => setPublicView('home')}
                aria-label="Back to website"
              >
                <ArrowLeft size={14} className="kf-auth-back-arrow" aria-hidden="true" />
                Back to website
              </button>

              {/* Logo */}
              <div className="kf-auth-brand kf-auth-brand--card">
                <div className="kf-logo-mark"><Leaf size={23} strokeWidth={2} /></div>
                <div>
                  <strong style={{ color: "var(--kf-forest)" }}>Kagochi</strong>
                  <span style={{ color: "var(--kf-muted-2)" }}>Farm Enterprise</span>
                </div>
              </div>

              <h1 className="kf-auth-title" id="auth-title">
                {isRegister ? "Create your account" : "Welcome back"}
              </h1>
              <p className="kf-auth-subtitle">
                {isRegister
                  ? "Join Kagochi Farm Enterprise and start managing your farm smarter."
                  : "Sign in to access your farm analytics and decision support."}
              </p>

              {/* Alerts — always ABOVE the fields so no layout shift */}
              {authError && (
                <div className="kf-alert kf-alert--error kf-auth-alert" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{authError}</span>
                </div>
              )}
              {isRegister && registrationEnabled === false && (
                <div className="kf-auth-notice" role="status">
                  Self-registration is disabled. Please ask the farm administrator to create your account.
                </div>
              )}

              {/* Fields */}
              <div className="kf-auth-fields">

                {isRegister && (
                  <div className="kf-field">
                    <label htmlFor="auth-name" className="kf-label">
                      Full name<span className="kf-required" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      className="kf-input"
                      placeholder="Enter your full name"
                      value={name}
                      autoComplete="name"
                      autoFocus={isRegister}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={100}
                    />
                  </div>
                )}

                <div className="kf-field">
                  <label htmlFor="auth-email" className="kf-label">
                    Email address<span className="kf-required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    className="kf-input"
                    placeholder="Enter your email"
                    value={email}
                    autoComplete="email"
                    autoFocus={!isRegister}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={150}
                  />
                </div>

                <div className="kf-field">
                  <label htmlFor="auth-password" className="kf-label">
                    Password<span className="kf-required" aria-hidden="true">*</span>
                  </label>
                  {/* pw-wrap contains ONLY input + toggle — helper text lives outside */}
                  <div className="kf-pw-wrap">
                    <input
                      ref={passwordInputRef}
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      className="kf-input kf-input--pw"
                      placeholder={isRegister ? "Create a password" : "Enter your password"}
                      value={password}
                      autoComplete={isRegister ? "new-password" : "current-password"}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (!isRegister || confirmPassword)) handleAuth(); }}
                      required
                      maxLength={128}
                      aria-describedby={isRegister ? "pw-hint" : undefined}
                    />
                    <button
                      type="button"
                      className="kf-pw-toggle"
                      onClick={() => {
                        setShowPassword((v) => !v);
                        // Restore focus to input after toggle
                        setTimeout(() => passwordInputRef.current?.focus(), 0);
                      }}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                    </button>
                  </div>
                  {isRegister && (
                    <p className={`kf-pw-hint${passwordSatisfied ? " kf-pw-hint--ok" : ""}`} id="pw-hint">
                      <CheckCircle2 size={12} aria-hidden="true" />
                      At least 6 characters
                    </p>
                  )}
                  {isRegister && password.length > 0 && (
                    <div className="kf-strength" role="status" aria-live="polite" aria-label={`Password strength: ${strengthLabel}`}>
                      <div className="kf-strength-bars">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`kf-strength-bar${strength >= level ? " is-filled" : ""}${strength === 1 && level === 1 ? " is-weak" : ""}${strength === 2 && level <= 2 ? " is-fair" : ""}`}
                          />
                        ))}
                      </div>
                      <span className="kf-strength-label">{strengthLabel}</span>
                    </div>
                  )}
                </div>

                {isRegister && (
                  <div className="kf-field">
                    <label htmlFor="auth-confirm" className="kf-label">
                      Confirm password<span className="kf-required" aria-hidden="true">*</span>
                    </label>
                    <div className="kf-pw-wrap">
                      <input
                        ref={confirmPasswordInputRef}
                        id="auth-confirm"
                        type={showConfirmPassword ? "text" : "password"}
                        className={`kf-input kf-input--pw${confirmMismatch ? " kf-input--error" : confirmMatch ? " kf-input--ok" : ""}`}
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        autoComplete="new-password"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAuth(); }}
                        required
                        maxLength={128}
                        aria-invalid={confirmMismatch}
                        aria-describedby="confirm-msg"
                      />
                      <button
                        type="button"
                        className="kf-pw-toggle"
                        onClick={() => {
                          setShowConfirmPassword((v) => !v);
                          // Restore focus to input after toggle
                          setTimeout(() => confirmPasswordInputRef.current?.focus(), 0);
                        }}
                        aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                        aria-pressed={showConfirmPassword}
                      >
                        {showConfirmPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && (
                      <span
                        id="confirm-msg"
                        className={confirmMatch ? "kf-field-match" : "kf-field-error"}
                        role="alert"
                      >
                        {confirmMatch ? "\u2713 Passwords match" : "Passwords do not match"}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Primary submit */}
              <button
                type="button"
                className="kf-btn kf-btn--primary kf-auth-submit"
                onClick={handleAuth}
                disabled={authLoading || (isRegister && registrationEnabled === false)}
                aria-busy={authLoading}
              >
                {authLoading
                  ? <><Loader2 size={17} className="kf-spin" aria-hidden="true" /><span>{isRegister ? "Creating account\u2026" : "Signing in\u2026"}</span></>
                  : isRegister
                    ? <><UserPlus size={17} aria-hidden="true" /><span>Create account</span></>
                    : <><LogIn size={17} aria-hidden="true" /><span>Sign in</span></>
                }
              </button>

              {/* OR divider */}
              <div className="kf-auth-divider" aria-hidden="true"><span>OR CONTINUE WITH</span></div>

              {/* Google */}
              {GOOGLE_CLIENT_ID && (
                <div ref={googleButtonRef} className="kf-google-wrapper" aria-label="Sign in with Google" />
              )}
              {!googleButtonReady && (
                <button
                  type="button"
                  className="kf-google-fallback"
                  onClick={() => setAuthError("Google sign-in is not available in this deployment. Check VITE_GOOGLE_CLIENT_ID and allowed origins.")}
                  aria-label="Continue with Google"
                >
                  <svg className="kf-google-svg" viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              )}

              {/* Switch mode — prominent outlined button */}
              <div className="kf-auth-switch-wrap">
                <span className="kf-auth-switch-text">
                  {isRegister ? "Already have an account?" : "New to Kagochi Farm?"}
                </span>
                <button
                  type="button"
                  className="kf-btn kf-btn--outline kf-auth-switch-btn"
                  onClick={() => { setAuthError(""); setAuthMode(isRegister ? "login" : "register"); setConfirmPassword(""); }}
                >
                  {isRegister ? "Sign in instead" : "Create account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <PublicWebsite
        publicView={publicView}
        onNavigate={setPublicView}
        onLogin={() => setPublicView('login')}
      />
    );
  }
  /* =====================================================
     MAIN APPLICATION
     ===================================================== */

  return (
    <PeriodProvider activeView={activeView}>
      <div className="kf-app">
        <Header
          farmName="Kagochi Farm Enterprise"
          userName={user.name}
          activeView={activeView}
          onMenuToggle={() => setSideNavOpen(true)}
        />

        <SideNav
          isOpen={sideNavOpen}
          onClose={() => setSideNavOpen(false)}
          activeView={activeView}
          onNavigate={setActiveView}
          userName={user.name}
          userEmail={user.email}
          onLogout={handleLogout}
        />

        <div className="kf-content">
          {loadingFarmData && (
            <div style={{ padding: "10px 20px 0" }}>
              <div className="kf-alert kf-alert--info" role="status">
                <span>Updating farm overview…</span>
              </div>
            </div>
          )}

          {activeView === "home" && (
            <HomeView
              poultryCount={poultryCount}
              livestockCount={livestockCount}
              productionCount={productionCount}
              expenseTotal={expenseTotal}
              totalPoultryBirds={totalPoultryBirds}
              totalLivestockActive={totalLivestockActive}
              onNavigate={setActiveView}
            />
          )}
          {activeView === "poultry" && <PoultryView />}
          {activeView === "livestock" && <LivestockView />}
          {activeView === "production" && <ProductionView />}
          {activeView === "feeding" && <FeedingView />}
          {activeView === "expenses" && <ExpensesView />}
          {activeView === "performance" && <PerformanceView />}
          {activeView === "advisor" && <AdvisorView />}
          {activeView === "vaccinations" && <VaccinationsView />}
          {activeView === "survivors" && <SurvivorView />}
          {activeView === "mortality" && <MortalityView />}
          {activeView === "admin" && <AdminView />}
        </div>

        <BottomNav
          activeView={activeView}
          setActiveView={setActiveView}
          onMore={() => setSideNavOpen(true)}
          overdueVacCount={overdueVacCount}
        />
      </div>
    </PeriodProvider>
  );
}

export default App;
