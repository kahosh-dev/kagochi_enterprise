import { useEffect, useRef, useState } from "react";
import "./App.css";
import PublicWebsite from "./views/PublicWebsite";

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
  getToken,
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
  const [poultryCount, setPoultryCount] = useState(0);
  const [livestockCount, setLivestockCount] = useState(0);
  const [productionCount, setProductionCount] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [loadingFarmData, setLoadingFarmData] = useState(false);
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [publicView, setPublicView] = useState<'home' | 'about' | 'features' | 'how-it-works' | 'founder' | 'login'>('home');

  const googleButtonRef = useRef<HTMLDivElement>(null);

  /* =====================================================
     CHECK LOGIN
     ===================================================== */

  useEffect(() => {
    async function checkAuthentication() {
      const token = getToken();
      if (!token) { setLoadingAuth(false); return; }
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        logout();
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
    if (user || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return;

    function initGoogle() {
      if (!window.google || !googleButtonRef.current) return;

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
        width: "100%",
        text: "continue_with",
        shape: "rectangular",
      });
    }

    if (window.google) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) { initGoogle(); clearInterval(interval); }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [user, googleButtonRef.current]);

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
      return (
        <div className="auth-page">
          <div className="auth-card">
            <button className="auth-back-link" onClick={() => setPublicView('home')}>
              ← Back to Website
            </button>
            <div className="auth-logo">🌿</div>
            <p className="page-eyebrow">KAGOCHI FARM ENTERPRISE</p>
            <h1>{authMode === "login" ? "Welcome Back" : "Create Farm Account"}</h1>
            <p className="auth-description">
              {authMode === "login"
                ? "Sign in to access your farm analytics and decision support system."
                : "Create an account to securely manage your farm records."}
            </p>

            {authMode === "register" && (
              <div className="auth-field">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="auth-field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAuth(); }}
              />
            </div>

            {authError && <div className="auth-error">{authError}</div>}

            <button className="auth-button" onClick={handleAuth} disabled={authLoading}>
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div ref={googleButtonRef} className="google-signin-wrapper"></div>

            <div className="auth-switch">
              <span>
                {authMode === "login" ? "Don't have an account?" : "Already have an account?"}
              </span>
              <button
                onClick={() => {
                  setAuthError("");
                  setAuthMode(authMode === "login" ? "register" : "login");
                }}
              >
                {authMode === "login" ? "Create account" : "Sign in"}
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
        {activeView === "admin" && <AdminView />}
      </div>

      {loadingFarmData && (
        <div className="data-loading-indicator">Updating dashboard...</div>
      )}
    </div>
  );
}

export default App;
