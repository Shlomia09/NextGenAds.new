import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Sparkles, BarChart3, Plug, Tag, Settings,
  TrendingUp, TrendingDown, DollarSign, Users, AlertTriangle,
  CheckCircle, Info, Zap, ChevronRight, X, Send, Loader
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/* ── Mock data ── */
const MOCK_BRAND = {
  name: 'NeoLumo Spain',
  category: 'Skincare',
  aov_min: 120,
  aov_max: 180,
  currency: 'EUR',
  markets: ['ES', 'IT'],
  stage: 'scaling',
  bracket: 'AOV €80–150',
  funnel: 'Hybrid 70% Conversions + 30% Traffic → Retargeting → Klaviyo',
};

const MOCK_CAMPAIGNS = [
  { name: 'Prospecting — Broad Women 25-44', status: 'ACTIVE',   objective: 'CONVERSIONS', spend: 2840, roas: 4.2,  impressions: 184200, purchases: 87,  revenue: 11928 },
  { name: 'Retargeting — 7-Day Visitors',   status: 'ACTIVE',   objective: 'CONVERSIONS', spend: 860,  roas: 6.1,  impressions: 42100,  purchases: 31,  revenue: 5246  },
  { name: 'ATC — Non-Purchasers 14d',       status: 'ACTIVE',   objective: 'CONVERSIONS', spend: 420,  roas: 5.5,  impressions: 28400,  purchases: 18,  revenue: 2310  },
  { name: 'LLA 1-3% Customer List',         status: 'ACTIVE',   objective: 'CONVERSIONS', spend: 1100, roas: 3.8,  impressions: 96400,  purchases: 42,  revenue: 4180  },
  { name: 'Traffic — Blog Content',         status: 'PAUSED',   objective: 'TRAFFIC',     spend: 240,  roas: 0,    impressions: 62000,  purchases: 0,   revenue: 0     },
  { name: 'Testing — UGC Creative v3',      status: 'ACTIVE',   objective: 'CONVERSIONS', spend: 150,  roas: 2.1,  impressions: 12800,  purchases: 6,   revenue: 315   },
];

const MOCK_BENCHMARKS = [
  { label: 'ROAS',           your: 4.2,   bench: 3.2,  unit: 'x',  better: true },
  { label: 'CAC',            your: 32.6,  bench: 45,   unit: '€',  better: false },
  { label: 'CPM',            your: 15.4,  bench: 18.2, unit: '€',  better: false },
  { label: 'CTR',            your: 2.14,  bench: 1.8,  unit: '%',  better: true  },
  { label: 'Purchase Rate',  your: 0.047, bench: 0.038, unit: '%', better: true  },
];

const MOCK_RECS = [
  {
    priority: 'critical',
    type: 'Budget',
    title: 'Scale Retargeting budget immediately',
    desc: 'Your 7-Day Retargeting campaign is at 6.1x ROAS — 90% above benchmark. ROAS has been stable for 8 days. Budget scaling rule triggered.',
    benchmark: 'Brands at 6x+ ROAS for 7+ days → +20% budget per 7 days',
    action: 'Increase daily budget from €86 to €103 (+20%)',
  },
  {
    priority: 'high',
    type: 'Creative',
    title: 'Pause UGC v3 — below break-even',
    desc: 'Testing — UGC Creative v3 has been at 2.1x ROAS for 6 days with €150 spend. Your break-even ROAS for this AOV bracket is 2.4x.',
    benchmark: 'New creative → test €10/day minimum 5 days. If below break-even at day 5, pause.',
    action: 'Pause this ad set and test a new angle: Before/After or Ingredient Story',
  },
  {
    priority: 'medium',
    type: 'Audience',
    title: 'Add Interest Stack: Skincare + Anti-aging',
    desc: 'Your Prospecting campaign uses broad targeting only. Adding a stacked interest audience can improve cold traffic quality by 15-25%.',
    benchmark: 'Skincare + Natural Beauty + Anti-aging outperforms generic Beauty interests in ES market',
    action: 'Duplicate Prospecting ad set → add interest stack: Skincare, Natural Beauty, Anti-aging',
  },
];

const ROAS_TREND = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  roas: parseFloat((3.2 + Math.sin(i * 0.7) * 0.8 + i * 0.08).toFixed(2)),
  bench: 3.2,
}));

const DEMO_CHAT_RESPONSES: Record<string, string> = {
  default: `Based on your NeoLumo campaign data vs the 9-year Beauty & Cosmetics benchmark:

**Your account is performing ABOVE average** for the €120–180 AOV bracket.

Key observations:
• ROAS 4.2x vs benchmark 3.2x → beating by 31%
• CAC €32.60 vs benchmark €45 → 28% more efficient
• Your Retargeting campaign at 6.1x is exceptional — scale it now

The weak point: UGC Creative v3 at 2.1x is below your break-even (2.4x). Pause and test Before/After creative format instead — it converts 2.3x better than UGC in the ES skincare market per benchmark data.`,
};

/* ── Components ── */
const DemoBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const cfg: Record<string, { cls: string; icon: React.ReactNode }> = {
    critical: { cls: 'badge-critical', icon: <AlertTriangle size={9} /> },
    high:     { cls: 'badge-high',     icon: <Zap size={9} /> },
    medium:   { cls: 'badge-medium',   icon: <Info size={9} /> },
  };
  const { cls, icon } = cfg[priority] || cfg.medium;
  return <span className={`badge ${cls}`}>{icon}{priority}</span>;
};

const DemoNavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean }> = ({ icon, label, active }) => (
  <div className={`demo-nav-item ${active ? 'active' : ''}`} style={{ opacity: active ? 1 : 0.5 }}>
    {icon}
    <span>{label}</span>
  </div>
);

const DemoDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const totalSpend   = MOCK_CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = MOCK_CAMPAIGNS.reduce((s, c) => s + c.revenue, 0);
  const totalPurch   = MOCK_CAMPAIGNS.reduce((s, c) => s + c.purchases, 0);
  const avgRoas      = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setChatMessages(prev => [...prev, { role: 'assistant', content: DEMO_CHAT_RESPONSES.default }]);
    setChatLoading(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* ── Sidebar ── */}
      <aside style={{ width: 220, background: '#2C1810', borderRight: '0.5px solid #3d2a1e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '22px 20px 16px', borderBottom: '0.5px solid #3d2a1e' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: '#F5E6D8', letterSpacing: '0.04em' }}>
            Next<span style={{ fontStyle: 'italic', color: '#C4836A' }}>Gen</span>Ads
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7A5A48', marginTop: 4 }}>
            Campaign Intelligence
          </div>
        </div>

        {/* Demo pill */}
        <div style={{ margin: '10px 12px', background: 'rgba(196,131,106,0.1)', border: '0.5px solid rgba(196,131,106,0.3)', borderRadius: 3, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
          <div className="live-dot" />
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 300, color: '#C4A090' }}>Demo Mode</span>
        </div>

        <nav style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <DemoNavItem icon={<LayoutDashboard size={14} strokeWidth={1.5} />} label="Dashboard" active />
          <DemoNavItem icon={<Sparkles size={14} strokeWidth={1.5} />} label="Intelligence" />
          <DemoNavItem icon={<BarChart3 size={14} strokeWidth={1.5} />} label="Campaigns" />
          <DemoNavItem icon={<Tag size={14} strokeWidth={1.5} />} label="Brands" />
          <DemoNavItem icon={<Plug size={14} strokeWidth={1.5} />} label="Connect" />
          <DemoNavItem icon={<Settings size={14} strokeWidth={1.5} />} label="Settings" />
        </nav>

        <div style={{ padding: '14px 12px', borderTop: '0.5px solid #3d2a1e' }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 9, fontWeight: 300, color: '#8B6050', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="live-dot" style={{ background: '#C4836A' }} />
            9-Year Benchmark Active
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Demo banner */}
        <div style={{ background: '#2C1810', borderBottom: '0.5px solid #3d2a1e', padding: '9px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={12} strokeWidth={1.5} style={{ color: '#C4836A' }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 300, color: '#C4A090', letterSpacing: '0.04em' }}>
              Demo Mode — NeoLumo Spain · Mock data · No auth required
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>
              Create Real Account
              <ChevronRight size={11} strokeWidth={1.5} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ color: '#7A5A48' }}>
              <X size={11} strokeWidth={1.5} />
              Exit Demo
            </button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="section-eyebrow">
                <div className="live-dot" />
                Live Intelligence
              </div>
              <h1 className="section-title">
                {MOCK_BRAND.name} <em>Dashboard</em>
              </h1>
              <p className="page-subtitle">
                AOV {MOCK_BRAND.currency}{MOCK_BRAND.aov_min}–{MOCK_BRAND.aov_max} ·{' '}
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--rose-gold)' }}>{MOCK_BRAND.bracket}</span> ·{' '}
                {MOCK_BRAND.funnel}
              </p>
            </div>

            {/* KPI strip */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { icon: <DollarSign size={10} strokeWidth={1.5} />, label: 'Spend',     value: `€${totalSpend.toLocaleString()}` },
                { icon: <TrendingUp size={10} strokeWidth={1.5} />, label: 'Revenue',   value: `€${totalRevenue.toLocaleString()}` },
                { icon: <Users size={10} strokeWidth={1.5} />,      label: 'Purchases', value: String(totalPurch) },
                { icon: <BarChart3 size={10} strokeWidth={1.5} />,  label: 'ROAS',      value: `${avgRoas.toFixed(2)}x`, hl: true },
              ].map(({ icon, label, value, hl }) => (
                <div key={label} style={{ background: hl ? 'var(--rose-gold-light)' : 'var(--bg-card)', border: `0.5px solid ${hl ? 'var(--border-rose)' : 'var(--border-light)'}`, borderRadius: 4, padding: '10px 14px' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 400, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    {icon}{label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500, color: hl ? 'var(--success)' : 'var(--text-primary)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 3-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>

            {/* ── Col 1: Benchmarks ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="section-eyebrow" style={{ marginBottom: 0 }}>
                  <BarChart3 size={10} strokeWidth={1.5} />
                  Benchmark Intelligence
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)', background: 'var(--bg-secondary)', border: '0.5px solid var(--border-light)', borderRadius: 2, padding: '4px 8px' }}>
                847 Beauty brands · AOV €80–150 · 2015–2024
              </div>
              {MOCK_BENCHMARKS.map(({ label, your, bench, unit, better }) => {
                const diff = ((your - bench) / bench * 100);
                const beating = better ? your >= bench : your <= bench;
                const statusColor = beating ? 'var(--success)' : 'var(--danger)';
                const fmtVal = (v: number) => unit === 'x' ? `${v.toFixed(2)}x` : unit === '%' ? `${v.toFixed(2)}%` : `€${v.toFixed(2)}`;
                return (
                  <div key={label} style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-light)', borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 400, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="live-dot" style={{ background: 'var(--rose-gold)' }} />
                      {label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, color: statusColor, lineHeight: 1 }}>
                      {fmtVal(your)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', borderRadius: 2, padding: '5px 8px' }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 300, color: 'var(--text-muted)' }}>Benchmark</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{fmtVal(bench)}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: statusColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {beating
                        ? <><TrendingUp size={10} strokeWidth={1.5} />+{Math.abs(diff).toFixed(1)}% above</>
                        : <><TrendingDown size={10} strokeWidth={1.5} />{Math.abs(diff).toFixed(1)}% below</>}
                    </div>
                  </div>
                );
              })}

              {/* Mini chart */}
              <div className="card" style={{ padding: 16 }}>
                <div className="section-eyebrow" style={{ marginBottom: 12, fontSize: 9 }}>
                  <TrendingUp size={10} strokeWidth={1.5} />
                  ROAS Trend — 14 Days
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={ROAS_TREND}>
                    <defs>
                      <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C4836A" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#C4836A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fontSize: 8, fill: 'var(--text-hint)', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 8, fill: 'var(--text-hint)', fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={24} domain={[0, 6]} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-light)', borderRadius: 4, fontSize: 10, fontFamily: 'DM Mono' }} />
                    <Area type="monotone" dataKey="roas"  stroke="#C4836A" fill="url(#dg)" strokeWidth={1.5} name="Your ROAS" />
                    <Area type="monotone" dataKey="bench" stroke="var(--text-hint)" fill="none" strokeDasharray="3 3" strokeWidth={1} name="Benchmark" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Col 2: AI Recommendations ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="section-eyebrow" style={{ marginBottom: 0 }}>
                  <AlertTriangle size={10} strokeWidth={1.5} />
                  AI Recommendations
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <span className="badge badge-critical">1</span>
                  <span className="badge badge-high">1</span>
                  <span className="badge badge-medium">1</span>
                </div>
              </div>

              {MOCK_RECS.map((rec, i) => {
                const borderColor = rec.priority === 'critical' ? 'var(--danger)' : rec.priority === 'high' ? 'var(--warning)' : 'var(--rose-gold)';
                return (
                  <div key={i} style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-light)', borderLeft: `2.5px solid ${borderColor}`, borderRadius: 6, padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <DemoBadge priority={rec.priority} />
                      <span className="badge badge-neutral">{rec.type}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{rec.title}</div>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{rec.desc}</p>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--rose-gold)', background: 'var(--rose-gold-light)', padding: '3px 8px', display: 'inline-block' }}>
                      {rec.benchmark}
                    </div>
                    <div style={{ paddingTop: 6, borderTop: '0.5px solid var(--border-light)', display: 'flex', gap: 6 }}>
                      <button className="btn btn-success btn-sm"><CheckCircle size={11} strokeWidth={1.5} />Execute</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-hint)', marginLeft: 'auto' }}>Dismiss</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Col 3: Intelligence Chat ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="section-eyebrow" style={{ marginBottom: 0 }}>
                  <Sparkles size={10} strokeWidth={1.5} />
                  Intelligence Chat
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Demo</span>
              </div>

              <div style={{ background: 'var(--bg-primary)', border: '0.5px solid var(--border-light)', borderRadius: 6, display: 'flex', flexDirection: 'column', minHeight: 520 }}>
                {/* Chat header */}
                <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border-light)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '6px 6px 0 0' }}>
                  <div style={{ width: 28, height: 28, background: '#2C1810', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C4836A' }}>
                    <Sparkles size={12} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, color: 'var(--text-primary)' }}>Intelligence Engine</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', marginTop: 1 }}>
                      NeoLumo · €150 AOV avg · <span style={{ fontFamily: 'var(--font-mono)' }}>4.20x</span> ROAS
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {chatMessages.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', gap: 10, padding: 20 }}>
                      <div style={{ width: 44, height: 44, background: 'var(--rose-gold-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rose-gold)' }}>
                        <Sparkles size={18} strokeWidth={1.5} />
                      </div>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: 'var(--text-primary)' }}>Ask the Intelligence Engine</p>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: 'var(--text-secondary)', maxWidth: 220, lineHeight: 1.5 }}>Full context of NeoLumo + 9 years of benchmark data</p>
                      {[
                        'Why is my ROAS dropping?',
                        'Should I scale Retargeting?',
                        'What audience to test next?',
                      ].map(q => (
                        <button key={q} onClick={() => { setChatInput(q); setTimeout(() => sendChat(), 0); }}
                          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-light)', borderRadius: 4, padding: '7px 12px', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: 'var(--text-secondary)', cursor: 'pointer', width: '100%', maxWidth: 240, textAlign: 'left', transition: 'all var(--transition)' }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--rose-gold)'; (e.target as HTMLElement).style.background = 'var(--rose-gold-light)'; }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-light)'; (e.target as HTMLElement).style.background = 'var(--bg-card)'; }}
                        >{q}</button>
                      ))}
                    </div>
                  )}

                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: msg.role === 'user' ? '#2C1810' : 'var(--rose-gold-light)', color: msg.role === 'user' ? '#E8C4A8' : 'var(--rose-gold-dark)' }}>
                        {msg.role === 'user' ? <Users size={10} strokeWidth={1.5} /> : <Sparkles size={10} strokeWidth={1.5} />}
                      </div>
                      <div style={{ maxWidth: '82%', background: msg.role === 'user' ? '#2C1810' : 'var(--bg-card)', border: `0.5px solid ${msg.role === 'user' ? '#3d2a1e' : 'var(--border-light)'}`, borderRadius: 4, padding: '9px 12px', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, lineHeight: 1.6, color: msg.role === 'user' ? '#E8C4A8' : 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 3, background: 'var(--rose-gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rose-gold-dark)' }}>
                        <Sparkles size={10} strokeWidth={1.5} />
                      </div>
                      <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-light)', borderRadius: 4, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-muted)' }}>
                        <Loader size={11} strokeWidth={1.5} className="animate-spin" />
                        Analysing benchmark data…
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div style={{ padding: '10px 14px', borderTop: '0.5px solid var(--border-light)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 8, borderRadius: '0 0 6px 6px' }}>
                  <input
                    style={{ flex: 1, background: 'var(--bg-secondary)', border: '0.5px solid var(--border-light)', borderRadius: 4, padding: '8px 12px', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--text-primary)', outline: 'none' }}
                    placeholder="Ask about campaigns, ROAS, audiences…"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                  />
                  <button
                    onClick={sendChat}
                    disabled={!chatInput.trim() || chatLoading}
                    style={{ width: 32, height: 32, background: 'var(--rose-gold)', border: 'none', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-primary)', cursor: 'pointer', flexShrink: 0, transition: 'background var(--transition)', opacity: (!chatInput.trim() || chatLoading) ? 0.4 : 1 }}
                  >
                    <Send size={12} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Campaigns table */}
          <div style={{ marginTop: 24 }}>
            <div className="section-eyebrow" style={{ marginBottom: 14 }}>
              <BarChart3 size={10} strokeWidth={1.5} />
              All Campaigns
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Campaign</th><th>Status</th><th>Spend</th><th>ROAS</th><th>Impressions</th><th>Purchases</th><th>Revenue</th></tr>
                </thead>
                <tbody>
                  {MOCK_CAMPAIGNS.map((c, i) => {
                    const roasColor = c.roas >= 3 ? 'var(--success)' : c.roas >= 1.5 ? 'var(--warning)' : 'var(--danger)';
                    return (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: 400 }}>{c.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)', marginTop: 1, letterSpacing: '0.06em' }}>{c.objective}</div>
                        </td>
                        <td><span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-high'}`}>{c.status}</span></td>
                        <td className="numeric">€{c.spend.toLocaleString()}</td>
                        <td className="numeric" style={{ color: roasColor }}>{c.roas > 0 ? `${c.roas}x` : '—'}</td>
                        <td className="numeric">{c.impressions.toLocaleString()}</td>
                        <td className="numeric">{c.purchases > 0 ? c.purchases : '—'}</td>
                        <td className="numeric" style={{ color: 'var(--success)' }}>{c.revenue > 0 ? `€${c.revenue.toLocaleString()}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .demo-nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 12px;
          border-radius: 2px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 300;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #7A5A48;
          transition: all var(--transition);
          border-left: 2px solid transparent;
          cursor: pointer;
        }

        .demo-nav-item.active {
          color: #C4A090;
          border-left-color: #C4836A;
          background: rgba(196, 131, 106, 0.08);
          opacity: 1 !important;
        }

        .demo-nav-item:hover { color: #C4A090; background: rgba(196,131,106,0.06); }
      `}</style>
    </div>
  );
};

export default DemoDashboard;
