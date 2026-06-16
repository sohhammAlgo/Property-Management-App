import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import api, { formatStatus } from '../services/api';

function getWeekDates(baseDate = new Date()) {
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDateISO(d) {
  return d.toISOString().split('T')[0];
}

function formatTimeLabel(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AmenityBooking() {
  const [amenities, setAmenities] = useState([]);
  const [selectedAmenityId, setSelectedAmenityId] = useState(null);
  const [weekStart, setWeekStart] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDateISO(new Date()));
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const selectedAmenity = amenities.find((a) => a.id === selectedAmenityId);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [aRes, bRes] = await Promise.all([
          api.get('/bookings/amenities'),
          api.get('/bookings', { params: { limit: 10 } }),
        ]);
        const list = aRes.data.amenities || [];
        setAmenities(list);
        if (list.length > 0) setSelectedAmenityId(list[0].id);
        setBookings(bRes.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load amenities');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedAmenityId || !selectedDate) return;
    const loadSlots = async () => {
      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        const { data } = await api.get(`/bookings/amenities/${selectedAmenityId}/slots`, {
          params: { date: selectedDate },
        });
        setSlots(data.slots || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load slots');
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    loadSlots();
  }, [selectedAmenityId, selectedDate]);

  const shiftWeek = (delta) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  };

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedAmenityId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/bookings', {
        amenityId: selectedAmenityId,
        bookingDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes: notes || undefined,
      });
      setSuccess(true);
      setSelectedSlot(null);
      setNotes('');
      const { data } = await api.get('/bookings', { params: { limit: 10 } });
      setBookings(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-xl text-center text-on-surface-variant">Loading amenities...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-lg max-w-[1440px] mx-auto space-y-lg">
        <header>
          <h1 className="text-h1 text-primary">Amenity Reservation</h1>
          <p className="text-body-lg text-on-surface-variant">Reserve shared spaces and facilities.</p>
        </header>

        {error && (
          <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg text-body-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-md py-sm rounded-lg flex items-center gap-sm">
            <span className="material-symbols-outlined text-green-600">check_circle</span>
            Reservation submitted! Awaiting admin approval.
          </div>
        )}

        {amenities.length === 0 ? (
          <div className="card p-xl text-center text-on-surface-variant">No amenities configured for your society</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              {amenities.map((am) => (
                <div
                  key={am.id}
                  onClick={() => setSelectedAmenityId(am.id)}
                  className={`card p-md cursor-pointer transition-all ${
                    selectedAmenityId === am.id ? 'border-2 border-secondary ring-4 ring-secondary/10' : 'hover:shadow-md'
                  }`}
                >
                  <h4 className="text-h3 text-primary">{am.name}</h4>
                  <p className="text-body-sm text-on-surface-variant mt-xs">{am.description || 'Shared facility'}</p>
                  <div className="flex gap-sm mt-md text-label-caps text-on-surface-variant">
                    <span>Max {am.capacity}</span>
                    {Number(am.price_per_slot) > 0 && <span>₹{am.price_per_slot}/slot</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-outline-variant shadow-card overflow-hidden flex flex-col lg:flex-row">
              <div className="flex-grow p-md border-r border-outline-variant">
                <div className="flex items-center justify-between mb-lg flex-wrap gap-sm">
                  <div className="flex items-center gap-md">
                    <h2 className="text-h3 text-on-surface">
                      {weekDates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
                      {weekDates[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </h2>
                    <div className="flex border border-outline-variant rounded-lg">
                      <button type="button" onClick={() => shiftWeek(-1)} className="p-xs hover:bg-surface-container-low">
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      <button type="button" onClick={() => shiftWeek(1)} className="p-xs hover:bg-surface-container-low border-l border-outline-variant">
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-xs mb-md overflow-x-auto">
                  {weekDates.map((d) => {
                    const iso = formatDateISO(d);
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => setSelectedDate(iso)}
                        className={`flex flex-col items-center px-md py-sm rounded-lg min-w-[64px] transition-colors ${
                          selectedDate === iso ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low hover:bg-surface-container'
                        }`}
                      >
                        <span className="text-label-caps">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                        <span className="text-body-lg font-bold">{d.getDate()}</span>
                      </button>
                    );
                  })}
                </div>

                {slotsLoading ? (
                  <p className="text-on-surface-variant">Loading available slots...</p>
                ) : slots.length === 0 ? (
                  <p className="text-on-surface-variant">No slots available for this date</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-sm">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => slot.available && setSelectedSlot(slot)}
                          className={`p-sm rounded-lg text-body-sm transition-colors ${
                            !slot.available
                              ? 'bg-on-surface-variant/20 opacity-50 cursor-not-allowed'
                              : isSelected
                                ? 'border-2 border-secondary bg-secondary/10'
                                : 'bg-surface-container-low hover:bg-secondary/10'
                          }`}
                        >
                          {formatTimeLabel(slot.startTime)} – {formatTimeLabel(slot.endTime)}
                          {!slot.available && <span className="block text-[10px]">Booked</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="w-full lg:w-96 bg-surface-container-low p-lg flex flex-col">
                <h3 className="text-h2 text-primary mb-md">Booking Details</h3>
                <div className="space-y-md mb-xl flex-1">
                  <div className="bg-white p-md rounded-xl border border-outline-variant">
                    <div className="text-label-caps text-on-surface-variant mb-xs">Selected</div>
                    <p className="font-semibold">{selectedAmenity?.name}</p>
                    <p className="text-body-sm text-on-surface-variant">
                      {selectedDate}{selectedSlot ? ` · ${formatTimeLabel(selectedSlot.startTime)}` : ' · Pick a slot'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-label-caps text-on-surface-variant mb-xs">Notes (optional)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input resize-none" />
                  </div>
                </div>
                <button
                  onClick={handleConfirm}
                  disabled={submitting || !selectedSlot}
                  className="w-full bg-secondary text-white py-md rounded-xl font-bold hover:bg-primary transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Confirming...' : 'Confirm Reservation'}
                </button>
              </div>
            </div>
          </>
        )}

        {bookings.length > 0 && (
          <section className="card overflow-hidden">
            <div className="p-md border-b border-outline-variant">
              <h2 className="text-h3 text-on-surface">Your Bookings</h2>
            </div>
            <ul className="divide-y divide-outline-variant/30">
              {bookings.map((b) => (
                <li key={b.id} className="p-md flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-primary">{b.amenity_name}</p>
                    <p className="text-body-sm text-on-surface-variant">
                      {b.booking_date} · {formatTimeLabel(b.start_time)} – {formatTimeLabel(b.end_time)}
                    </p>
                  </div>
                  <span className="text-label-caps">{formatStatus(b.status)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  );
}
