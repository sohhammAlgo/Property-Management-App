import React from 'react';
import Layout from '../components/Layout';
import AiChatPanel from '../components/AiChatPanel';

const FAQ = [
  {
    q: 'How do I submit a maintenance complaint?',
    a: 'Go to Complaints from the sidebar, describe your issue, attach photos if needed, and submit. AI will categorize it automatically.',
  },
  {
    q: 'How do I book an amenity?',
    a: 'Navigate to Bookings, select an amenity, pick an available time slot, and confirm your reservation.',
  },
  {
    q: 'How do I pay maintenance fees?',
    a: 'Open Payments, select the maintenance fee, and complete payment via Razorpay.',
  },
  {
    q: 'Who can see my complaints?',
    a: 'Only you and society administrators can view your complaint details.',
  },
];

export default function HelpCenter() {
  return (
    <Layout>
      <div className="p-lg max-w-6xl mx-auto">
        <header className="mb-lg">
          <h1 className="text-h1 text-primary">Help Center</h1>
          <p className="text-body-lg text-on-surface-variant mt-xs">
            Get answers from our AI assistant or browse common questions.
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-lg">
          <section className="space-y-md">
            <h2 className="text-h3 text-primary">Frequently Asked Questions</h2>
            {FAQ.map((item) => (
              <div key={item.q} className="card p-md">
                <h3 className="text-body-lg font-semibold text-primary mb-xs">{item.q}</h3>
                <p className="text-body-sm text-on-surface-variant">{item.a}</p>
              </div>
            ))}

            <div className="card p-md bg-primary-container/30">
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-secondary">support_agent</span>
                <h3 className="text-h3 text-primary">Need more help?</h3>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                Submit a complaint through the Complaints portal for urgent maintenance issues,
                or use the AI assistant for general questions.
              </p>
            </div>
          </section>

          <AiChatPanel className="rounded-xl h-[600px]" />
        </div>
      </div>
    </Layout>
  );
}
