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
  campaigns,
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
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: '⚠️ Unable to connect to the Intelligence Engine. Please check your API configuration.',
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

  const avgRoas =
    campaigns.length > 0
      ? campaigns.reduce((s, c) => s + c.roas, 0) / campaigns.length
      : 0;

  return (
    <div className={`chat-container ${compact ? 'chat-compact' : ''}`}>
      {/* Header */}
      <div className="chat-header">
        <div className="flex items-center gap-2">
          <div className="chat-ai-avatar">
            <Sparkles size={14} />
          </div>
          <div>
            <div className="chat-title">Intelligence Engine</div>
            <div className="chat-subtitle">
              Context: {brand.name} · AOV €{brand.aov_min}–{brand.aov_max} · ROAS {avgRoas.toFixed(2)}x
            </div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm">
          <Plus size={14} />
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty animate-fade-in">
            <div className="chat-empty-icon">
              <MessageSquare size={24} />
            </div>
            <p className="chat-empty-title">Ask the Intelligence Engine</p>
            <p className="chat-empty-sub">
              I have full context of your brand, campaigns, and 9-year benchmark data
            </p>
            <div className="quick-questions">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="quick-q-btn"
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
            className={`chat-message ${msg.role === 'user' ? 'user' : 'assistant'} animate-fade-in`}
          >
            <div className="msg-avatar">
              {msg.role === 'user' ? <User size={12} /> : <Sparkles size={12} />}
            </div>
            <div className="msg-bubble">
              <p className="msg-content">{msg.content}</p>
              <span className="msg-time">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant animate-fade-in">
            <div className="msg-avatar">
              <Sparkles size={12} />
            </div>
            <div className="msg-bubble msg-loading">
              <Loader size={14} className="animate-spin" />
              <span>Analyzing your account data...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Ask about your campaigns, ROAS, audiences..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <button
          className="chat-send-btn"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Send size={14} />
        </button>
      </div>

      <style>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          height: 100%;
          min-height: 500px;
        }

        .chat-compact {
          min-height: 400px;
        }

        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--surface-2);
          flex-shrink: 0;
        }

        .chat-ai-avatar {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, var(--accent), #818CF8);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .chat-title {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .chat-subtitle {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          margin-top: 1px;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chat-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 32px 16px;
          gap: 8px;
          flex: 1;
        }

        .chat-empty-icon {
          width: 48px;
          height: 48px;
          background: var(--accent-dim);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          margin-bottom: 8px;
        }

        .chat-empty-title {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .chat-empty-sub {
          font-size: 12px;
          color: var(--text-secondary);
          max-width: 240px;
          line-height: 1.5;
        }

        .quick-questions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
          max-width: 280px;
          margin-top: 8px;
        }

        .quick-q-btn {
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 8px 12px;
          font-size: 12px;
          color: var(--text-secondary);
          text-align: left;
          cursor: pointer;
          transition: all var(--transition);
          font-family: var(--font-body);
        }

        .quick-q-btn:hover {
          border-color: var(--accent);
          color: var(--text-primary);
          background: var(--accent-dim);
        }

        .chat-message {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .chat-message.user {
          flex-direction: row-reverse;
        }

        .msg-avatar {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 12px;
        }

        .chat-message.user .msg-avatar {
          background: var(--accent-dim);
          color: var(--accent);
        }

        .chat-message.assistant .msg-avatar {
          background: linear-gradient(135deg, var(--accent), #818CF8);
          color: white;
        }

        .msg-bubble {
          max-width: 85%;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .chat-message.user .msg-bubble {
          align-items: flex-end;
        }

        .msg-content {
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 12px;
          font-size: 13px;
          color: var(--text-primary);
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .chat-message.user .msg-content {
          background: var(--accent-dim);
          border-color: rgba(99,102,241,0.3);
          color: var(--text-primary);
        }

        .msg-loading {
          display: flex !important;
          flex-direction: row !important;
          align-items: center;
          gap: 8px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 12px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .msg-time {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-muted);
        }

        .chat-input-area {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid var(--border);
          background: var(--surface-2);
          flex-shrink: 0;
        }

        .chat-input {
          flex: 1;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 12px;
          color: var(--text-primary);
          font-size: 13px;
          resize: none;
          outline: none;
          transition: border-color var(--transition);
          line-height: 1.4;
          font-family: var(--font-body);
        }

        .chat-input:focus {
          border-color: var(--accent);
        }

        .chat-input::placeholder {
          color: var(--text-muted);
        }

        .chat-send-btn {
          width: 36px;
          height: 36px;
          background: var(--accent);
          border-radius: var(--radius);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          flex-shrink: 0;
          transition: all var(--transition);
        }

        .chat-send-btn:hover:not(:disabled) {
          background: #5254CC;
          transform: translateY(-1px);
          box-shadow: var(--shadow-accent);
        }

        .chat-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default IntelligenceChat;
