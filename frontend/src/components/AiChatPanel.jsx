import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';

export default function AiChatPanel({ className = '' }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your Society AI assistant. Ask me about maintenance, rules, payments, or amenities.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError(null);
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const { data } = await api.post('/ai/chat', {
        message: text,
        conversationHistory: history,
      });

      const reply =
        data.response?.reply ||
        data.response?.message ||
        data.response?.content ||
        (typeof data.response === 'string' ? data.response : 'I couldn\'t generate a response.');

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.response?.data?.message || 'AI service unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col bg-surface-container-high/90 backdrop-blur-md border border-primary/10 shadow-2xl ${className}`}>
      <div className="p-md border-b border-outline-variant">
        <h3 className="text-h3 text-primary font-bold">AI Society Assistant</h3>
        <p className="text-body-sm text-on-surface-variant">Ask about maintenance, rules, or society info</p>
      </div>

      <div className="flex-1 p-md space-y-md overflow-y-auto min-h-[200px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-xl p-md text-body-sm ${
              msg.role === 'user'
                ? 'bg-surface ml-xs shadow-card'
                : 'bg-primary-container text-on-primary-container'
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-xs text-body-sm text-on-surface-variant">
            <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
            Thinking...
          </div>
        )}
        {error && (
          <div className="text-body-sm text-error bg-error-container px-sm py-xs rounded-lg">{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="p-md border-t border-outline-variant">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a question..."
            disabled={loading}
            className="w-full bg-surface border border-outline-variant rounded-full px-md py-sm text-body-sm focus:ring-2 focus:ring-primary outline-none pr-12 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-primary disabled:opacity-40"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
