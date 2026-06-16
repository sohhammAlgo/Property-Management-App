import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api, { formatStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
}

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState(2500);
  const isAdmin = user?.role === 'society_admin' || user?.role === 'platform_admin';

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/payments', { params: { limit: 50 } });
      setPayments(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handlePay = async () => {
    setPaying(true);
    setError(null);
    try {
      const now = new Date();
      const { data } = await api.post('/payments/create-order', {
        amount,
        paymentType: 'maintenance',
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        currency: 'INR',
      });

      const Razorpay = await loadRazorpay();
      if (!Razorpay) {
        setError('Payment gateway failed to load. Check your connection.');
        return;
      }

      const rzp = new Razorpay({
        key: data.order.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: user?.tenantName || 'SocietyPro AI',
        description: 'Maintenance Fee',
        order_id: data.order.id,
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentDbId: data.payment.id,
            });
            await fetchPayments();
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verification failed');
          }
        },
        prefill: { email: user?.email, name: user?.displayName },
        theme: { color: '#081d50' },
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create payment order');
    } finally {
      setPaying(false);
    }
  };

  return (
    <Layout>
      <div className="p-lg max-w-5xl mx-auto space-y-lg">
        <header>
          <h1 className="text-h1 text-primary">Payments</h1>
          <p className="text-body-lg text-on-surface-variant mt-xs">
            {isAdmin ? 'View society payment records' : 'Pay maintenance fees and view history'}
          </p>
        </header>

        {error && (
          <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg text-body-sm">{error}</div>
        )}

        {!isAdmin && (
          <section className="card p-md">
            <h2 className="text-h3 text-primary mb-md">Pay Maintenance Fee</h2>
            <div className="flex flex-wrap items-end gap-md">
              <div>
                <label className="text-label-caps text-on-surface-variant block mb-xs">Amount (INR)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min="1"
                  className="input w-40"
                />
              </div>
              <button onClick={handlePay} disabled={paying} className="btn-primary">
                {paying ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </section>
        )}

        <section className="card overflow-hidden">
          <div className="p-md border-b border-outline-variant">
            <h2 className="text-h3 text-on-surface">Payment History</h2>
          </div>
          {loading ? (
            <div className="p-xl text-center text-on-surface-variant">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="p-xl text-center text-on-surface-variant">No payments found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-label-caps text-on-surface-variant">
                    <th className="px-md py-sm">Date</th>
                    {isAdmin && <th className="px-md py-sm">Resident</th>}
                    <th className="px-md py-sm">Type</th>
                    <th className="px-md py-sm">Amount</th>
                    <th className="px-md py-sm">Status</th>
                  </tr>
                </thead>
                <tbody className="text-body-sm divide-y divide-outline-variant/30">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-container">
                      <td className="px-md py-sm">{new Date(p.created_at).toLocaleDateString()}</td>
                      {isAdmin && <td className="px-md py-sm">{p.user_name || '—'}</td>}
                      <td className="px-md py-sm capitalize">{p.payment_type}</td>
                      <td className="px-md py-sm font-data-tabular">₹{Number(p.amount).toLocaleString()}</td>
                      <td className="px-md py-sm">{formatStatus(p.status)}</td>
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
