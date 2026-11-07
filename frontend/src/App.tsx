import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
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
  const authApiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3001").replace(/\/+$/, "");

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
      const strength = password.length < 6 ? 1 : password.length < 8 ? 2 : password.length < 12 ? 3 : 4;

      return (
        <div className="kf-auth-page">
          <div className="kf-auth-shell">
            <aside className="kf-auth-showcase" aria-label="Farm management at a glance">
              <div>
                <div className="kf-auth-brand">
                  <div className="kf-logo-mark"><Leaf size={22} strokeWidth={2} /></div>
                  <div>
                    <strong>Kagochi Farm</strong>
                    <span>Enterprise System</span>
                  </div>
                </div>

                <div style={{ marginTop: 34 }}>
                  <span className="kf-auth-kicker"><span className="kf-auth-live-dot" /> Smart farming, made simple</span>
                  <h2 className="kf-auth-headline">Better decisions.<br /><em>Healthier returns.</em></h2>
                  <p className="kf-auth-copy">
                    One clear workspace for your poultry, livestock, production and farm finances.
                  </p>
                </div>

                <div className="kf-auth-features" style={{ marginTop: 24 }} aria-hidden="true">
                  <div className="kf-auth-feature"><img src="/images/farm/chicken.webp" alt="" className="kf-auth-feature-img" /> Poultry</div>
                  <div className="kf-auth-feature"><img src="/images/farm/cow.webp" alt="" className="kf-auth-feature-img" /> Livestock</div>
                  <div className="kf-auth-feature"><img src="/images/farm/eggs.webp" alt="" className="kf-auth-feature-img" /> Production</div>
                  <div className="kf-auth-feature"><img src="/images/farm/animal-feed.webp" alt="" className="kf-auth-feature-img" /> Feeding</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="kf-callout" style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }}>
                  <div className="kf-callout-icon" style={{ background: "rgba(134,239,172,0.16)", color: "var(--kf-green-300)" }}>
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <strong style={{ color: "var(--kf-surface)" }}>Farm data that works for you</strong>
                    <p style={{ color: "rgba(255,255,255,0.55)" }}>Track records, spot trends and plan with confidence.</p>
                  </div>
                </div>
                <div className="kf-auth-secure"><ShieldCheck size={15} /> Secure access to your farm workspace</div>
              </div>
            </aside>

            <div className="kf-auth-card" role="main" aria-labelledby="auth-title">
              <button
                type="button"
                className="kf-auth-back"
                onClick={() => setPublicView('home')}
                aria-label="Back to website"
              >
                <ArrowLeft size={15} />
                Back to website
              </button>

              <div className="kf-auth-brand" style={{ marginBottom: 22 }}>
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

              <div className="kf-auth-fields">
                {isRegister && (
                  <div className="kf-field">
                    <label htmlFor="auth-name" className="kf-label">Full name<span className="kf-required">*</span></label>
                    <input
                      id="auth-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      autoComplete="name"
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={100}
                    />
                  </div>
                )}

                <div className="kf-field">
                  <label htmlFor="auth-email" className="kf-label">Email address<span className="kf-required">*</span></label>
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={150}
                  />
                </div>

                <div className="kf-field">
                  <label htmlFor="auth-password" className="kf-label">Password<span className="kf-required">*</span></label>
                  <div className="kf-password-wrap">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={isRegister ? "Create a password" : "Enter your password"}
                      value={password}
                      autoComplete={isRegister ? "new-password" : "current-password"}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (!isRegister || confirmPassword)) handleAuth(); }}
                      required
                      maxLength={128}
                      aria-describedby={isRegister ? "auth-password-requirements" : undefined}
                    />
                    <button
                      type="button"
                      className="kf-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {isRegister && (
                    <p className="kf-password-hint" id="auth-password-requirements">
                      Password must be at least 6 characters.
                    </p>
                  )}
                  {isRegister && password.length > 0 && (
                    <div className="kf-strength">
                      <div className="kf-strength-bars">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`kf-strength-bar${strength >= level ? " is-filled" : ""}${strength === 1 ? " is-weak" : ""}`}
                          />
                        ))}
                      </div>
                      <span className="kf-strength-label">
                        {password.length < 6
                          ? "Too short (min 6 chars)"
                          : password.length < 8
                          ? "Good password"
                          : "Strong password"}
                      </span>
                    </div>
                  )}
                </div>

                {isRegister && (
                  <div className="kf-field">
                    <label htmlFor="auth-confirm-password" className="kf-label">Confirm password<span className="kf-required">*</span></label>
                    <div className="kf-password-wrap">
                      <input
                        id="auth-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Enter your password again"
                        value={confirmPassword}
                        autoComplete="new-password"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAuth(); }}
                        required
                        maxLength={128}
                        aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
                        aria-describedby={confirmPassword.length > 0 && confirmPassword !== password ? "auth-confirm-error" : undefined}
                      />
                      <button
                        type="button"
                        className="kf-password-toggle"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                        aria-pressed={showConfirmPassword}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && confirmPassword !== password && (
                      <span className="kf-field-error" id="auth-confirm-error">Passwords do not match yet.</span>
                    )}
                  </div>
                )}
              </div>

              {isRegister && registrationEnabled === false && (
                <div className="kf-auth-notice" role="status">
                  Self-registration is disabled. Please ask the farm administrator to create your account.
                </div>
              )}

              {authError && (
                <div className="kf-alert kf-alert--error" role="alert" style={{ marginTop: 14 }}>
                  <AlertCircle size={17} />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="button"
                className="kf-btn kf-btn--primary kf-auth-submit"
                onClick={handleAuth}
                disabled={authLoading || (isRegister && registrationEnabled === false)}
                aria-busy={authLoading}
              >
                {authLoading ? (
                  <Loader2 size={17} className="kf-spin" aria-hidden="true" />
                ) : isRegister ? (
                  <><UserPlus size={17} /><span>Create account</span></>
                ) : (
                  <><LogIn size={17} /><span>Sign in</span></>
                )}
              </button>

              <div className="kf-auth-divider" aria-hidden="true">
                <span>or continue with</span>
              </div>

              {GOOGLE_CLIENT_ID && (
                <div
                  ref={googleButtonRef}
                  className="kf-google-wrapper"
                  aria-label="Sign in with Google"
                />
              )}
              {!googleButtonReady && (
                <button
                  type="button"
                  className="kf-google-fallback"
                  onClick={() => setAuthError("Google sign-in is not ready in this deployment. Check VITE_GOOGLE_CLIENT_ID and the Google Identity Services allowed origins in Netlify and Google Cloud Console.")}
                  aria-label="Continue with Google"
                >
                  <span className="kf-google-mark" aria-hidden="true">G</span>
                  <span>Continue with Google</span>
                </button>
              )}

              <div className="kf-auth-switch">
                {isRegister ? (
                  <>
                    <span>Already have an account?</span>
                    <button type="button" onClick={() => { setAuthError(""); setAuthMode("login"); setConfirmPassword(""); }}>Sign in</button>
                  </>
                ) : (
                  <>
                    <span>New to Kagochi Farm?</span>
                    <button type="button" onClick={() => { setAuthError(""); setAuthMode("register"); setConfirmPassword(""); }}>Create account</button>
                  </>
                )}
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
  );
}

export default App;
