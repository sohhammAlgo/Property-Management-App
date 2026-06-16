import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Members() {
  const { user } = useAuth();
  const [residents, setResidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.tenantId) {
      setLoading(false);
      setError('No society associated with your account');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resRes, statsRes] = await Promise.all([
          api.get(`/tenants/${user.tenantId}/residents`),
          api.get(`/tenants/${user.tenantId}/stats`),
        ]);
        setResidents(resRes.data.data || []);
        setStats(statsRes.data.stats);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.tenantId]);

  return (
    <Layout>
      <div className="p-lg max-w-5xl mx-auto space-y-lg">
        <header>
          <h1 className="text-h1 text-primary">Members</h1>
          <p className="text-body-lg text-on-surface-variant mt-xs">Society residents and statistics</p>
        </header>

        {error && (
          <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg text-body-sm">{error}</div>
        )}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {[
              { label: 'Total Residents', value: stats.residents?.total || residents.length },
              { label: 'Open Complaints', value: stats.complaints?.open || '—' },
              { label: 'Pending Payments', value: stats.payments?.pending_count || '—' },
              { label: 'Pending Bookings', value: stats.bookings?.pending || '—' },
            ].map((s) => (
              <div key={s.label} className="card p-md text-center">
                <p className="text-h2 text-secondary font-bold">{s.value}</p>
                <p className="text-label-caps text-on-surface-variant">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <section className="card overflow-hidden">
          <div className="p-md border-b border-outline-variant">
            <h2 className="text-h3 text-on-surface">Resident Directory</h2>
          </div>
          {loading ? (
            <div className="p-xl text-center text-on-surface-variant">Loading members...</div>
          ) : residents.length === 0 ? (
            <div className="p-xl text-center text-on-surface-variant">No residents found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-label-caps text-on-surface-variant">
                    <th className="px-md py-sm">Name</th>
                    <th className="px-md py-sm">Email</th>
                    <th className="px-md py-sm">Flat</th>
                    <th className="px-md py-sm">Block</th>
                  </tr>
                </thead>
                <tbody className="text-body-sm divide-y divide-outline-variant/30">
                  {residents.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-container">
                      <td className="px-md py-sm font-semibold">{r.name}</td>
                      <td className="px-md py-sm text-on-surface-variant">{r.email}</td>
                      <td className="px-md py-sm">{r.flat_number || '—'}</td>
                      <td className="px-md py-sm">{r.block || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
