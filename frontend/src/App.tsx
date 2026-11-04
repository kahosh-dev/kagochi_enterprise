import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Leaf, LogIn, UserPlus, ArrowLeft, Bird, Beef, Egg, Wheat, ShieldCheck, TrendingUp } from "lucide-react";
import "./App.css";
import PublicWebsite from "./views/PublicWebsite";
import FarmBackground from "./components/FarmBackground";

import Header from "./components/Header";
import SideNav from "./components/SideNav";
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
  const [loadingFarmData, setLoadingFarmData] = useState(false);
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
        const [poultry, livestock, production, expenses] = await Promise.all([
          loadPoultry(),
          loadLivestock(),
          loadProduction(),
          loadExpenses(),
        ]);
        setPoultryCount(poultry.length);
        setLivestockCount(livestock.length);
        setProductionCount(production.length);
        setExpenseTotal(
          expenses.reduce((t, e) => t + Number(e.amount), 0)
        );
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
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim())) {
      setAuthError("Enter a valid email address.");
      return;
    }
    if (authMode === "register") {
      if (registrationEnabled !== true) {
        setAuthError("Self-registration is currently disabled. Ask the farm administrator to create your account.");
        return;
      }
      if (name.trim().length < 2) {
        setAuthError("Enter your name (at least 2 characters).");
        return;
      }
      if (password.length < 10 || password.length > 128 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        setAuthError("Use 10–128 characters and include at least one letter and one number.");
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
  }

  /* =====================================================
     AUTH LOADING
     ===================================================== */

  if (loadingAuth) {
    return (
      <div className="app-loading">
        <div className="app-loading-card">
          <div className="loading-spinner"></div>
          <h2>Kagochi Farm Enterprise</h2>
          <p>Loading your farm workspace...</p>
        </div>
      </div>
    );
  }

  /* =====================================================
     LOGIN / REGISTER PAGE
     ===================================================== */

  if (!user) {
    if (publicView === 'login') {
      const isRegister = authMode === "register";
      return (
        <div className="auth-page">
          {/* Animated farm background — behind everything */}
          <FarmBackground />

          {/* Farm-focused visual panel; Lucide icons stay crisp at every screen size. */}
          <aside className="auth-showcase" aria-label="Farm management at a glance">
            <div className="auth-showcase-kicker"><span className="auth-live-dot" /> SMART FARMING, MADE SIMPLE</div>
            <h2>Better decisions.<br /><span>Healthier returns.</span></h2>
            <p>One clear workspace for your poultry, livestock, production and farm finances.</p>
            <div className="auth-showcase-icons" aria-hidden="true">
              <div className="auth-farm-icon auth-farm-icon--bird"><Bird size={25} strokeWidth={1.8} /><span>Poultry</span></div>
              <div className="auth-farm-icon auth-farm-icon--cattle"><Beef size={25} strokeWidth={1.8} /><span>Livestock</span></div>
              <div className="auth-farm-icon auth-farm-icon--eggs"><Egg size={25} strokeWidth={1.8} /><span>Production</span></div>
              <div className="auth-farm-icon auth-farm-icon--feed"><Wheat size={25} strokeWidth={1.8} /><span>Feeding</span></div>
            </div>
            <div className="auth-showcase-promise">
              <div className="auth-promise-icon"><TrendingUp size={19} /></div>
              <div><strong>Farm data that works for you</strong><span>Track records, spot trends and plan with confidence.</span></div>
            </div>
            <div className="auth-showcase-security"><ShieldCheck size={16} /> Secure access to your farm workspace</div>
          </aside>

          {/* Frosted-glass form card */}
          <div className="auth-card" role="main" aria-labelledby="auth-title">

            {/* Back to website link */}
            <button
              className="auth-back-link"
              onClick={() => setPublicView('home')}
              aria-label="Back to website"
            >
              <ArrowLeft size={15} />
              Back to website
            </button>

            {/* Brand logo */}
            <div className="auth-logo-row">
              <div className="auth-logo">
                <Leaf size={28} strokeWidth={2} />
              </div>
              <div className="auth-brand-text">
                <span className="auth-brand-name">Kagochi</span>
                <span className="auth-brand-sub">Farm Enterprise</span>
              </div>
            </div>

            {/* Heading */}
            <div className="auth-heading-block">
              <h1 className="auth-title" id="auth-title">
                {isRegister ? "Create Account" : "Welcome Back"}
              </h1>
              <p className="auth-description">
                {isRegister
                  ? "Join Kagochi Farm Enterprise and start managing your farm smarter."
                  : "Sign in to access your farm analytics and decision support."}
              </p>
            </div>

            {/* Name field — register only */}
            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-name">Full Name</label>
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

            {/* Email */}
            <div className="auth-field">
              <label htmlFor="auth-email">Email Address</label>
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

            {/* Password with show/hide */}
            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <div className="auth-password-wrap">
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
                  className="auth-toggle-pw"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {isRegister && (
                <p className="auth-password-requirements" id="auth-password-requirements">
                  Use 10–128 characters, including at least one letter and one number.
                </p>
              )}
              {/* Password strength indicator — register only */}
              {isRegister && password.length > 0 && (
                <div className="auth-pw-strength">
                  <div className="auth-pw-bars">
                    {[1, 2, 3, 4].map((level) => {
                      const strength = password.length < 6 ? 1
                        : password.length < 10 ? 2
                        : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
                      return (
                        <div
                          key={level}
                          className={`auth-pw-bar${strength >= level ? ` active s${strength}` : ''}`}
                        />
                      );
                    })}
                  </div>
                  <span className="auth-pw-label">
                    {password.length < 6 ? "Too short"
                      : password.length < 10 ? "Use 10+ characters"
                      : /[A-Za-z]/.test(password) && /[0-9]/.test(password) ? "Meets requirements"
                      : "Add a letter and a number"}
                  </span>
                </div>
              )}
            </div>

            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-confirm-password">Confirm password</label>
                <div className="auth-password-wrap">
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
                    className="auth-toggle-pw"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <span className="auth-inline-error" id="auth-confirm-error">Passwords do not match yet.</span>
                )}
              </div>
            )}

            {isRegister && registrationEnabled === false && (
              <div className="auth-notice" role="status">
                Self-registration is disabled. Please ask the farm administrator to create your account.
              </div>
            )}
            {isRegister && registrationEnabled === null && (
              <div className="auth-notice" role="status">Checking account registration settings…</div>
            )}

            {/* Error message */}
            {authError && (
              <div className="auth-error" role="alert">
                <span className="auth-error-icon">⚠</span>
                {authError}
              </div>
            )}

            {/* Primary action button */}
            <button
              className="auth-button"
              onClick={handleAuth}
              disabled={authLoading || (isRegister && registrationEnabled === false)}
              aria-busy={authLoading}
            >
              {authLoading ? (
                <span className="auth-btn-spinner" />
              ) : isRegister ? (
                <><UserPlus size={17} /> Create Account</>
              ) : (
                <><LogIn size={17} /> Sign In</>
              )}
            </button>

            {/* Divider */}
            <div className="auth-divider" aria-hidden="true">
              <span>or continue with</span>
            </div>

            {/* Google Sign-In button — rendered by GIS SDK */}
            {GOOGLE_CLIENT_ID && (
              <div
                ref={googleButtonRef}
                className="google-signin-wrapper"
                aria-label="Sign in with Google"
              />
            )}
            {!googleButtonReady && (
              <button
                type="button"
                className="auth-google-fallback"
                onClick={() => setAuthError("Google sign-in is not ready in this deployment. Check VITE_GOOGLE_CLIENT_ID and the Google Identity Services allowed origins in Netlify and Google Cloud Console.")}
                aria-label="Continue with Google"
              >
                <span className="auth-google-mark" aria-hidden="true">G</span>
                <span>Continue with Google</span>
              </button>
            )}

            {/* Switch mode */}
            <div className="auth-switch">
              {isRegister ? (
                <>
                  <span>Already have an account?</span>
                  <button type="button" className="auth-switch-btn" onClick={() => { setAuthError(""); setAuthMode("login"); setConfirmPassword(""); }}>Sign In</button>
                </>
              ) : (
                <>
                  <span>New to Kagochi Farm?</span>
                  <button type="button" className="auth-switch-btn" onClick={() => { setAuthError(""); setAuthMode("register"); setConfirmPassword(""); }}>Create account</button>
                </>
              )}
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
    <div className="app-shell">
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

      <div className="app-content">
        {activeView === "home" && (
          <HomeView
            poultryCount={poultryCount}
            livestockCount={livestockCount}
            productionCount={productionCount}
            expenseTotal={expenseTotal}
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

      {loadingFarmData && (
        <div className="data-loading-indicator">Updating dashboard...</div>
      )}
    </div>
  );
}

export default App;
