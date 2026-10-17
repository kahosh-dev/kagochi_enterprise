function AdminView() {
  return (
    <main className="management-page">
      <div className="management-header">
        <div>
          <p className="page-eyebrow">SYSTEM ADMINISTRATION</p>
          <h2>Admin Panel</h2>
          <p className="page-description">User management is handled directly via the backend database.</p>
        </div>
        <div className="admin-badge">
          <span>🔐</span> Admin Panel
        </div>
      </div>
      <div className="management-card">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h4>Access Restricted</h4>
          <p>Registered user records are managed through the backend database only.</p>
        </div>
      </div>
    </main>
  );
}

export default AdminView;
