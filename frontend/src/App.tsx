import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Leaf,
  Loader2,
  LogIn,
  UserPlus,
  X,
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
import AuthLayout from "./components/auth/AuthLayout";
import {
  BackLink,
  GoogleButton,
  PasswordField,
  PrimaryButton,
  SecondaryButton,
  StrengthMeter,
  TextField,
} from "./components/auth/AuthComponents";

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
type AuthField = "name" | "email" | "password" | "confirmPassword";

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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthField, string>>>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<AuthField, boolean>>>({});
  const [registerEmailExists, setRegisterEmailExists] = useState(false);
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

  function markFieldTouched(field: AuthField) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  function changeAuthField(field: AuthField, value: string, update: (next: string) => void) {
    update(value);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setTouchedFields((current) => ({ ...current, [field]: false }));
    if (field === "email") setRegisterEmailExists(false);
    if (authError) setAuthError("");
  }

  async function handleAuth() {
    if (authLoading) return;
    setAuthError("");
    setRegisterEmailExists(false);
    const errors: Partial<Record<AuthField, string>> = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) errors.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) errors.email = "Enter a valid email address.";

    if (authMode === "register") {
      if (registrationEnabled === false) {
        setAuthError("Self-registration is currently disabled. Ask the farm administrator to create your account.");
        return;
      }
      if (name.trim().length < 2) errors.name = "Enter your full name (at least 2 characters).";
      if (password.length < 6) errors.password = "Password must be at least 6 characters.";
      else if (password.length > 128) errors.password = "Password must be at most 128 characters.";
      if (!confirmPassword) errors.confirmPassword = "Confirm your password.";
      else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    } else if (!password) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);
    setTouchedFields({ name: true, email: true, password: true, confirmPassword: true });
    if (Object.keys(errors).length > 0) return;

    try {
      setAuthLoading(true);
      const response =
        authMode === "register"
          ? await register(name.trim(), normalizedEmail, password)
          : await login(normalizedEmail, password);
      if (response.user) setUser(response.user);
      else { const u = await getCurrentUser(); setUser(u); }
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFieldErrors({});
      setTouchedFields({});
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed. Check your connection and try again.";
      if (authMode === "register" && /already exists|already registered/i.test(message)) {
        setRegisterEmailExists(true);
        setFieldErrors({ email: "This email address is already registered." });
        setTouchedFields((current) => ({ ...current, email: true }));
      } else if (authMode === "login" && /invalid email or password|incorrect email or password/i.test(message)) {
        setAuthError("Incorrect email or password");
      } else {
        setAuthError(message);
      }
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
    if (publicView === "login") {
      const isRegister = authMode === "register";
      const emailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      const nameError = fieldErrors.name ?? (touchedFields.name && name.trim().length < 2 ? "Enter your full name (at least 2 characters)." : undefined);
      const emailError = fieldErrors.email ?? (touchedFields.email
        ? !email.trim() ? "Email address is required." : !emailFormatValid ? "Enter a valid email address." : undefined
        : undefined);
      const passwordError = fieldErrors.password ?? (touchedFields.password
        ? !password ? "Password is required." : isRegister && password.length < 6 ? "Password must be at least 6 characters." : undefined
        : undefined);
      const confirmError = fieldErrors.confirmPassword ?? (confirmPassword && password !== confirmPassword
        ? "Passwords do not match."
        : touchedFields.confirmPassword && !confirmPassword ? "Confirm your password." : undefined);
      const passwordSatisfied = password.length >= 6;
      const confirmMatch = confirmPassword.length > 0 && password === confirmPassword;

      return (
        <AuthLayout isRegister={isRegister}>
          <BackLink onClick={() => setPublicView("home")} />

          <div className="kf-auth-brand kf-auth-brand--card">
            <div className="kf-logo-mark"><Leaf size={23} strokeWidth={2} /></div>
            <div>
              <strong>Kagochi</strong>
              <span>Farm Enterprise</span>
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

          <div className="kf-auth-alert-slot">
            {authError && (
              <div className="kf-alert kf-alert--error kf-auth-alert" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{authError}</span>
                <button type="button" className="kf-auth-alert-close" onClick={() => setAuthError("")} aria-label="Dismiss message">
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
          {isRegister && registrationEnabled === false && (
            <div className="kf-auth-notice" role="status">
              Self-registration is disabled. Please ask the farm administrator to create your account.
            </div>
          )}

          <form className="kf-auth-form" noValidate onSubmit={(event) => { event.preventDefault(); void handleAuth(); }}>
            <div className="kf-auth-fields">
              {isRegister && (
                <TextField
                  id="auth-name"
                  label="Full name"
                  placeholder="Enter your full name"
                  value={name}
                  autoComplete="name"
                  autoFocus
                  maxLength={100}
                  onChange={(value) => changeAuthField("name", value, setName)}
                  onBlur={() => markFieldTouched("name")}
                  errorText={nameError}
                />
              )}

              <TextField
                id="auth-email"
                label={isRegister ? "Email address" : "Email"}
                type="email"
                placeholder="Enter your email"
                value={email}
                autoComplete="email"
                autoFocus={!isRegister}
                maxLength={150}
                onChange={(value) => changeAuthField("email", value, setEmail)}
                onBlur={() => markFieldTouched("email")}
                errorText={emailError}
                error={registerEmailExists ? (
                  <span>
                    This email address is already registered. <button type="button" className="kf-auth-inline-link" onClick={() => {
                      setAuthError(""); setFieldErrors({}); setRegisterEmailExists(false); setAuthMode("login"); setConfirmPassword("");
                    }}>Sign in</button>
                  </span>
                ) : undefined}
              />

              <div>
                <PasswordField
                  id="auth-password"
                  label="Password"
                  placeholder={isRegister ? "Create a password" : "Enter your password"}
                  value={password}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  autoFocus={false}
                  onChange={(value) => changeAuthField("password", value, setPassword)}
                  onBlur={() => markFieldTouched("password")}
                  error={passwordError}
                  hint={isRegister ? (
                    <>
                      <p className={`kf-pw-hint${passwordSatisfied ? " kf-pw-hint--ok" : ""}`}>
                        <CheckCircle2 size={12} aria-hidden="true" /> At least 6 characters
                      </p>
                      <StrengthMeter value={password} />
                    </>
                  ) : undefined}
                />
              </div>

              {isRegister && (
                <PasswordField
                  id="auth-confirm"
                  label="Confirm password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(value) => changeAuthField("confirmPassword", value, setConfirmPassword)}
                  onBlur={() => markFieldTouched("confirmPassword")}
                  error={confirmError}
                  valid={confirmMatch && !confirmError}
                  validMessage={confirmPassword && confirmMatch && !confirmError ? "Passwords match" : undefined}
                />
              )}
            </div>

            <PrimaryButton disabled={authLoading || (isRegister && registrationEnabled === false)} busy={authLoading}>
              {authLoading
                ? <><Loader2 size={17} className="kf-spin" aria-hidden="true" /><span>{isRegister ? "Creating account…" : "Signing in…"}</span></>
                : isRegister
                  ? <><UserPlus size={17} aria-hidden="true" /><span>Create account</span></>
                  : <><LogIn size={17} aria-hidden="true" /><span>Sign in</span></>
              }
            </PrimaryButton>
          </form>

          <div className="kf-auth-divider" aria-hidden="true"><span>OR CONTINUE WITH</span></div>
          <GoogleButton
            clientId={GOOGLE_CLIENT_ID}
            ready={googleButtonReady}
            targetRef={googleButtonRef}
            onFallbackClick={() => setAuthError("Google sign-in is not available in this deployment. Check VITE_GOOGLE_CLIENT_ID and allowed origins.")}
          />

          <div className="kf-auth-switch-wrap">
            <span className="kf-auth-switch-text">
              {isRegister ? "Already have an account?" : "New to Kagochi Farm?"}
            </span>
            <SecondaryButton onClick={() => {
              setAuthError(""); setFieldErrors({}); setTouchedFields({}); setRegisterEmailExists(false);
              setAuthMode(isRegister ? "login" : "register"); setConfirmPassword("");
            }}>
              {isRegister ? "Sign in" : "Create account"}
            </SecondaryButton>
          </div>
        </AuthLayout>
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
