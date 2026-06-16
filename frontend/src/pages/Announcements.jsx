import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'general', priority: 'normal' });
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === 'society_admin' || user?.role === 'platform_admin';

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/announcements', { params: { limit: 50 } });
      setAnnouncements(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/announcements', form);
      setForm({ title: '', content: '', type: 'general', priority: 'normal' });
      setShowForm(false);
      await fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      await fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete announcement');
    }
  };

  const priorityColor = {
    urgent: 'status-high',
    high: 'status-high',
    normal: 'status-medium',
    low: 'status-low',
  };

  return (
    <Layout>
      <div className="p-lg max-w-4xl mx-auto space-y-lg">
        <header className="flex justify-between items-start flex-wrap gap-sm">
          <div>
            <h1 className="text-h1 text-primary">Announcements</h1>
            <p className="text-body-lg text-on-surface-variant mt-xs">Society updates and notices</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              {showForm ? 'Cancel' : 'New Announcement'}
            </button>
          )}
        </header>

        {error && (
          <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg text-body-sm">{error}</div>
        )}

        {showForm && isAdmin && (
          <form onSubmit={handleCreate} className="card p-md space-y-md">
            <input
              required
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
            />
            <textarea
              required
              placeholder="Content"
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="input resize-none"
            />
            <div className="flex gap-md flex-wrap">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input w-auto"
              >
                <option value="general">General</option>
                <option value="maintenance">Maintenance</option>
                <option value="event">Event</option>
                <option value="emergency">Emergency</option>
                <option value="rule">Rule</option>
              </select>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="input w-auto"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Publishing...' : 'Publish'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-center py-xl text-on-surface-variant">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="card p-xl text-center text-on-surface-variant">No announcements yet</div>
        ) : (
          <div className="space-y-md">
            {announcements.map((a) => (
              <article key={a.id} className={`card p-md ${a.is_pinned ? 'border-l-4 border-secondary' : ''}`}>
                <div className="flex justify-between items-start gap-sm">
                  <div>
                    <div className="flex items-center gap-xs mb-xs flex-wrap">
                      {a.is_pinned && (
                        <span className="text-[10px] bg-secondary-fixed text-on-secondary-fixed px-xs py-[2px] rounded-full font-bold">
                          PINNED
                        </span>
                      )}
                      <span className={`text-[10px] px-xs py-[2px] rounded-full ${priorityColor[a.priority] || 'status-low'}`}>
                        {a.priority}
                      </span>
                      <span className="text-label-caps text-on-surface-variant capitalize">{a.type}</span>
                    </div>
                    <h2 className="text-h3 text-primary">{a.title}</h2>
                    <p className="text-body-sm text-on-surface-variant mt-xs whitespace-pre-wrap">{a.content}</p>
                    <p className="text-[10px] text-on-surface-variant mt-sm">
                      {a.created_by_name} · {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-on-surface-variant hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
