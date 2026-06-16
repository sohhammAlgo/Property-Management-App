import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api, { formatPriority, formatStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, aRes, bRes, pRes] = await Promise.all([
          api.get('/complaints', { params: { limit: 5 } }),
          api.get('/announcements', { params: { limit: 3 } }),
          api.get('/bookings', { params: { limit: 3 } }),
          api.get('/payments', { params: { limit: 3, status: 'pending' } }),
        ]);
        setComplaints(cRes.data.data || []);
        setAnnouncements(aRes.data.data || []);
        setBookings(bRes.data.data || []);
        setPayments(pRes.data.data || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openComplaints = complaints.filter((c) => c.status !== 'resolved' && c.status !== 'closed').length;

  return (
    <Layout>
      <div className="p-lg max-w-[1440px] mx-auto space-y-lg">
        <header>
          <h1 className="text-h1 text-primary">Welcome, {user?.displayName?.split(' ')[0] || 'Resident'}</h1>
          <p className="text-body-lg text-on-surface-variant mt-xs">
            {user?.flatNumber ? `Unit ${user.flatNumber}${user.block ? ` · Block ${user.block}` : ''}` : 'Your society dashboard'}
          </p>
        </header>

        {loading ? (
          <div className="text-center py-xl text-on-surface-variant">Loading dashboard...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
              {[
                { label: 'Open Complaints', value: openComplaints, icon: 'report', to: '/complaints' },
                { label: 'Pending Payments', value: payments.length, icon: 'payments', to: '/payments' },
                { label: 'Upcoming Bookings', value: bookings.filter((b) => b.status === 'approved' || b.status === 'pending').length, icon: 'calendar_today', to: '/amenities' },
                { label: 'Announcements', value: announcements.length, icon: 'campaign', to: '/announcements' },
              ].map((s) => (
                <Link key={s.label} to={s.to} className="card p-md hover:shadow-md transition-shadow">
                  <span className="material-symbols-outlined text-secondary mb-xs">{s.icon}</span>
                  <p className="text-h2 text-primary font-bold">{s.value}</p>
                  <p className="text-label-caps text-on-surface-variant">{s.label}</p>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
              <section className="card overflow-hidden">
                <div className="p-md border-b border-outline-variant flex justify-between items-center">
                  <h2 className="text-h3 text-on-surface">Recent Complaints</h2>
                  <Link to="/complaints" className="text-primary text-label-caps hover:underline">View All</Link>
                </div>
                {complaints.length === 0 ? (
                  <p className="p-md text-on-surface-variant text-body-sm">No complaints yet</p>
                ) : (
                  <ul className="divide-y divide-outline-variant/30">
                    {complaints.map((c) => (
                      <li key={c.id} className="p-md hover:bg-surface-container">
                        <p className="text-body-sm font-semibold text-primary">{c.title}</p>
                        <div className="flex gap-sm mt-xs text-[10px]">
                          <span className="status-medium">{formatPriority(c.priority)}</span>
                          <span className="text-on-surface-variant">{formatStatus(c.status)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card overflow-hidden">
                <div className="p-md border-b border-outline-variant flex justify-between items-center">
                  <h2 className="text-h3 text-on-surface">Announcements</h2>
                  <Link to="/announcements" className="text-primary text-label-caps hover:underline">View All</Link>
                </div>
                {announcements.length === 0 ? (
                  <p className="p-md text-on-surface-variant text-body-sm">No announcements</p>
                ) : (
                  <ul className="divide-y divide-outline-variant/30">
                    {announcements.map((a) => (
                      <li key={a.id} className="p-md hover:bg-surface-container">
                        <p className="text-body-sm font-semibold text-primary">{a.title}</p>
                        <p className="text-body-sm text-on-surface-variant mt-xs line-clamp-2">{a.content}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
              <Link to="/complaints" className="btn-primary text-center">Submit Complaint</Link>
              <Link to="/amenities" className="btn-secondary text-center">Book Amenity</Link>
              <Link to="/help" className="btn-secondary text-center">Get Help</Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
