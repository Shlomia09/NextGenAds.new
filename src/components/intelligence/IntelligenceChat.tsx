import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Loader, MessageSquare, Plus } from 'lucide-react';
import type { ChatMessage, Brand, Campaign } from '../../types';
import { sendChatMessage } from '../../lib/claude-api';

interface IntelligenceChatProps {
  brand: Brand;
  campaigns: Campaign[];
  sessionId?: string;
  initialMessages?: ChatMessage[];
  compact?: boolean;
}

const QUICK_QUESTIONS = [
  'Why is my ROAS dropping?',
  'Should I scale this campaign?',
  'What audience should I test next?',
  'Am I ready to increase budget?',
];

const IntelligenceChat: React.FC<IntelligenceChatProps> = ({
  brand,
  campaigns: _campaigns,
  initialMessages = [],
  compact = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendChatMessage({
        brand_id: brand.id,
        messages: apiMessages,
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'Unable to connect to the Intelligence Engine. Please check your API configuration.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };


  return (
    <div className={`ic-container ${compact ? 'ic-compact' : ''}`}>
      {/* Header */}
      <div className="ic-header">
        <div className="ic-header-left">
          <div className="ic-avatar">
            <Sparkles size={13} strokeWidth={1.5} />
          </div>
          <div>
            <div className="ic-title">Intelligence Engine</div>
            <div className="ic-subtitle">
              Active brand context · 9yr Beauty benchmark data
            </div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm">
          <Plus size={12} />
          New
        </button>
      </div>

      {/* Messages */}
      <div className="ic-messages">
        {messages.length === 0 && (
          <div className="ic-empty animate-fade-in">
            <div className="ic-empty-icon">
              <MessageSquare size={20} strokeWidth={1.5} />
            </div>
            <p className="ic-empty-title">Ask the Intelligence Engine</p>
            <p className="ic-empty-sub">
              Full context of your brand, campaigns, and 9 years of benchmark data
            </p>
            <div className="ic-quick-questions">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="ic-quick-btn"
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`ic-message ${msg.role}`}
          >
            <div className={`ic-msg-avatar ${msg.role}`}>
              {msg.role === 'user' ? <User size={11} strokeWidth={1.5} /> : <Sparkles size={11} strokeWidth={1.5} />}
            </div>
            <div className="ic-msg-body">
              <div className={`ic-msg-bubble ${msg.role}`}>
                {msg.content}
              </div>
              <span className="ic-msg-time">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="ic-message assistant animate-fade-in">
            <div className="ic-msg-avatar assistant">
              <Sparkles size={11} strokeWidth={1.5} />
            </div>
            <div className="ic-msg-body">
              <div className="ic-msg-bubble assistant ic-loading">
                <Loader size={12} className="animate-spin" />
                <span>Analysing your account data…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="ic-input-area">
        <textarea
          ref={inputRef}
          className="ic-input"
          placeholder="Ask about campaigns, ROAS, audiences…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <button
          className="ic-send-btn"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Send size={13} strokeWidth={1.5} />
        </button>
      </div>

      <style>{`
        .ic-container {
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius-lg);
          overflow: hidden;
          height: 100%;
          min-height: 500px;
        }

        .ic-compact { min-height: 400px; }

        .ic-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 0.5px solid var(--border-light);
          background: var(--bg-card);
          flex-shrink: 0;
        }

        .ic-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ic-avatar {
          width: 28px;
          height: 28px;
          background: var(--bg-dark);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--rose-gold-pale);
          flex-shrink: 0;
        }

        .ic-title {
          font-family: 'Playfair Display', serif;
          font-size: 13px;
          font-weight: 400;
          color: var(--text-primary);
        }

        .ic-subtitle {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 300;
          color: var(--text-muted);
          margin-top: 1px;
          letter-spacing: 0.02em;
        }

        .ic-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ic-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 32px 16px;
          gap: 8px;
          flex: 1;
        }

        .ic-empty-icon {
          width: 44px;
          height: 44px;
          background: var(--rose-gold-light);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--rose-gold);
          margin-bottom: 6px;
        }

        .ic-empty-title {
          font-family: 'Playfair Display', serif;
          font-size: 15px;
          font-weight: 400;
          color: var(--text-primary);
        }

        .ic-empty-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: var(--text-secondary);
          max-width: 240px;
          line-height: 1.5;
        }

        .ic-quick-questions {
          display: flex;
          flex-direction: column;
          gap: 5px;
          width: 100%;
          max-width: 280px;
          margin-top: 8px;
        }

        .ic-quick-btn {
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius);
          padding: 8px 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: var(--text-secondary);
          text-align: left;
          cursor: pointer;
          transition: all var(--transition);
        }

        .ic-quick-btn:hover {
          border-color: var(--rose-gold);
          color: var(--text-primary);
          background: var(--rose-gold-light);
        }

        .ic-message {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .ic-message.user { flex-direction: row-reverse; }

        .ic-msg-avatar {
          width: 22px;
          height: 22px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .ic-msg-avatar.user {
          background: var(--bg-dark);
          color: var(--rose-gold-pale);
        }

        .ic-msg-avatar.assistant {
          background: var(--rose-gold-light);
          color: var(--rose-gold-dark);
        }

        .ic-msg-body {
          max-width: 85%;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .ic-message.user .ic-msg-body { align-items: flex-end; }

        .ic-msg-bubble {
          border-radius: var(--radius);
          padding: 9px 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 300;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .ic-msg-bubble.user {
          background: #2C1810;
          color: #E8C4A8;
          border: 0.5px solid #3d2a1e;
        }

        .ic-msg-bubble.assistant {
          background: var(--bg-card);
          border: 0.5px solid var(--border-light);
          color: var(--text-primary);
        }

        .ic-loading {
          display: flex !important;
          flex-direction: row !important;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 12px;
        }

        .ic-msg-time {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          font-weight: 400;
          color: var(--text-hint);
        }

        .ic-input-area {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 10px 14px;
          border-top: 0.5px solid var(--border-light);
          background: var(--bg-card);
          flex-shrink: 0;
        }

        .ic-input {
          flex: 1;
          background: var(--bg-secondary);
          border: 0.5px solid var(--border-light);
          border-radius: var(--radius);
          padding: 9px 12px;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 300;
          resize: none;
          outline: none;
          transition: border-color var(--transition);
          line-height: 1.4;
        }

        .ic-input:focus { border-color: var(--rose-gold); }
        .ic-input::placeholder { color: var(--text-hint); }

        .ic-send-btn {
          width: 34px;
          height: 34px;
          background: var(--rose-gold);
          border-radius: var(--radius);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--bg-primary);
          cursor: pointer;
          flex-shrink: 0;
          transition: all var(--transition);
        }

        .ic-send-btn:hover:not(:disabled) {
          background: var(--rose-gold-dark);
          transform: translateY(-1px);
        }

        .ic-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default IntelligenceChat;
