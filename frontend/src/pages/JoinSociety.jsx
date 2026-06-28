import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinSociety } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function JoinSociety() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [tenantId, setTenantId] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId.trim())) {
      setError('Society ID must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { tenantId: tenantId.trim() };
      if (flatNumber.trim()) payload.flatNumber = flatNumber.trim();
      if (block.trim()) payload.block = block.trim();
      if (floor !== '') payload.floor = Number(floor);

      await joinSociety(payload);
      // Refresh the user profile so tenantId is populated → ProtectedRoute unlocks
      await refreshProfile();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join society. Check the Society ID and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-md">
      <div className="w-full max-w-lg space-y-xl">

        {/* Header */}
        <div className="text-center space-y-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-container mb-sm">
            <span
              className="material-symbols-outlined text-primary text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              corporate_fare
            </span>
          </div>
          <h1 className="text-h1 text-primary font-bold">Join Your Society</h1>
          <p className="text-body-lg text-on-surface-variant max-w-sm mx-auto">
            Enter the Society ID provided by your administrator to connect your account.
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-card p-lg space-y-lg">

          {error && (
            <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg text-body-sm flex items-start gap-xs">
              <span className="material-symbols-outlined text-sm mt-0.5 flex-shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-md">
            {/* Society ID */}
            <div className="space-y-xs">
              <label htmlFor="tenantId" className="text-label-caps text-on-surface-variant uppercase tracking-wider">
                Society ID <span className="text-error">*</span>
              </label>
              <input
                id="tenantId"
                type="text"
                required
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="input font-mono"
                spellCheck={false}
              />
              <p className="text-[11px] text-on-surface-variant">
                Ask your Society Admin for this ID — it looks like a UUID.
              </p>
            </div>

            {/* Flat details */}
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label htmlFor="flatNumber" className="text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Flat / Unit No.
                </label>
                <input
                  id="flatNumber"
                  type="text"
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  placeholder="e.g. 4B"
                  className="input"
                />
              </div>
              <div className="space-y-xs">
                <label htmlFor="block" className="text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Block / Tower
                </label>
                <input
                  id="block"
                  type="text"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  placeholder="e.g. A"
                  className="input"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label htmlFor="floor" className="text-label-caps text-on-surface-variant uppercase tracking-wider">
                Floor
              </label>
              <input
                id="floor"
                type="number"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. 3"
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !tenantId.trim()}
              className="w-full btn-primary flex justify-center items-center gap-sm disabled:opacity-50"
            >
              {submitting ? (
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm">login</span>
              )}
              {submitting ? 'Joining…' : 'Join Society'}
            </button>
          </form>
        </div>

        {/* AI hint */}
        <div className="ai-accent-border p-sm rounded-xl shadow-card backdrop-blur-md">
          <div className="flex items-start gap-sm">
            <div className="p-xs bg-primary-container rounded-lg flex-shrink-0">
              <span
                className="material-symbols-outlined text-on-primary-container"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
            </div>
            <div>
              <h4 className="text-label-caps text-primary font-bold">Don't have a Society ID?</h4>
              <p className="text-[12px] text-on-surface-variant leading-snug mt-1">
                Contact your Society Admin. They can find the ID in their Admin Dashboard → Society Settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
