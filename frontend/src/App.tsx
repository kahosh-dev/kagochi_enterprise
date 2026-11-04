import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Leaf, LogIn, UserPlus, ArrowLeft } from "lucide-react";
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
  loadSurvivorSummary,
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
  const[showPassword, setShowPassword] = useState(false);
  const [poultryCount, setPoultryCount] = useState(0);
  const [livestockCount, setLivestockCount] = useState(0);
  const [productionCount, setProductionCount] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [loadingFarmData, setLoadingFarmData] = useState(false);
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [publicView, setPublicView] = useState<'home' | 'about' | 'features' | 'how-it-works' | 'founder' | 'login'>('home');
  const [survivorSummary, setSurvivorSummary] = useState({ totalPoultryBirds: 0, totalLivestockAnimals: 0 });
  const googleButtonRef = useRef<HTMLDivElement>(null);

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
    // Only initialise when the login page is visible and the user is not signed in
    if (user || publicView !== 'login' || !GOOGLE_CLIENT_ID) return;
    // The ref might not be set yet on first paint — poll until it is
    let cancelled = false;
    function initGoogle() {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            setAuthLoading(true);
            setAuthError("");
            const res = await googleSignIn(response.credential);
            if (res.user) setUser(res.user);
            else { const u = await getCurrentUser(); setUser(u); }
          } catch (e) {
            setAuthError(e instanceof Error ? e.message : "Google sign-in failed.");
          } finally {
            setAuthLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: "360",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
      });
    }
    // Retry every 300 ms until both the GIS script and the DOM ref are ready
    const interval = setInterval(() => {
      if (googleButtonRef.current && window.google) {
        initGoogle();
        clearInterval(interval);
      }
    }, 300);
    // Also try immediately in case everything is already ready
    initGoogle();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, publicView, authMode]); // re-run when login page opens or mode switches

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
        // Load survivor summary separately — don't break dashboard if it fails
        loadSurvivorSummary().then((s) => setSurvivorSummary(s)).catch((err) => {
          console.error("Failed to load survivor summary:", err);
        });
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
    if (!email.trim() || !password.trim()) {
      setAuthError("Please enter your email and password.");
      return;
    }
    if (authMode === "register" && !name.trim()) {
      setAuthError("Please enter your name.");
      return;
    }
    try {
      setAuthLoading(true);
      const response =
        authMode === "register"
          ? await register(name.trim(), email.trim(), password)
          : await login(email.trim(), password);
      if (response.user) setUser(response.user);
      else { const u = await getCurrentUser(); setUser(u); }
      setName(""); setEmail(""); setPassword("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
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
    setSurvivorSummary({ totalPoultryBirds: 0, totalLivestockAnimals: 0 });
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
          {/* Frosted-glass form card */}
          <div className="auth-card" role="main">
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
              <h1 className="auth-title">
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
                  onKeyDown={(e) => { if (e.key === "Enter") handleAuth(); }}
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
              {/* Password strength indicator — register only */}
              {isRegister && password.length > 0 && (
                <div className="auth-pw-strength">
                  <div className="auth-pw-bars">
                    {[1, 2, 3, 4].map((level) => {
                      const strength = password.length < 6 ? 1
                        : password.length < 8 ? 2
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
                      : password.length < 8 ? "Weak"
                      : /[A-Z]/.test(password) && /[0-9]/.test(password) ? "Strong"
                      : "Good"}
                  </span>
                </div>
              )}
            </div>
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
              disabled={authLoading}
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
            {GOOGLE_CLIENT_ID ? (
              <div
                ref={googleButtonRef}
                className="google-signin-wrapper"
                aria-label="Sign in with Google"
              />
            ) : (
              <div className="auth-google-unavailable">
                Google Sign-In is not configured.
              </div>
            )}
            {/* Switch mode */}
            <div className="auth-switch">
              <span>
                {isRegister
                  ? "Already have an account?"
                  : "Don't have an account?"}
              </span>
              <button
                className="auth-switch-btn"
                onClick={() => {
                  setAuthError("");
                  setAuthMode(isRegister ? "login" : "register");
                }}
              >
                {isRegister ? "Sign In" : "Create account"}
              </button>
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
            totalPoultryBirds={survivorSummary.totalPoultryBirds}
            totalLivestockActive={survivorSummary.totalLivestockAnimals}
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
