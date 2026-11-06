import { ShieldCheck, Lock, Users, Server, Database } from "lucide-react";
import { PageHeader, Panel, EmptyState, Badge, InlineMeta } from "../components/ui";

function AdminView() {
  return (
    <main className="kf-page kf-page--narrow">
      <PageHeader
        eyebrow="System Administration"
        title="Admin Settings & Security"
        description="User authentication policies, access controls, and farm database configuration."
        actions={
          <Badge tone="forest" dot>
            Protected Area
          </Badge>
        }
      />

      <div className="kf-stack">
        <div className="kf-grid kf-grid--stats">
          <div className="kf-stat kf-stat--forest">
            <span className="kf-stat-icon">
              <ShieldCheck size={20} strokeWidth={1.5} />
            </span>
            <span className="kf-stat-body">
              <span className="kf-stat-label">Security Role</span>
              <span className="kf-stat-value">Administrator</span>
              <span className="kf-stat-hint">Full farm enterprise access</span>
            </span>
          </div>

          <div className="kf-stat kf-stat--blue">
            <span className="kf-stat-icon">
              <Database size={20} strokeWidth={1.5} />
            </span>
            <span className="kf-stat-body">
              <span className="kf-stat-label">Database Provider</span>
              <span className="kf-stat-value">PostgreSQL</span>
              <span className="kf-stat-hint">Neon serverless sync</span>
            </span>
          </div>

          <div className="kf-stat kf-stat--green">
            <span className="kf-stat-icon">
              <Server size={20} strokeWidth={1.5} />
            </span>
            <span className="kf-stat-body">
              <span className="kf-stat-label">API Status</span>
              <span className="kf-stat-value">Active</span>
              <span className="kf-stat-hint">RESTful endpoint healthy</span>
            </span>
          </div>

          <div className="kf-stat kf-stat--slate">
            <span className="kf-stat-icon">
              <Users size={20} strokeWidth={1.5} />
            </span>
            <span className="kf-stat-body">
              <span className="kf-stat-label">User Provisioning</span>
              <span className="kf-stat-value">Managed</span>
              <span className="kf-stat-hint">Database level provisioning</span>
            </span>
          </div>
        </div>

        <Panel
          title="User Account Management"
          subtitle="User roles, permissions, and credential records."
        >
          <EmptyState
            icon={<Lock size={28} strokeWidth={1.5} />}
            title="Managed Database Credentials"
            description="Active farm accounts and role permissions are strictly governed through the secure database schema. To provision new users or reset credentials, contact your technical farm administrator or use the database administration dashboard."
            compact
          />
          <div style={{ marginTop: 16 }}>
            <InlineMeta>
              Security level: <strong>Strict TLS 1.3 / JWT Session Encryption</strong>
            </InlineMeta>
          </div>
        </Panel>
      </div>
    </main>
  );
}

export default AdminView;
