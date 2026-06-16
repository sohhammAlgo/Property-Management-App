import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function PlatformDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [growth, setGrowth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, growthRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/tenants/growth'),
        ]);
        setDashboard(dashRes.data.dashboard);
        setGrowth(growthRes.data.growth || growthRes.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load platform dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="p-xl text-center text-on-surface-variant">Loading platform metrics...</div>
      </Layout>
    );
  }

  const tenants = dashboard?.tenants || {};
  const users = dashboard?.users || {};
  const payments = dashboard?.payments || {};
  const complaints = dashboard?.complaints || {};

  return (
    <Layout>
      <div className="p-lg max-w-[1440px] mx-auto space-y-lg">
        <header>
          <h1 className="text-h1 text-primary">Platform Dashboard</h1>
          <p className="text-body-lg text-on-surface-variant mt-xs">Global SaaS metrics across all societies</p>
        </header>

        {error && (
          <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg text-body-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {[
            { label: 'Total Societies', value: tenants.total || 0, sub: `${tenants.active || 0} active` },
            { label: 'Total Users', value: users.total || 0, sub: `${users.residents || 0} residents` },
            { label: 'Platform Revenue', value: `₹${Number(payments.total_revenue || 0).toLocaleString()}`, sub: 'All time' },
            { label: 'Open Complaints', value: complaints.open || 0, sub: `${complaints.resolved || 0} resolved` },
          ].map((s) => (
            <div key={s.label} className="card p-md">
              <p className="text-h2 text-secondary font-bold">{s.value}</p>
              <p className="text-label-caps text-on-surface-variant">{s.label}</p>
              <p className="text-[10px] text-on-surface-variant mt-xs">{s.sub}</p>
            </div>
          ))}
        </div>

        {growth.length > 0 && (
          <section className="card p-md">
            <h2 className="text-h3 text-on-surface mb-md">Tenant Growth</h2>
            <div className="flex items-end gap-xs h-32">
              {growth.slice(-6).map((g) => {
                const max = Math.max(...growth.map((x) => Number(x.cumulative || x.new_tenants || 1)));
                const h = Math.round((Number(g.cumulative || g.new_tenants || 0) / max) * 100);
                return (
                  <div key={g.month} className="flex-1 flex flex-col items-center gap-xs">
                    <div className="w-full bg-secondary-container rounded-t" style={{ height: `${Math.max(h, 5)}%` }} />
                    <span className="text-[10px] text-label-caps text-on-surface-variant">{g.month?.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {dashboard?.subscriptionsByPlan?.length > 0 && (
          <section className="card p-md">
            <h2 className="text-h3 text-on-surface mb-md">Subscriptions by Plan</h2>
            <div className="space-y-xs">
              {dashboard.subscriptionsByPlan.map((p) => (
                <div key={p.plan} className="flex justify-between text-body-sm">
                  <span className="capitalize">{p.plan}</span>
                  <span className="font-data-tabular">{p.count} societies · ₹{Number(p.revenue || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
