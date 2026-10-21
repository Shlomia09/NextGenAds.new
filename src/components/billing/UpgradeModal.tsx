import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, Tag, MessageSquare, Sparkles } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'execute' | 'more_brands' | 'unlimited_chat' | 'white_label';
  currentPlanId: string;
  requiredPlanId: string;
}

const featureCopy = {
  execute: {
    title: 'Campaign Execution requires Growth',
    description: 'Human-approved campaign execution via Meta API is available on Growth and above.',
    icon: Zap,
  },
  more_brands: {
    title: 'Add more brands with Growth',
    description: 'You have reached your brand limit on your current plan.',
    icon: Tag,
  },
  unlimited_chat: {
    title: 'You have reached your monthly chat limit',
    description: 'Upgrade to Growth for unlimited Intelligence Chat queries.',
    icon: MessageSquare,
  },
  white_label: {
    title: 'White-label reports require Scale',
    description: 'PDF white-label reports are available on the Scale plan.',
    icon: Sparkles,
  },
};

const planMeta: Record<string, { name: string; price: number }> = {
  free:    { name: 'Free',    price: 0 },
  starter: { name: 'Starter', price: 149 },
  growth:  { name: 'Growth',  price: 349 },
  scale:   { name: 'Scale',   price: 749 },
};

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  feature,
  currentPlanId,
  requiredPlanId,
}) => {
  const navigate = useNavigate();

  const copy = featureCopy[feature];
  const Icon = copy.icon;
  const currentPlan = planMeta[currentPlanId] ?? { name: currentPlanId, price: 0 };
  const requiredPlan = planMeta[requiredPlanId] ?? { name: requiredPlanId, price: 0 };

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <>
      <style>{`
        @keyframes upgrade-modal-fade-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .upgrade-modal-card {
          animation: upgrade-modal-fade-in 0.25s ease;
        }
      `}</style>

      {/* Overlay */}
      <div
        onClick={handleOverlayClick}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* Modal Card */}
        <div
          className="upgrade-modal-card"
          style={{
            background: 'var(--surface)',
            border: '0.5px solid var(--border)',
            borderRadius: '8px',
            padding: '28px',
            maxWidth: '440px',
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '4px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          {/* Feature Icon */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--accent-soft)',
              border: '0.5px solid var(--accent-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Icon size={22} color="var(--accent)" />
          </div>

          {/* Title */}
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              color: 'var(--text)',
              margin: '0 0 8px 0',
              fontWeight: 800,
              lineHeight: 1.3,
              paddingRight: '24px',
            }}
          >
            {copy.title}
          </h2>

          {/* Description */}
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 300,
              fontSize: '12px',
              color: 'var(--text-2)',
              lineHeight: 1.6,
              margin: '0 0 24px 0',
            }}
          >
            {copy.description}
          </p>

          {/* Price Comparison Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            {/* Current Plan */}
            <div
              style={{
                background: 'var(--bg-sidebar)',
                border: '0.5px solid var(--border)',
                borderRadius: '6px',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-3)',
                  marginBottom: '4px',
                }}
              >
                Current Plan
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '12px',
                  color: 'var(--text-2)',
                  marginBottom: '4px',
                }}
              >
                {currentPlan.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '20px',
                  color: 'var(--text-2)',
                  fontWeight: 400,
                }}
              >
                {currentPlan.price === 0 ? '€0' : `€${currentPlan.price}`}
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '10px',
                    color: 'var(--text-3)',
                    marginLeft: '2px',
                  }}
                >
                  /mo
                </span>
              </div>
            </div>

            {/* Required Plan */}
            <div
              style={{
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent-soft)',
                borderRadius: '6px',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text)',
                  marginBottom: '4px',
                }}
              >
                Upgrade to
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--text)',
                  marginBottom: '4px',
                }}
              >
                {requiredPlan.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '20px',
                  color: 'var(--text)',
                  fontWeight: 400,
                }}
              >
                {requiredPlan.price === 0 ? '€0' : `€${requiredPlan.price}`}
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '10px',
                    color: 'var(--text-3)',
                    marginLeft: '2px',
                  }}
                >
                  /mo
                </span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Primary CTA */}
            <button
              onClick={handleUpgrade}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 16px',
                fontFamily: 'var(--font-ui)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.15s ease, transform 0.1s ease',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Upgrade to {requiredPlan.name} — €{requiredPlan.price}/mo
            </button>

            {/* Secondary: Maybe later */}
            <button
              onClick={onClose}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-ui)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '8px',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpgradeModal;
