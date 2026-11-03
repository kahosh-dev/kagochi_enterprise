interface HomeViewProps {
  poultryCount: number;
  livestockCount: number;
  productionCount: number;
  expenseTotal: number;
  totalPoultryBirds: number;
  totalLivestockActive: number;
  onNavigate: (view: string) => void;
}

// Real farm images from Unsplash (free to use)
const FARM_IMAGES = {
  poultry:
    "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=80",
  livestock:
    "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=400&q=80",
  production:
    "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&q=80",
  expenses:
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80",
};

function HomeView({
  poultryCount,
  livestockCount,
  productionCount,
  expenseTotal,
  totalPoultryBirds,
  totalLivestockActive,
  onNavigate,
}: HomeViewProps) {
  return (
    <main className="home-page">

      {/* Welcome section */}
      <section className="welcome-section">
        <div>
          <p className="welcome-small">Welcome back 👋</p>
          <h2>Farm Overview</h2>
          <p className="welcome-text">
            Monitor your poultry, livestock and farm operations from one place.
          </p>
        </div>
        <div className="farm-status">
          <span className="status-dot"></span>
          Farm Active
        </div>
      </section>

      {/* Farm summary cards with real images */}
      <section className="dashboard-grid">

        <div
          className="dashboard-card image-card poultry-card"
          onClick={() => onNavigate("poultry")}
          style={{ cursor: "pointer" }}
        >
          <div
            className="card-image"
            style={{ backgroundImage: `url(${FARM_IMAGES.poultry})` }}
          />
          <div className="card-image-overlay">
            <p className="card-label">Poultry</p>
            <h3>{poultryCount}</h3>
            <p className="card-description">Recorded batches</p>
          </div>
        </div>

        <div
          className="dashboard-card image-card livestock-card"
          onClick={() => onNavigate("livestock")}
          style={{ cursor: "pointer" }}
        >
          <div
            className="card-image"
            style={{ backgroundImage: `url(${FARM_IMAGES.livestock})` }}
          />
          <div className="card-image-overlay">
            <p className="card-label">Livestock</p>
            <h3>{livestockCount}</h3>
            <p className="card-description">Recorded animals</p>
          </div>
        </div>

        <div
          className="dashboard-card image-card production-card"
          onClick={() => onNavigate("production")}
          style={{ cursor: "pointer" }}
        >
          <div
            className="card-image"
            style={{ backgroundImage: `url(${FARM_IMAGES.production})` }}
          />
          <div className="card-image-overlay">
            <p className="card-label">Production</p>
            <h3>{productionCount}</h3>
            <p className="card-description">Production records</p>
          </div>
        </div>

        <div
          className="dashboard-card image-card expense-card"
          onClick={() => onNavigate("expenses")}
          style={{ cursor: "pointer" }}
        >
          <div
            className="card-image"
            style={{ backgroundImage: `url(${FARM_IMAGES.expenses})` }}
          />
          <div className="card-image-overlay">
            <p className="card-label">Expenses</p>
            <h3>KSh {expenseTotal.toLocaleString()}</h3>
            <p className="card-description">Total recorded</p>
          </div>
        </div>

      </section>

      {/* Population Overview tiles */}
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h3>Population Overview</h3>
            <p>Live survivor counts based on recorded events.</p>
          </div>
        </div>
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div
            className="dashboard-card image-card"
            onClick={() => onNavigate("survivors")}
            style={{ cursor: "pointer", background: 'linear-gradient(135deg, #065f46, #10b981)' }}
          >
            <div className="card-image-overlay" style={{ position: 'relative', padding: '1.5rem' }}>
              <p className="card-label" style={{ color: '#a7f3d0' }}>🐓 Birds Surviving</p>
              <h3 style={{ color: '#fff', fontSize: '2rem', margin: '0.25rem 0' }}>{totalPoultryBirds.toLocaleString()}</h3>
              <p className="card-description" style={{ color: '#a7f3d0', marginBottom: '0.75rem' }}>Alive after all events</p>
              <button
                className="secondary-action"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                onClick={(e) => { e.stopPropagation(); onNavigate("survivors"); }}
              >
                View Survivors →
              </button>
            </div>
          </div>

          <div
            className="dashboard-card image-card"
            onClick={() => onNavigate("mortality")}
            style={{ cursor: "pointer", background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}
          >
            <div className="card-image-overlay" style={{ position: 'relative', padding: '1.5rem' }}>
              <p className="card-label" style={{ color: '#ede9fe' }}>🐄 Livestock Active</p>
              <h3 style={{ color: '#fff', fontSize: '2rem', margin: '0.25rem 0' }}>{totalLivestockActive.toLocaleString()}</h3>
              <p className="card-description" style={{ color: '#ede9fe', marginBottom: '0.75rem' }}>Animals with survivors &gt; 0</p>
              <button
                className="secondary-action"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                onClick={(e) => { e.stopPropagation(); onNavigate("mortality"); }}
              >
                View Details →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h3>Quick Actions</h3>
            <p>Jump to a section to record farm activities.</p>
          </div>
        </div>

        <div className="quick-actions">
          <button className="quick-action" onClick={() => onNavigate("poultry")}>
            <img src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70" alt="Poultry" className="quick-action-img" />
            <strong>Poultry</strong>
            <small>Manage poultry batches</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("livestock")}>
            <img src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=80&q=70" alt="Livestock" className="quick-action-img" />
            <strong>Livestock</strong>
            <small>Manage animals</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("production")}>
            <img src="https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=80&q=70" alt="Production" className="quick-action-img" />
            <strong>Production</strong>
            <small>Record production</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("feeding")}>
            <img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=80&q=70" alt="Feeding" className="quick-action-img" />
            <strong>Feeding</strong>
            <small>Record feed usage</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("expenses")}>
            <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=80&q=70" alt="Expenses" className="quick-action-img" />
            <strong>Expenses</strong>
            <small>Add farm expense</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("performance")}>
            <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=80&q=70" alt="Analytics" className="quick-action-img" />
            <strong>Analytics</strong>
            <small>View farm performance</small>
          </button>
        </div>
      </section>

      {/* AI Assistant card */}
      <section className="ai-dashboard-card">
        <div className="ai-icon">
          <img src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&q=70" alt="AI" className="ai-icon-img" />
        </div>
        <div className="ai-content">
          <p className="ai-label">KAGOCHI FARM AI</p>
          <h3>Need help with your farm?</h3>
          <p>
            Ask the AI assistant about poultry, livestock, feeding, production
            or expenses.
          </p>
          <button className="ai-button" onClick={() => onNavigate("advisor")}>
            Ask Farm Assistant →
          </button>
        </div>
      </section>

    </main>
  );
}

export default HomeView;
