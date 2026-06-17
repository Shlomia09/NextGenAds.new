import React, { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Image as ImageIcon, Video, Sparkles, CheckCircle,
  Copy, Edit3, ChevronDown, Loader2, AlertTriangle, X, RefreshCw,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { getBrands } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Brand } from '../types';

// ── Types ───────────────────────────────────────────────────────
interface CopyVariant {
  hook_type: 'problem' | 'result' | 'social_proof';
  hook_label: string;
  primary: string;
  body: string;
  cta: string;
}

interface AnalysisResult {
  creative_analysis: string;
  creative_type: string;
  variants: CopyVariant[];
  benchmark_recommendation: string;
  benchmark_reason: string;
}

type ConversionType = 'leads' | 'ecommerce' | 'bookings';

const CONVERSION_OPTIONS: { value: ConversionType; label: string; emoji: string }[] = [
  { value: 'leads',     label: 'Lead Generation',   emoji: '📋' },
  { value: 'ecommerce', label: 'eCommerce Purchase', emoji: '🛍️' },
  { value: 'bookings',  label: 'Direct Booking',     emoji: '📅' },
];

const HOOK_COLORS = {
  problem:      { bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.2)', badge: '#f87171' },
  result:       { bg: 'rgba(74,222,128,0.06)',  border: 'rgba(74,222,128,0.2)',  badge: '#4ade80' },
  social_proof: { bg: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.2)',badge: '#a78bfa' },
};

// ── Helpers ─────────────────────────────────────────────────────
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const extractVideoThumbnail = (file: File): Promise<{ base64: string; dataUrl: string }> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url   = URL.createObjectURL(file);
    video.src   = url;
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      video.currentTime = 1;
    };
    video.onseeked = () => {
      const canvas  = document.createElement('canvas');
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64  = dataUrl.split(',')[1];
      URL.revokeObjectURL(url);
      resolve({ base64, dataUrl });
    };
    video.onerror = reject;
  });

// ── Copy Variant Card ────────────────────────────────────────────
const VariantCard: React.FC<{
  variant: CopyVariant;
  isRecommended: boolean;
  index: number;
}> = ({ variant, isRecommended, index }) => {
  const [copied, setCopied]     = useState<string | null>(null);
  const [editing, setEditing]   = useState(false);
  const [primary, setPrimary]   = useState(variant.primary);
  const [body, setBody]         = useState(variant.body);
  const [cta, setCta]           = useState(variant.cta);
  const colors = HOOK_COLORS[variant.hook_type] || HOOK_COLORS.result;
  const label  = ['A', 'B', 'C'][index] ?? String(index + 1);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 1800);
  };

  const copyAll = () => {
    const full = `Primary: ${primary}\n\nBody: ${body}\n\nCTA: ${cta}`;
    copyToClipboard(full, 'all');
  };

  return (
    <div style={{
      background: colors.bg,
      border: `0.5px solid ${isRecommended ? 'rgba(196,131,106,0.4)' : colors.border}`,
      borderRadius: 10,
      padding: '16px 18px',
      position: 'relative',
      boxShadow: isRecommended ? '0 0 0 1px rgba(196,131,106,0.15)' : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
            color: 'var(--text-primary)',
          }}>
            Variant {label}
          </span>
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: 8,
            background: colors.badge + '20', color: colors.badge,
            borderRadius: 3, padding: '2px 7px',
            border: `0.5px solid ${colors.badge}40`,
          }}>
            {variant.hook_label}
          </span>
          {isRecommended && (
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 8,
              background: 'rgba(196,131,106,0.15)', color: 'var(--rose-gold)',
              borderRadius: 3, padding: '2px 7px',
              border: '0.5px solid rgba(196,131,106,0.3)',
            }}>
              ★ Recommended
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setEditing(e => !e)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 5,
              background: 'rgba(255,255,255,0.05)', border: '0.5px solid var(--app-border)',
              fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Edit3 size={9} />
            {editing ? 'Done' : 'Edit'}
          </button>
          <button
            onClick={copyAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 5,
              background: copied === 'all' ? 'rgba(74,222,128,0.1)' : 'rgba(196,131,106,0.1)',
              border: `0.5px solid ${copied === 'all' ? 'rgba(74,222,128,0.3)' : 'rgba(196,131,106,0.25)'}`,
              fontFamily: 'var(--font-sans)', fontSize: 9,
              color: copied === 'all' ? '#4ade80' : 'var(--rose-gold)',
              cursor: 'pointer',
            }}
          >
            {copied === 'all' ? <CheckCircle size={9} /> : <Copy size={9} />}
            {copied === 'all' ? 'Copied!' : 'Copy all'}
          </button>
        </div>
      </div>

      {/* Copy fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { key: 'primary', label: 'Primary Text', value: primary, set: setPrimary, max: 125 },
          { key: 'body',    label: 'Body Text',    value: body,    set: setBody,    max: 300 },
          { key: 'cta',     label: 'CTA',          value: cta,     set: setCta,     max: 25  },
        ].map(({ key, label: fLabel, value, set, max }) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {fLabel}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: value.length > max ? '#f87171' : 'var(--text-hint)' }}>
                  {value.length}/{max}
                </span>
                <button
                  onClick={() => copyToClipboard(value, key)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: copied === key ? '#4ade80' : 'var(--text-hint)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {copied === key ? <CheckCircle size={9} /> : <Copy size={9} />}
                </button>
              </div>
            </div>
            {editing ? (
              key === 'body' ? (
                <textarea
                  value={value}
                  onChange={e => set(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.04)', border: '0.5px solid var(--app-border)',
                    borderRadius: 6, padding: '8px 10px',
                    fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-primary)',
                    lineHeight: 1.6, outline: 'none', resize: 'vertical',
                  }}
                />
              ) : (
                <input
                  value={value}
                  onChange={e => set(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.04)', border: '0.5px solid var(--app-border)',
                    borderRadius: 6, padding: '7px 10px',
                    fontFamily: key === 'cta' ? 'var(--font-sans)' : 'var(--font-sans)',
                    fontSize: key === 'cta' ? 11 : 12,
                    color: 'var(--text-primary)', outline: 'none',
                  }}
                />
              )
            ) : (
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: key === 'cta' ? 11 : 12,
                color: key === 'cta' ? 'var(--rose-gold)' : 'var(--text-secondary)',
                lineHeight: 1.6,
                fontWeight: key === 'cta' ? 500 : 400,
              }}>
                {value}{key === 'cta' && ' →'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────
const CreativeStudio: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef      = useRef<HTMLDivElement>(null);

  const [file, setFile]               = useState<File | null>(null);
  const [preview, setPreview]         = useState<string>('');
  const [isVideo, setIsVideo]         = useState(false);
  const [conversionType, setConvType] = useState<ConversionType>('leads');
  const [brandId, setBrandId]         = useState<string>('');
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<AnalysisResult | null>(null);
  const [error, setError]             = useState('');
  const [dragging, setDragging]       = useState(false);

  const { data: brands = [] } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn: () => getBrands(user!.id),
    enabled: !!user?.id,
  });

  const selectedBrand = brands.find((b: Brand) => b.id === brandId);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setError('');
    const vid = f.type.startsWith('video/');
    setIsVideo(vid);
    if (vid) {
      try {
        const { dataUrl } = await extractVideoThumbnail(f);
        setPreview(dataUrl);
      } catch {
        setPreview('');
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type.startsWith('image/') || f.type.startsWith('video/'))) {
      handleFile(f);
    }
  }, [handleFile]);

  const analyze = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Convert to base64
      let base64: string;
      let mediaType: string;

      if (isVideo) {
        const { base64: thumb } = await extractVideoThumbnail(file);
        base64    = thumb;
        mediaType = 'image/jpeg';
      } else {
        base64    = await fileToBase64(file);
        mediaType = file.type.startsWith('image/') ? file.type : 'image/jpeg';
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/analyze-creative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          image_base64: base64,
          media_type: mediaType,
          conversion_type: conversionType,
          brand: selectedBrand || null,
          is_video_thumbnail: isVideo,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze creative');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview('');
    setResult(null);
    setError('');
    setIsVideo(false);
  };

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', maxWidth: 900, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Sparkles size={16} style={{ color: 'var(--rose-gold)' }} />
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
            Creative Studio
          </h1>
        </div>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
          Upload your creative. AI analyzes it and writes high-converting copy based on 9 years of beauty ad data.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '340px 1fr' : '1fr', gap: 24, alignItems: 'start' }}>

        {/* Left: Upload + config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Upload area */}
          <div
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => !file && fileInputRef.current?.click()}
            style={{
              background: dragging ? 'rgba(196,131,106,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px dashed ${dragging ? 'rgba(196,131,106,0.5)' : file ? 'rgba(196,131,106,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 12,
              cursor: file ? 'default' : 'pointer',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              minHeight: 200,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Creative preview"
                  style={{ width: '100%', display: 'block', borderRadius: 11, objectFit: 'contain', maxHeight: 280 }}
                />
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  display: 'flex', gap: 6,
                }}>
                  {isVideo && (
                    <div style={{
                      background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '3px 8px',
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontFamily: 'var(--font-sans)', fontSize: 9, color: '#a78bfa',
                    }}>
                      <Video size={9} /> Video
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); reset(); }}
                    style={{
                      background: 'rgba(0,0,0,0.7)', border: 'none',
                      borderRadius: 4, width: 24, height: 24,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'white',
                    }}
                  >
                    <X size={11} />
                  </button>
                </div>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  padding: '20px 12px 10px',
                  fontFamily: 'var(--font-sans)', fontSize: 10, color: 'rgba(255,255,255,0.8)',
                }}>
                  {file?.name}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 14, color: 'var(--text-hint)' }}>
                  <ImageIcon size={24} />
                  <Video size={24} />
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Drop your creative here
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-hint)' }}>
                  JPG, PNG, WebP, MP4 — up to 50MB
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {/* Config */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Conversion type */}
            <div>
              <label style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                Conversion Goal
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={conversionType}
                  onChange={e => setConvType(e.target.value as ConversionType)}
                  style={{
                    width: '100%', appearance: 'none',
                    background: 'rgba(255,255,255,0.04)', border: '0.5px solid var(--app-border)',
                    borderRadius: 8, padding: '9px 32px 9px 12px',
                    fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-primary)',
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  {CONVERSION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.emoji} {o.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-hint)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Brand */}
            {brands.length > 0 && (
              <div>
                <label style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                  Brand
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={brandId}
                    onChange={e => setBrandId(e.target.value)}
                    style={{
                      width: '100%', appearance: 'none',
                      background: 'rgba(255,255,255,0.04)', border: '0.5px solid var(--app-border)',
                      borderRadius: 8, padding: '9px 32px 9px 12px',
                      fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-primary)',
                      cursor: 'pointer', outline: 'none',
                    }}
                  >
                    <option value="">No brand selected</option>
                    {brands.map((b: Brand) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-hint)', pointerEvents: 'none' }} />
                </div>
              </div>
            )}
          </div>

          {/* Analyze button */}
          <button
            onClick={analyze}
            disabled={!file || loading}
            style={{
              background: !file ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, var(--rose-gold) 0%, #a0554a 100%)',
              border: !file ? '0.5px solid var(--app-border)' : 'none',
              borderRadius: 10, padding: '13px 20px',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
              color: !file ? 'var(--text-hint)' : 'white',
              cursor: !file || loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Analyzing creative…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Analyze Creative & Generate Copy
              </>
            )}
          </button>

          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.06)', border: '0.5px solid rgba(248,113,113,0.2)',
              borderRadius: 8, padding: '10px 14px',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <AlertTriangle size={13} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#f87171' }}>{error}</span>
            </div>
          )}
        </div>

        {/* Right: Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Creative analysis */}
            <div style={{
              background: 'rgba(196,131,106,0.04)', border: '0.5px solid rgba(196,131,106,0.15)',
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={11} style={{ color: 'var(--rose-gold)' }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--rose-gold)', fontWeight: 500 }}>
                  Creative Analysis
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {result.creative_analysis}
              </div>
            </div>

            {/* Benchmark insight */}
            <div style={{
              background: 'rgba(167,139,250,0.05)', border: '0.5px solid rgba(167,139,250,0.2)',
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(167,139,250,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 10 }}>📊</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#a78bfa', fontWeight: 500, marginBottom: 3 }}>
                  Benchmark Insight
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {result.benchmark_reason}
                </div>
              </div>
            </div>

            {/* Copy variants */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>
                  Copy Variants
                </span>
                <button
                  onClick={analyze}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 5,
                    background: 'transparent', border: '0.5px solid var(--app-border)',
                    fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={9} />
                  Regenerate
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {result.variants.map((v, i) => (
                  <VariantCard
                    key={i}
                    variant={v}
                    isRecommended={v.hook_type === result.benchmark_recommendation}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreativeStudio;
