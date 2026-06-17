import { useMemo } from 'react';
import PlatformSelector from './PlatformSelector';
import { COUNTRY_OPTIONS } from '../../types/campaign';
import type { CampaignDraft } from '../../types/campaign';

interface Props {
  brandId: string;
  draft: CampaignDraft;
  onUpdate: (updates: Partial<CampaignDraft>) => void;
  onPreview: () => void;
}

// ── Shared style helpers ─────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-hint)',
  marginBottom: 2,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid var(--app-border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const hintStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  color: 'var(--text-hint)',
  marginTop: 2,
};

const warningStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  color: '#d97706',
  marginTop: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const dividerStyle: React.CSSProperties = {
  height: '0.5px',
  background: 'rgba(255,255,255,0.06)',
  margin: '4px 0',
};

// ── Tomorrow default ─────────────────────────────────────────────

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// ── Component ────────────────────────────────────────────────────

export default function CampaignSetup({ brandId, draft, onUpdate, onPreview }: Props) {
  const budget = draft.daily_budget_cents != null ? draft.daily_budget_cents / 100 : 50;
  const startDate = draft.start_time ? draft.start_time.split('T')[0] : getTomorrow();
  const endDate = draft.end_time ? draft.end_time.split('T')[0] : '';
  const noEndDate = !draft.end_time;
  const countries: string[] = draft.target_countries ?? ['IT'];
  const ageMin = draft.age_min ?? 18;
  const ageMax = draft.age_max ?? 65;
  const gender = draft.gender ?? 'all';

  const isBelowThreshold = budget < 30;
  const canPublish =
    !!draft.platform &&
    !!draft.campaign_name?.trim() &&
    !!draft.destination_url?.trim();

  // Toggle a country chip
  const toggleCountry = (code: string) => {
    const next = countries.includes(code)
      ? countries.filter(c => c !== code)
      : [...countries, code];
    onUpdate({ target_countries: next.length > 0 ? next : [code] });
  };

  // Gender buttons
  const genderOptions: { value: CampaignDraft['gender']; label: string }[] = [
    { value: 'all',    label: 'All' },
    { value: 'female', label: 'Women' },
    { value: 'male',   label: 'Men' },
  ];

  const toggleButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 6,
    border: active ? '1px solid var(--rose-gold)' : '0.5px solid var(--app-border)',
    background: active ? 'rgba(196,131,106,0.1)' : 'rgba(255,255,255,0.03)',
    color: active ? 'var(--rose-gold)' : 'var(--text-secondary)',
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    borderRadius: 20,
    border: active ? '1px solid var(--rose-gold)' : '0.5px solid var(--app-border)',
    background: active ? 'rgba(196,131,106,0.1)' : 'rgba(255,255,255,0.03)',
    color: active ? 'var(--rose-gold)' : 'var(--text-secondary)',
    fontFamily: 'var(--font-sans)',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  });

  // Unused variable warning suppressor — we compute this for render only
  const selectedAccountId = useMemo(() => draft.ad_account_id ?? '', [draft.ad_account_id]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      fontFamily: 'var(--font-sans)',
    }}>

      {/* ── 1. Platform ── */}
      <div style={sectionStyle}>
        <p style={eyebrowStyle}>Platform</p>
        <PlatformSelector
          brandId={brandId}
          selected={draft.platform ?? null}
          selectedAccountId={selectedAccountId}
          onSelect={(platform, accountId) =>
            onUpdate({ platform, ad_account_id: accountId })
          }
        />
      </div>

      <div style={dividerStyle} />

      {/* ── 2. Campaign Name ── */}
      <div style={sectionStyle}>
        <p style={eyebrowStyle}>Campaign Name</p>
        <input
          style={inputStyle}
          type="text"
          required
          value={draft.campaign_name ?? ''}
          onChange={e => onUpdate({ campaign_name: e.target.value })}
          placeholder="Brand — Leads — Jun 2026"
        />
      </div>

      <div style={dividerStyle} />

      {/* ── 3. Budget ── */}
      <div style={sectionStyle}>
        <p style={eyebrowStyle}>Daily Budget</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, color: 'var(--text-hint)' }}>€</span>
          <input
            style={{ ...inputStyle, width: 100 }}
            type="number"
            min={10}
            value={budget}
            onChange={e => {
              const val = Math.max(10, Number(e.target.value));
              onUpdate({ daily_budget_cents: Math.round(val * 100) });
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>/ day</span>
        </div>
        <p style={hintStyle}>Beauty lead gen: min €30/day for consistent results</p>
        {isBelowThreshold && (
          <p style={warningStyle}>
            <span>⚠️</span> Below effective threshold
          </p>
        )}
      </div>

      <div style={dividerStyle} />

      {/* ── 4. Schedule ── */}
      <div style={sectionStyle}>
        <p style={eyebrowStyle}>Schedule</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>Start date</span>
            <input
              style={{ ...inputStyle, width: 160 }}
              type="date"
              value={startDate}
              onChange={e =>
                onUpdate({ start_time: e.target.value ? `${e.target.value}T00:00:00Z` : undefined })
              }
            />
          </div>
          {!noEndDate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>End date</span>
              <input
                style={{ ...inputStyle, width: 160 }}
                type="date"
                value={endDate}
                min={startDate}
                onChange={e =>
                  onUpdate({ end_time: e.target.value ? `${e.target.value}T23:59:59Z` : undefined })
                }
              />
            </div>
          )}
        </div>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginTop: 4,
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={noEndDate}
            onChange={e =>
              onUpdate({ end_time: e.target.checked ? undefined : `${getTomorrow()}T23:59:59Z` })
            }
            style={{ accentColor: 'var(--rose-gold)' }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No end date</span>
        </label>
      </div>

      <div style={dividerStyle} />

      {/* ── 5. Destination URL ── */}
      <div style={sectionStyle}>
        <p style={eyebrowStyle}>Destination URL</p>
        <input
          style={inputStyle}
          type="url"
          required
          value={draft.destination_url ?? ''}
          onChange={e => onUpdate({ destination_url: e.target.value })}
          placeholder="https://yourbrand.com/book"
        />
      </div>

      <div style={dividerStyle} />

      {/* ── 6. Audience ── */}
      <div style={sectionStyle}>
        <p style={eyebrowStyle}>Audience</p>

        {/* Countries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>Countries</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {COUNTRY_OPTIONS.map(opt => (
              <button
                key={opt.code}
                onClick={() => toggleCountry(opt.code)}
                style={chipStyle(countries.includes(opt.code))}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>

        {/* Age range */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>
            Age {ageMin} – {ageMax}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              style={{ ...inputStyle, width: 70 }}
              type="number"
              min={18}
              max={ageMax}
              value={ageMin}
              onChange={e => {
                const val = Math.min(Math.max(18, Number(e.target.value)), ageMax);
                onUpdate({ age_min: val });
              }}
            />
            <span style={{ color: 'var(--text-hint)', fontSize: 13 }}>–</span>
            <input
              style={{ ...inputStyle, width: 70 }}
              type="number"
              min={ageMin}
              max={65}
              value={ageMax}
              onChange={e => {
                const val = Math.min(Math.max(ageMin, Number(e.target.value)), 65);
                onUpdate({ age_max: val });
              }}
            />
          </div>
        </div>

        {/* Gender */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>Gender</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {genderOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => onUpdate({ gender: opt.value })}
                style={toggleButtonStyle(gender === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={dividerStyle} />

      {/* ── 7. Preview & Publish ── */}
      <button
        disabled={!canPublish}
        onClick={onPreview}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 10,
          border: 'none',
          background: canPublish
            ? 'linear-gradient(135deg, var(--rose-gold), #a0554a)'
            : 'rgba(255,255,255,0.07)',
          color: canPublish ? '#fff' : 'var(--text-muted)',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 700,
          cursor: canPublish ? 'pointer' : 'not-allowed',
          letterSpacing: '0.02em',
          transition: 'opacity 0.15s',
          opacity: canPublish ? 1 : 0.5,
        }}
      >
        Preview &amp; Publish →
      </button>
    </div>
  );
}
