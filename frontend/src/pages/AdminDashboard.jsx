import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import AiChatPanel from '../components/AiChatPanel';
import api, { formatPriority, formatStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORY_COLORS = ['#081d50', '#0058be', '#d8e2ff', '#c5c6d1', '#2170e4', '#94a3b8'];

function PriorityBadge({ priority }) {
  const label = formatPriority(priority);
  const cls = label === 'High' ? 'status-high' : label === 'Medium' ? 'status-medium' : 'status-low';
  return <span className={cls}>{label}</span>;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [paymentStats, setPaymentStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [error, setError] = useState(null);

  const [analyticsError, setAnalyticsError] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setAnalyticsError(null);
      setPaymentError(null);

      // Fetch complaints list (required — if this fails, show the global error)
      try {
        const cRes = await api.get('/complaints', { params: { limit: 10 } });
        setComplaints(cRes.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load complaints');
      }

      // Fetch complaint analytics independently
      try {
        const aRes = await api.get('/complaints/analytics');
        console.log('[AdminDashboard] analytics response:', aRes.data);
        setAnalytics(aRes.data.analytics || null);
      } catch (err) {
        console.warn('[AdminDashboard] complaint analytics failed:', err.response?.data || err.message);
        setAnalyticsError(err.response?.data?.message || 'Failed to load analytics');
      }

      // Fetch payment stats independently
      try {
        const pRes = await api.get('/payments/stats');
        console.log('[AdminDashboard] payment stats response:', pRes.data);
        setPaymentStats(pRes.data.stats || null);
      } catch (err) {
        console.warn('[AdminDashboard] payment stats failed:', err.response?.data || err.message);
        setPaymentError(err.response?.data?.message || 'Failed to load payment stats');
      }

      // AI insights — optional, failure is silent
      try {
        const iRes = await api.post('/ai/insights');
        setInsights(iRes.data.insights);
      } catch {
        // AI insights optional
      }

      setLoading(false);
    };
    load();
  }, []);

  const monthlyTrend = analytics?.monthly || [];
  const maxTrend = Math.max(...monthlyTrend.map((m) => Number(m.total || 0)), 1);
  const categories = analytics?.byCategory || [];
  const totalCategory = categories.reduce((s, c) => s + Number(c.count), 0) || 1;
  const revenueMonthly = paymentStats?.monthly || [];
  const maxRevenue = Math.max(...revenueMonthly.map((m) => Number(m.revenue || 0)), 1);
  const totalCollected = paymentStats?.overview?.total_revenue || 0;

  const insightText =
    (typeof insights === 'string' && insights) ||
    insights?.summary ||
    insights?.insights?.[0] ||
    (insights?.length ? insights[0] : null) ||
    'Review complaint trends and payment collections to optimize society operations.';

  return (
    <Layout>
      <div className="p-lg max-w-[1440px] mx-auto space-y-lg">
        <section className="glass rounded-xl p-md flex items-center justify-between border-[2px] border-transparent"
          style={{ backgroundImage: 'linear-gradient(white,white), linear-gradient(to right, #081d50, #2170e4)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
          <div className="flex items-center gap-md">
            <div className="bg-primary-container p-sm rounded-full text-on-primary-container">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <div>
              <h3 className="text-h3 text-primary">Morning, {user?.displayName?.split(' ')[0] || 'Admin'}</h3>
              <p className="text-body-sm text-on-surface-variant">AI Insights: {insightText}</p>
            </div>
          </div>
          <button onClick={() => setAiDrawerOpen(true)} className="btn-secondary hidden sm:flex items-center gap-xs">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            AI Assistant
          </button>
        </section>

        {error && (
          <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg text-body-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-xl text-on-surface-variant">Loading analytics...</div>
        ) : (
          <div className="grid grid-cols-12 gap-gutter">
            <div className="col-span-12 lg:col-span-8 card p-md">
              <div className="flex justify-between items-start mb-lg">
                <div>
                  <h4 className="text-h3 text-on-surface">Complaint Trends</h4>
                  <p className="text-body-sm text-on-surface-variant">Monthly volume (last 6 months)</p>
                </div>
              </div>
              {analyticsError ? (
                <p className="text-on-error text-body-sm bg-error-container px-sm py-xs rounded">{analyticsError}</p>
              ) : monthlyTrend.length === 0 ? (
                <p className="text-on-surface-variant text-body-sm">No complaint data yet</p>
              ) : (
                <>
                  <div className="h-48 flex items-end justify-between gap-xs px-sm">
                    {monthlyTrend.map((m) => {
                      const h = Math.round((Number(m.total) / maxTrend) * 100);
                      return (
                        <div
                          key={m.month}
                          className="group relative flex-1 bg-primary/10 rounded-t-lg hover:bg-primary/25 transition-all"
                          style={{ height: `${Math.max(h, 5)}%` }}
                          title={`${m.total} complaints`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-sm px-sm text-[10px] text-label-caps text-on-surface-variant">
                    {monthlyTrend.map((m) => (
                      <span key={m.month}>{m.month?.slice(5)}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="col-span-12 lg:col-span-4 card p-md">
              <h4 className="text-h3 text-on-surface mb-lg">Category Breakdown</h4>
              {analyticsError ? (
                <p className="text-on-error text-body-sm bg-error-container px-sm py-xs rounded">{analyticsError}</p>
              ) : categories.length === 0 ? (
                <p className="text-on-surface-variant text-body-sm">No categories yet</p>
              ) : (
                <div className="space-y-xs">
                  {categories.map((item, i) => (
                    <div key={item.category} className="flex items-center justify-between text-body-sm">
                      <div className="flex items-center gap-xs">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        <span>{item.category}</span>
                      </div>
                      <span className="font-data-tabular text-on-surface-variant">
                        {item.count} ({Math.round((item.count / totalCategory) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-12 card p-md">
              <div className="flex justify-between items-center mb-lg flex-wrap gap-sm">
                <div>
                  <h4 className="text-h3 text-on-surface">Revenue Summary</h4>
                  <p className="text-body-sm text-on-surface-variant">Monthly collection status</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-label-caps text-on-surface-variant uppercase">Total Collected</p>
                  <p className="text-h3 text-secondary font-bold">₹{Number(totalCollected).toLocaleString()}</p>
                </div>
              </div>
              {paymentError ? (
                <p className="text-on-error text-body-sm bg-error-container px-sm py-xs rounded">{paymentError}</p>
              ) : revenueMonthly.length === 0 ? (
                <p className="text-on-surface-variant text-body-sm">No payment data yet</p>
              ) : (
                <div className="flex items-end gap-md h-28">
                  {revenueMonthly.slice(-6).map(({ month, revenue }) => {
                    const h = Math.round((Number(revenue || 0) / maxRevenue) * 100);
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-xs">
                        <div className="w-full bg-secondary-container rounded-t" style={{ height: `${Math.max(h, 5)}%` }} />
                        <span className="text-label-caps text-on-surface-variant">{month?.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="col-span-12 card overflow-hidden">
              <div className="p-md border-b border-outline-variant flex justify-between items-center">
                <h4 className="text-h3 text-on-surface">Recent Complaints</h4>
                <Link to="/complaints" className="text-primary text-label-caps hover:underline">View All</Link>
              </div>
              {complaints.length === 0 ? (
                <p className="p-md text-on-surface-variant text-body-sm">No complaints yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low text-label-caps text-on-surface-variant uppercase tracking-wider">
                        <th className="px-md py-sm">ID</th>
                        <th className="px-md py-sm">Resident</th>
                        <th className="px-md py-sm">Issue</th>
                        <th className="px-md py-sm">Category</th>
                        <th className="px-md py-sm">Priority</th>
                        <th className="px-md py-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-body-sm divide-y divide-outline-variant/30">
                      {complaints.map((c) => (
                        <tr key={c.id} className="hover:bg-surface-container transition-colors">
                          <td className="px-md py-sm font-data-tabular">#{c.id?.slice(0, 8)}</td>
                          <td className="px-md py-sm">{c.user_name || 'Unknown'}</td>
                          <td className="px-md py-sm text-on-surface-variant max-w-xs truncate">{c.title || c.description?.slice(0, 50)}</td>
                          <td className="px-md py-sm">{c.category}</td>
                          <td className="px-md py-sm"><PriorityBadge priority={c.priority} /></td>
                          <td className="px-md py-sm">{formatStatus(c.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={`fixed inset-0 z-50 transition-all duration-300 ${aiDrawerOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-black/20 transition-opacity ${aiDrawerOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setAiDrawerOpen(false)} />
        <aside className={`absolute right-0 top-0 h-full w-80 transition-transform duration-300 ${aiDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <AiChatPanel className="h-full rounded-none" />
        </aside>
      </div>
    </Layout>
  );
}
