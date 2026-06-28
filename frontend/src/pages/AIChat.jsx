import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SUGGESTED_PROMPTS = [
  'What are the society rules for common areas?',
  'How do I report a maintenance issue?',
  'What are the amenity booking hours?',
  'How can I pay my maintenance dues?',
  'Who do I contact for parking issues?',
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-md`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 mr-sm mt-1">
          <span
            className="material-symbols-outlined text-primary text-[16px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-md py-sm text-body-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-secondary text-on-secondary rounded-br-sm'
            : 'bg-surface border border-outline-variant text-on-surface rounded-bl-sm'
        }`}
      >
        {msg.content}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0 ml-sm mt-1">
          <span className="material-symbols-outlined text-secondary text-[16px]">person</span>
        </div>
      )}
    </div>
  );
}

export default function AIChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello${user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}! I'm your Society AI assistant. I can help you with maintenance requests, society rules, payments, amenity bookings, and more. What can I help you with today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiStatus, setAiStatus] = useState('unknown'); // 'online' | 'offline' | 'unknown'
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Check AI health on mount
  useEffect(() => {
    api.get('/ai/health')
      .then(() => setAiStatus('online'))
      .catch(() => setAiStatus('offline'));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    setInput('');
    setError(null);
    const userMsg = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const { data } = await api.post('/ai/chat', {
        message: trimmed,
        conversationHistory: history,
      });

      const reply =
        data.response?.reply ||
        data.response?.message ||
        data.response?.content ||
        (typeof data.response === 'string' ? data.response : "I couldn't generate a response. Please try again.");

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.response?.data?.message || 'AI service is temporarily unavailable.');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat cleared! How can I help you?",
      },
    ]);
    setError(null);
  };

  return (
    <Layout>
      <div className="flex flex-col h-full max-h-[calc(100vh-64px)]">

        {/* Header */}
        <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-surface flex-shrink-0">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
            </div>
            <div>
              <h1 className="text-h3 text-primary font-bold">Society AI Assistant</h1>
              <div className="flex items-center gap-xs">
                <div
                  className={`w-2 h-2 rounded-full ${
                    aiStatus === 'online'
                      ? 'bg-green-500'
                      : aiStatus === 'offline'
                      ? 'bg-red-400'
                      : 'bg-yellow-400'
                  }`}
                />
                <span className="text-[11px] text-on-surface-variant capitalize">
                  {aiStatus === 'online' ? 'Online' : aiStatus === 'offline' ? 'Service unavailable' : 'Checking…'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="text-on-surface-variant hover:text-primary transition-colors"
            title="Clear chat"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-lg py-md bg-background">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {loading && (
            <div className="flex justify-start mb-md">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 mr-sm mt-1">
                <span
                  className="material-symbols-outlined text-primary text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
              </div>
              <div className="bg-surface border border-outline-variant rounded-2xl rounded-bl-sm px-md py-sm flex items-center gap-xs">
                <span className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center mb-md">
              <div className="bg-error-container text-on-error-container px-md py-sm rounded-xl text-body-sm flex items-center gap-xs">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts — shown only when just the welcome message exists */}
        {messages.length === 1 && (
          <div className="px-lg pb-sm flex gap-sm overflow-x-auto flex-shrink-0 scrollbar-hide">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="flex-shrink-0 text-[12px] border border-outline-variant rounded-full px-sm py-xs hover:bg-primary-container hover:border-primary hover:text-primary transition-all whitespace-nowrap text-on-surface-variant"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="px-lg py-md border-t border-outline-variant bg-surface flex-shrink-0">
          <div className="relative flex items-end gap-sm max-w-4xl mx-auto">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about maintenance, rules, bookings, payments…"
                disabled={loading}
                rows={1}
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-md py-sm pr-12 text-body-sm focus:ring-2 focus:ring-secondary focus:border-transparent outline-none resize-none disabled:opacity-50 leading-relaxed"
                style={{ minHeight: '44px', maxHeight: '120px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="absolute right-2 bottom-2 w-8 h-8 bg-secondary text-on-secondary rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-on-surface-variant mt-xs">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </Layout>
  );
}
