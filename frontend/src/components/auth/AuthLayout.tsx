import type { ReactNode } from "react";
import { CheckCircle2, Leaf, ShieldCheck, TrendingUp } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  isRegister: boolean;
}

const features = [
  { label: "Poultry", image: "/images/farm/chicken.webp" },
  { label: "Livestock", image: "/images/farm/cow.webp" },
  { label: "Production", image: "/images/farm/eggs.webp" },
  { label: "Feeding", image: "/images/farm/animal-feed.webp" },
  { label: "Survivor Tracking", image: "/images/farm/chick.webp" },
  { label: "Vaccinations", image: "/images/farm/vaccination.webp" },
  { label: "Mortality Monitor", image: "/images/farm/operating-loss.webp" },
];

const benefits = [
  "Track poultry and livestock in one place",
  "Monitor survivors, mortality and vaccinations",
  "Understand income, expenses and profit",
];

export default function AuthLayout({ children, isRegister }: AuthLayoutProps) {
  return (
    <div className="kf-auth-page">
      <div className="kf-auth-shell">
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

            <div className="kf-auth-features" aria-label="Farm management features">
              {features.map((feature) => (
                <div className="kf-auth-feature" key={feature.label}>
                  <img src={feature.image} alt="" className="kf-auth-feature-img" />
                  {feature.label}
                </div>
              ))}
            </div>

            {isRegister && (
              <ul className="kf-auth-benefits" aria-label="Kagochi Farm benefits">
                {benefits.map((benefit) => (
                  <li key={benefit}><CheckCircle2 size={14} aria-hidden="true" /> {benefit}</li>
                ))}
              </ul>
            )}
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

        <main className="kf-auth-card" aria-labelledby="auth-title">
          {children}
        </main>
      </div>
    </div>
  );
}
