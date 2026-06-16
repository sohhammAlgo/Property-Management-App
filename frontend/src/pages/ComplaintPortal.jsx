import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import AiChatPanel from '../components/AiChatPanel';
import api, { formatPriority, formatStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

function deriveTitle(description) {
  const line = description.trim().split(/[.!?\n]/)[0];
  if (line.length >= 5) return line.slice(0, 255);
  return description.trim().slice(0, 255) || 'Maintenance Request';
}

export default function ComplaintPortal() {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [aiPreview, setAiPreview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef = useRef();
  const debounceRef = useRef();
  const isAdmin = user?.role === 'society_admin' || user?.role === 'platform_admin';

  const fetchComplaints = async () => {
    setLoadingList(true);
    try {
      const { data } = await api.get('/complaints', { params: { limit: 20 } });
      setComplaints(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (description.length < 20) {
      setAiPreview(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const { data } = await api.post('/ai/chat', {
          message: `Classify this complaint briefly. Reply with only JSON: {"category":"...","priority":"high|medium|low","summary":"..."}. Complaint: ${description}`,
          conversationHistory: [],
        });
        const raw = data.response?.reply || data.response?.message || data.response?.content || '';
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          setAiPreview(JSON.parse(match[0]));
        }
      } catch {
        setAiPreview(null);
      } finally {
        setAiLoading(false);
      }
    }, 800);
    return () => clearTimeout(debounceRef.current);
  }, [description]);

  const handleFileChange = (e) => setFiles(Array.from(e.target.files).slice(0, 1));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    setFiles(Array.from(e.dataTransfer.files).slice(0, 1));
  };

  const handleSubmit = async () => {
    if (!description.trim() || description.length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('title', deriveTitle(description));
      formData.append('description', description);
      if (files[0]) formData.append('image', files[0]);

      const { data } = await api.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(data.complaint);
      setDescription('');
      setFiles([]);
      setAiPreview(null);
      await fetchComplaints();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.patch(`/complaints/${id}/status`, { status });
      await fetchComplaints();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <Layout>
      <div className="flex">
        <div className="flex-1 p-lg overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-lg">
            <header>
              <h1 className="text-h1 text-primary">Smart Complaint Portal</h1>
              <p className="text-body-lg text-on-surface-variant mt-xs">
                Describe your issue and our AI will categorize and route it to the right team.
              </p>
            </header>

            {error && (
              <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg text-body-sm">{error}</div>
            )}

            {submitted && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-md py-sm rounded-lg flex items-center gap-sm">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
                Complaint submitted! Category: {submitted.category}, Priority: {formatPriority(submitted.priority)}
              </div>
            )}

            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-card">
              <div className="flex flex-col gap-lg">
                <div className="flex flex-col gap-xs">
                  <label className="text-label-caps text-primary uppercase tracking-wider">Describe the Issue</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Example: The pipe under the kitchen sink is leaking significantly..."
                    rows={6}
                    className="w-full bg-surface border border-outline-variant rounded-xl p-md text-body-lg focus:ring-2 focus:ring-secondary focus:border-transparent transition-all placeholder:text-outline-variant outline-none resize-none"
                  />
                  <div className="flex justify-end">
                    <span className="text-label-caps text-on-surface-variant">{description.length} characters</span>
                  </div>
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="text-label-caps text-primary uppercase tracking-wider">Attach Evidence (Optional)</label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-xl flex flex-col items-center justify-center gap-sm cursor-pointer transition-all ${
                      dragging ? 'border-secondary bg-secondary/5' : 'border-outline-variant hover:border-secondary hover:bg-surface-container-low'
                    }`}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                  >
                    <span className="material-symbols-outlined text-secondary text-[48px]">cloud_upload</span>
                    <p className="text-body-lg text-on-surface">Click to upload or drag and drop</p>
                    <p className="text-body-sm text-on-surface-variant">PNG, JPG (max. 10MB, one file)</p>
                    {files.length > 0 && (
                      <span className="bg-secondary-fixed text-on-secondary-fixed text-label-caps px-xs py-[2px] rounded-full">{files[0].name}</span>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </div>
                </div>

                {(aiPreview || aiLoading) && (
                  <div className="ai-glow-border bg-surface-container-high/90 backdrop-blur-md border-l-4 border-secondary rounded-xl p-md">
                    <div className="flex items-center gap-sm mb-md">
                      <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                      <h3 className="text-h3 text-primary">Live AI Analysis</h3>
                      {aiLoading && <span className="ml-auto text-label-caps text-secondary animate-pulse">Analyzing...</span>}
                    </div>
                    {aiPreview && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md text-body-sm">
                        <div><span className="text-label-caps text-on-surface-variant">Category</span><p className="font-semibold text-primary">{aiPreview.category}</p></div>
                        <div><span className="text-label-caps text-on-surface-variant">Priority</span><p className="font-semibold text-primary capitalize">{aiPreview.priority}</p></div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
                  <button onClick={handleSubmit} disabled={submitting || !description.trim()} className="btn-primary disabled:opacity-50">
                    {submitting ? 'Submitting...' : 'Submit Complaint'}
                  </button>
                </div>
              </div>
            </section>

            <section className="card overflow-hidden">
              <div className="p-md border-b border-outline-variant">
                <h2 className="text-h3 text-on-surface">{isAdmin ? 'All Complaints' : 'My Complaints'}</h2>
              </div>
              {loadingList ? (
                <p className="p-md text-on-surface-variant">Loading...</p>
              ) : complaints.length === 0 ? (
                <p className="p-md text-on-surface-variant">No complaints yet</p>
              ) : (
                <ul className="divide-y divide-outline-variant/30">
                  {complaints.map((c) => (
                    <li key={c.id} className="p-md hover:bg-surface-container">
                      <div className="flex justify-between items-start gap-sm">
                        <div>
                          <p className="font-semibold text-primary">{c.title}</p>
                          <p className="text-body-sm text-on-surface-variant mt-xs line-clamp-2">{c.description}</p>
                          <div className="flex gap-sm mt-xs flex-wrap text-[10px]">
                            <span>{c.category}</span>
                            <span>{formatPriority(c.priority)}</span>
                            <span>{formatStatus(c.status)}</span>
                            {isAdmin && c.user_name && <span>{c.user_name}</span>}
                          </div>
                        </div>
                        {isAdmin && c.status === 'open' && (
                          <button onClick={() => handleStatusUpdate(c.id, 'in_progress')} className="btn-secondary text-[10px] py-xs px-sm">
                            Start
                          </button>
                        )}
                        {isAdmin && c.status === 'in_progress' && (
                          <button onClick={() => handleStatusUpdate(c.id, 'resolved')} className="btn-primary text-[10px] py-xs px-sm">
                            Resolve
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

        <aside className="hidden xl:flex flex-col w-80">
          <AiChatPanel className="h-full rounded-none border-l" />
        </aside>
      </div>
    </Layout>
  );
}
