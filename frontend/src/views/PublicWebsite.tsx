import { useState, useEffect, useRef } from 'react';
import {
  Leaf, LogIn, Menu, X, ChevronRight, Zap,
  LayoutDashboard, Brain,
  ClipboardList, BarChart3, Bird, Beef, Egg, Wheat,
  DollarSign, UserCheck, PieChart, TrendingUp,
  Lightbulb, AlertCircle, CheckCircle2, Users,
  Award, Globe, Star
} from 'lucide-react';
import './PublicWebsite.css';

type PublicView = 'home' | 'about' | 'features' | 'how-it-works' | 'founder' | 'login';

interface PublicWebsiteProps {
  onLogin: () => void;
  publicView: PublicView;
  onNavigate: (view: PublicView) => void;
}

function SectionBg({ slides, overlayColor }: { slides: string[]; overlayColor: string }) {
  return (
    <div className="pub-section-bg-wrap" aria-hidden="true">
      {slides.map((src, i) => (
        <div
          key={i}
          className={`pub-section-bg-slide${slides.length === 2 ? ' pub-section-bg-slide-2' : ''}`}
          style={{ backgroundImage: `url('${src}')` }}
        />
      ))}
      <div className="pub-section-bg-overlay" style={{background: overlayColor}} />
    </div>
  );
}

export default function PublicWebsite({ onLogin, onNavigate }: PublicWebsiteProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<PublicView>('home');

  const homeRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const howRef = useRef<HTMLElement>(null);
  const founderRef = useRef<HTMLElement>(null);

  function scrollTo(ref: React.RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleNav(view: PublicView, ref?: React.RefObject<HTMLElement | null>) {
    setMobileOpen(false);
    if (view === 'login') { onLogin(); return; }
    onNavigate(view);
    if (ref) scrollTo(ref);
  }

  useEffect(() => {
    const sections = [
      { id: 'home' as PublicView, ref: homeRef },
      { id: 'about' as PublicView, ref: aboutRef },
      { id: 'features' as PublicView, ref: featuresRef },
      { id: 'how-it-works' as PublicView, ref: howRef },
      { id: 'founder' as PublicView, ref: founderRef },
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const found = sections.find(s => s.ref.current === entry.target);
            if (found) {
              setActiveSection(found.id);
              onNavigate(found.id);
            }
          }
        });
      },
      { threshold: 0.3 }
    );
    sections.forEach(s => { if (s.ref.current) observer.observe(s.ref.current); });
    return () => observer.disconnect();
  }, [onNavigate]);

  const navLinks: { label: string; id: PublicView; ref?: React.RefObject<HTMLElement | null> }[] = [
    { label: 'Home', id: 'home', ref: homeRef },
    { label: 'About', id: 'about', ref: aboutRef },
    { label: 'Features', id: 'features', ref: featuresRef },
    { label: 'How It Works', id: 'how-it-works', ref: howRef },
    { label: 'Founder', id: 'founder', ref: founderRef },
  ];

  return (
    <div className="pub-root">
      {/* ===== NAV ===== */}
      <nav className="pub-nav">
        <div className="pub-nav-inner">
          <div className="pub-nav-brand">
            <Leaf size={24} className="pub-nav-leaf" />
            <span className="pub-nav-title">Kagochi Farm Enterprise</span>
          </div>
          <div className="pub-nav-links">
            {navLinks.map(link => (
              <button
                key={link.id}
                className={`pub-nav-link${activeSection === link.id ? ' active' : ''}`}
                onClick={() => handleNav(link.id, link.ref)}
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="pub-nav-actions">
            <button className="pub-nav-login" onClick={onLogin}>
              <LogIn size={16} />
              Login
            </button>
            <button className="pub-nav-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="pub-mobile-menu">
            {navLinks.map(link => (
              <button
                key={link.id}
                className={`pub-mobile-link${activeSection === link.id ? ' active' : ''}`}
                onClick={() => handleNav(link.id, link.ref)}
              >
                {link.label}
              </button>
            ))}
            <button className="pub-mobile-login" onClick={onLogin}>
              <LogIn size={16} /> Login to Dashboard
            </button>
          </div>
        )}
      </nav>

      {/* ===== SECTION 1: HOME ===== */}
      <section id="section-home" ref={homeRef}>
        {/* Hero */}
        <div className="pub-hero">
          <div className="pub-hero-slide" style={{backgroundImage: "url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1400&q=85')"}} />
          <div className="pub-hero-slide" style={{backgroundImage: "url('https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=1400&q=85')"}} />
          <div className="pub-hero-slide" style={{backgroundImage: "url('https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=1400&q=85')"}} />
          <div className="pub-hero-overlay" />
          <div className="pub-hero-content">
            <div className="pub-hero-eyebrow">
              <Zap size={14} />
              AI-POWERED FARM MANAGEMENT
            </div>
            <h1 className="pub-hero-h1">Smart Poultry &amp; Livestock Management for Modern Farmers</h1>
            <p className="pub-hero-sub">Smart Farm Records. Better Decisions. Better Performance.</p>
            
<p className="pub-hero-desc">
  Kagochi Farm Enterprise brings together all your farm data - poultry
  batches, livestock, production, feeding, expenses - into one
  intelligent platform powered by AI. Make smarter decisions and grow
  your farm with confidence.
</p>

             </div>
          <div className="pub-hero-scroll-indicator">
            <ChevronRight size={28} className="pub-scroll-chevron" />
          </div>
        </div>

       {/* Highlight cards */}
        <div className="pub-highlights">
          <div className="pub-highlights-inner">
            <div className="pub-highlight-card" style={{backgroundImage: "url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80')"}}>
              <div className="pub-highlight-card-overlay" />
              <div className="pub-highlight-card-body">
                <ClipboardList size={32} />
                <h3>Farm Records</h3>
                <p>Comprehensive digital records for every aspect of your farm operations.</p>
              </div>
            </div>
            <div className="pub-highlight-card" style={{backgroundImage: "url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80')"}}>
              <div className="pub-highlight-card-overlay" />
              <div className="pub-highlight-card-body">
                <BarChart3 size={32} />
                <h3>Production Analytics</h3>
                <p>Visual insights into egg production, livestock growth, and performance trends.</p>
              </div>
            </div>
            <div className="pub-highlight-card" style={{backgroundImage: "url('https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80')"}}>
              <div className="pub-highlight-card-overlay" />
              <div className="pub-highlight-card-body">
                <Brain size={32} />
                <h3>AI Advisor</h3>
                <p>Ask your AI farm assistant anything and get instant expert guidance.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery strip */}
        <div className="pub-gallery-strip">
          {[
            'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&q=80',
            'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&q=80',
            'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80',
          ].map((src, i) => (
            <div key={i} className="pub-gallery-item">
              <img src={src} alt={`Farm scene ${i + 1}`} className="pub-gallery-img" loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      {/* ===== SECTION 2: ABOUT ===== */}
      <section id="section-about" ref={aboutRef} className="pub-about-section" style={{position:'relative', overflow:'hidden'}}>
        <SectionBg
          slides={[
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1400&q=75",
            "https://images.unsplash.com/photo-1569390397908-f9e8ed83ee12?w=1400&q=75",
            "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1400&q=75"
          ]}
          overlayColor="rgba(10,26,14,0.62)"
        />
        <div className="pub-about-inner">
          <div className="pub-section-header">
            <div className="pub-eyebrow-light"><Leaf size={14} /> ABOUT THE SYSTEM</div>
            <h2 style={{color:'white'}}>Understanding Kagochi Farm Enterprise</h2>
            <p className="pub-section-sub" style={{color:'rgba(255,255,255,0.82)'}}>Built from real farm challenges, designed for real farmers.</p>
          </div>
          <div className="pub-about-layout">
            <div className="pub-about-content">
              <div className="pub-about-grid">
                <div className="pub-info-card">
                  <div className="pub-info-icon" style={{background: '#fff7ed', color: '#d97706'}}><Lightbulb size={20} /></div>
                  <h4>Why It Was Developed</h4>
                  <p>Kagochi Farm Enterprise was developed to address the lack of affordable, locally relevant digital farm management tools for small and medium-scale poultry and livestock farmers in Kenya. Most existing solutions are either too expensive, too complex, or not tailored to local agricultural contexts.</p>
                </div>
                <div className="pub-info-card">
                  <div className="pub-info-icon" style={{background: '#fef2f2', color: '#dc2626'}}><AlertCircle size={20} /></div>
                  <h4>The Problem</h4>
                  <ul className="pub-info-list">
                    {['Manual, error-prone record keeping on paper', 'No centralised data for performance tracking', 'Delayed decisions due to lack of real-time data', 'High cost of existing enterprise farm software', 'No AI-driven advisory for small-scale farmers'].map(p => (
                      <li key={p}><AlertCircle size={14} /> {p}</li>
                    ))}
                  </ul>
                </div>
                <div className="pub-info-card">
                  <div className="pub-info-icon" style={{background: '#f0fdf4', color: '#16a34a'}}><CheckCircle2 size={20} /></div>
                  <h4>The Solution</h4>
                  <ul className="pub-info-list">
                    {['Digital records for poultry and livestock', 'Automated production and expense tracking', 'Real-time performance dashboards', 'Built-in AI farming advisor', 'Accessible on mobile and desktop'].map(s => (
                      <li key={s}><CheckCircle2 size={14} /> {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="pub-info-card">
                  <div className="pub-info-icon" style={{background: '#eff6ff', color: '#2563eb'}}><Users size={20} /></div>
                  <h4>Intended Users</h4>
                  <p>Small and medium-scale poultry and livestock farmers, farm managers, agricultural supervisors, and agricultural extension officers who need an affordable, easy-to-use farm management solution with AI advisory capabilities.</p>
                </div>
              </div>
              </div>
            <div className="pub-about-photo-col">
              <img
                src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80"
                alt="Poultry farming"
                className="pub-about-photo"
                loading="lazy"
              />
              <div className="pub-about-photo-caption">
                <Leaf size={14} />
                Modern poultry management made simple
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 3: FEATURES ===== */}
      <section id="section-features" ref={featuresRef} className="pub-features-section" style={{position:'relative', overflow:'hidden'}}>
        <SectionBg
          slides={[
            "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1400&q=75",
            "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=1400&q=75",
            "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1400&q=75"
          ]}
          overlayColor="rgba(10,26,14,0.70)"
        />
        <div className="pub-features-header-strip" style={{position:'relative', zIndex:1}}>
          <div className="pub-features-header-bg" />
          <div className="pub-features-header-content">
            <div className="pub-eyebrow-light"><Zap size={14} /> PLATFORM FEATURES</div>
            <h2 className="pub-features-h2">Everything Your Farm Needs</h2>
            <p className="pub-features-sub">8 powerful modules covering every aspect of modern farm management.</p>
          </div>
        </div>
        <div className="pub-features-grid-wrap">
          {[
            { Icon: Bird, color: '#d97706', bg: '#fff7ed', name: 'Poultry Management', desc: 'Track batches, mortality, vaccinations, and flock performance with detailed analytics.', img: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=80' },
            { Icon: Beef, color: '#2563eb', bg: '#eff6ff', name: 'Livestock Management', desc: 'Manage cattle, goats, and other livestock with individual health and growth records.', img: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=400&q=80' },
            { Icon: Egg, color: '#dc2626', bg: '#fef2f2', name: 'Production Records', desc: 'Log daily egg production, milk yield, and other outputs with trend visualisation.', img: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&q=80' },
            { Icon: Wheat, color: '#16a34a', bg: '#f0fdf4', name: 'Feeding Management', desc: 'Record feed types, quantities, and schedules to optimise nutrition and costs.', img: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&q=80' },
            { Icon: DollarSign, color: '#7c3aed', bg: '#f5f3ff', name: 'Expenses Tracking', desc: 'Monitor all farm expenses by category and generate cost summaries instantly.', img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80' },
            { Icon: BarChart3, color: '#0284c7', bg: '#f0f9ff', name: 'Performance Analytics', desc: 'Visual dashboards and charts to track productivity trends and key farm metrics.', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80' },
            { Icon: Brain, color: '#15803d', bg: '#f0fdf4', name: 'AI Farm Advisor', desc: 'Chat with an AI assistant trained on farming knowledge for instant expert advice.', img: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80' },
            { Icon: LayoutDashboard, color: '#b45309', bg: '#fffbeb', name: 'Farm Dashboard', desc: 'Unified overview of all your farm activities, KPIs, and alerts in one place.', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80' },
          ].map(({ Icon, color, bg, name, desc, img }) => (
            <div key={name} className="pub-feature-card">
              <div className="pub-feature-img-wrap">
                <img src={img} alt={name} className="pub-feature-img" loading="lazy" />
              </div>
              <div className="pub-feature-card-body">
                <div className="pub-feature-icon-circle" style={{background: bg, color}}><Icon size={22} /></div>
                <h4 className="pub-feature-name">{name}</h4>
                <p className="pub-feature-desc">{desc}</p>
                <span className="pub-feature-badge">âœ“ Available</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SECTION 4: HOW IT WORKS ===== */}
      <section id="section-how" ref={howRef} className="pub-how-section" style={{position:'relative', overflow:'hidden'}}>
        <SectionBg
          slides={[
            "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=1400&q=75",
            "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=1400&q=75",
            "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1400&q=75"
          ]}
          overlayColor="rgba(10,26,14,0.68)"
        />
        <div className="pub-how-inner">
          <div className="pub-section-header">
            <div className="pub-eyebrow-light"><Zap size={14} /> HOW IT WORKS</div>
            <h2 style={{color:'white'}}>From Sign-Up to Smart Farming in 5 Steps</h2>
            <p className="pub-section-sub" style={{color:'rgba(255,255,255,0.82)'}}>Getting started is simple Ã¢â‚¬â€ your farm data starts working for you immediately.</p>
          </div>
          <div className="pub-steps-container">
            <div className="pub-steps-line" />
            {[
              { Icon: UserCheck,    title: 'Create Account',  desc: 'Register securely and set up your farm profile.', color: '#16a34a', bg: 'rgba(22,163,74,0.15)',   border: 'rgba(22,163,74,0.5)',   num: '#16a34a' },
              { Icon: ClipboardList,title: 'Add Farm Data',   desc: 'Input poultry, livestock, feeding and expense records.', color: '#d97706', bg: 'rgba(217,119,6,0.15)',  border: 'rgba(217,119,6,0.5)',   num: '#d97706' },
              { Icon: PieChart,     title: 'View Analytics',  desc: 'Explore production trends and performance dashboards.', color: '#2563eb', bg: 'rgba(37,99,235,0.15)',  border: 'rgba(37,99,235,0.5)',   num: '#2563eb' },
              { Icon: Brain,        title: 'Ask AI Advisor',  desc: 'Get personalised recommendations from your AI advisor.', color: '#7c3aed', bg: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.5)',  num: '#7c3aed' },
              { Icon: TrendingUp,   title: 'Track Progress',  desc: 'Monitor improvements and make data-driven decisions.', color: '#0284c7', bg: 'rgba(2,132,199,0.15)',  border: 'rgba(2,132,199,0.5)',   num: '#0284c7' },
            ].map(({ Icon, title, desc, color, bg, border }, i) => (
              <div key={title} className="pub-step-card" style={{background: bg, border: `1px solid ${border}`}}>
                <div className="pub-step-number" style={{background: color}}>{i + 1}</div>
                <div className="pub-step-icon-circle" style={{background: color, width: 72, height: 72}}>
                  <Icon size={34} color="white" />
                </div>
                <h4 style={{color:'white'}}>{title}</h4>
                <p style={{color:'rgba(255,255,255,0.82)'}}>{desc}</p>
              </div>
            ))}
          </div>
         
        </div>
      </section>

      {/* ===== SECTION 5: FOUNDER ===== */}
      <section id="section-founder" ref={founderRef} className="pub-founder-section">
        <div className="founder-banner" style={{position:'relative', overflow:'hidden'}}>
          <SectionBg
            slides={[
              "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1400&q=75",
              "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=1400&q=75"
            ]}
            overlayColor="rgba(10,26,14,0.85)"
          />
          <div className="founder-banner-content" style={{position:'relative', zIndex:2}}>
            <h2>Meet the Founder</h2>
            <p>The developer behind Kagochi Farm Enterprise</p>
          </div>
        </div>
        <div className="pub-founder-card">
          <div className="pub-founder-photo-col">
            <div className="founder-photo-wrapper">
              <img
                src="/founder.jpg"
                alt="Kagochi Brian Kahora Ã¢â‚¬â€ Founder and CEO of Kagochi Farm Enterprise"
                className="founder-photo"
              />
            </div>
          </div>
          <div className="pub-founder-info">
            <h3 className="pub-founder-name">Kagochi Brian Kahora</h3>
            <div className="pub-founder-title-pill">
              <Award size={15} /> Founder &amp; CEO, Kagochi Farm Enterprise
            </div>
           
            <div className="pub-founder-contact">
    <Globe size={13} />
    Contact: 0797 183 251 â€” Brian Kagochi
  </div>
            
<div className="pub-founder-info">
   <p className="pub-founder-bio">
    Kagochi Farm Enterprise is my project focused on improving
    how poultry and livestock farm operations are recorded,
    monitored and analysed. I am developing the system to bring
    farm records, production information, feeding activities,
    expenses and performance analysis together in one platform.
  </p>
</div>
 </div>
        </div>
        <div className="pub-founder-quote-strip">
          <Star size={20} />
          <blockquote>"Smart Farm Records. Better Decisions. Better Performance."</blockquote>
          <cite>Kagochi Farm Enterprise</cite>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="pub-footer">
        <div className="pub-footer-inner">
          <div className="pub-footer-brand">
            <div className="pub-footer-logo"><Leaf size={20} /> <span>Kagochi Farm Enterprise</span></div>
            <p className="pub-footer-tagline">Smart Poultry &amp; Livestock Management for Modern Farmers</p>
            <img
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300&q=60"
              alt="Farm"
              className="pub-footer-img"
              loading="lazy"
            />
          </div>
          <div className="pub-footer-info">
            <p>&copy; {new Date().getFullYear()} Kagochi Farm Enterprise. All rights reserved.</p>
            <p>Developed by Kagochi Brian Kahora</p>
            </div>
        </div>
      </footer>
    </div>
  );
}
