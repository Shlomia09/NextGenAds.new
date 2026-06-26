/**
 * CampaignWorkshop.tsx — Multi-step Campaign Builder (§46–55)
 * Layout: 1fr form + 380px sticky preview (§56)
 * Stepper: 5 steps, one at a time, clickable when done (§52)
 * Platforms: real connection status from DB (§53)
 * Data: 100% real — brands + adAccounts from Supabase (§41-45)
 * NO fake numbers — EST. REACH/CPL shown as "—" unless real API provides them
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wand2, CheckCircle2, ArrowLeft, ArrowRight, Rocket, CloudUpload, Sparkles, Info, CheckCheck, Globe, Brain, X, Search, Save, Edit3, Copy, Trash2 } from 'lucide-react';
import { getAdAccounts, getCampaigns, getBrands, saveDraft, getDrafts, publishDraft, deleteDraft, supabase } from '../lib/supabase';
import type { CampaignDraftRow } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useBrand } from '../contexts/BrandContext';

// ─── Types ─────────────────────────────────────────────────────
interface FormState {
  // Step 1 — Creative
  creativeFile:    File | null;
  creativeUrl:     string; // object URL for preview
  headline:        string; // Meta
  primaryText:     string; // Meta
  googleHeadlines: [string, string, string]; // Google: 3 headlines
  googleDescs:     [string, string];          // Google: 2 descriptions
  keywords:        string;                    // Google
  ctaText:         string;
  // Step 2 — Goal & Platform
  goal:       string;
  brandId:    string;
  platform:   'meta' | 'google';
  // Step 3 — Budget & Schedule
  campaignName: string;
  dailyBudget:  string;
  startDate:    string;
  // Step 4 — Audience
  countries:    string[];
  ageMin:       string;
  ageMax:       string;
  gender:       'all' | 'women' | 'men';
  interests:    string[];
  destinationUrl: string;
}

const GOALS = [
  { value: 'leads',     label: 'Lead generation' },
  { value: 'traffic',   label: 'Traffic' },
  { value: 'sales',     label: 'Conversions / Sales' },
  { value: 'awareness', label: 'Awareness' },
];

// ─── Flag emoji helper (ISO 3166-1 alpha-2 → emoji flag) ───────────
const flag = (countryCode: string): string => {
  const base = 0x1F1E6;
  return [...countryCode.toUpperCase()].map(c => String.fromCodePoint(base + c.charCodeAt(0) - 65)).join('');
};

// ─── Unified location data: Countries + Regions/States ──────────
interface GeoLoc {
  code: string;         // 'US', 'US-CA', 'GB-ENG'
  name: string;         // 'California', 'Italy'
  type: 'country' | 'region';
  parentCode?: string;  // 'US' for US-CA
  parentName?: string;  // 'United States'
  regionGroup: string;  // 'americas', 'europe', etc.
  flagCode: string;     // ISO country code for flag emoji
}

const ALL_COUNTRIES: GeoLoc[] = [
  // Europe
  { code:'AT', name:'Austria',        type:'country', regionGroup:'europe',   flagCode:'AT' },
  { code:'BE', name:'Belgium',         type:'country', regionGroup:'europe',   flagCode:'BE' },
  { code:'BG', name:'Bulgaria',        type:'country', regionGroup:'europe',   flagCode:'BG' },
  { code:'HR', name:'Croatia',         type:'country', regionGroup:'europe',   flagCode:'HR' },
  { code:'CY', name:'Cyprus',          type:'country', regionGroup:'europe',   flagCode:'CY' },
  { code:'CZ', name:'Czech Republic',  type:'country', regionGroup:'europe',   flagCode:'CZ' },
  { code:'DK', name:'Denmark',         type:'country', regionGroup:'europe',   flagCode:'DK' },
  { code:'EE', name:'Estonia',         type:'country', regionGroup:'europe',   flagCode:'EE' },
  { code:'FI', name:'Finland',         type:'country', regionGroup:'europe',   flagCode:'FI' },
  { code:'FR', name:'France',          type:'country', regionGroup:'europe',   flagCode:'FR' },
  { code:'DE', name:'Germany',         type:'country', regionGroup:'europe',   flagCode:'DE' },
  { code:'GR', name:'Greece',          type:'country', regionGroup:'europe',   flagCode:'GR' },
  { code:'HU', name:'Hungary',         type:'country', regionGroup:'europe',   flagCode:'HU' },
  { code:'IE', name:'Ireland',         type:'country', regionGroup:'europe',   flagCode:'IE' },
  { code:'IT', name:'Italy',           type:'country', regionGroup:'europe',   flagCode:'IT' },
  { code:'LV', name:'Latvia',          type:'country', regionGroup:'europe',   flagCode:'LV' },
  { code:'LT', name:'Lithuania',       type:'country', regionGroup:'europe',   flagCode:'LT' },
  { code:'LU', name:'Luxembourg',      type:'country', regionGroup:'europe',   flagCode:'LU' },
  { code:'MT', name:'Malta',           type:'country', regionGroup:'europe',   flagCode:'MT' },
  { code:'NL', name:'Netherlands',     type:'country', regionGroup:'europe',   flagCode:'NL' },
  { code:'NO', name:'Norway',          type:'country', regionGroup:'europe',   flagCode:'NO' },
  { code:'PL', name:'Poland',          type:'country', regionGroup:'europe',   flagCode:'PL' },
  { code:'PT', name:'Portugal',        type:'country', regionGroup:'europe',   flagCode:'PT' },
  { code:'RO', name:'Romania',         type:'country', regionGroup:'europe',   flagCode:'RO' },
  { code:'SK', name:'Slovakia',        type:'country', regionGroup:'europe',   flagCode:'SK' },
  { code:'SI', name:'Slovenia',        type:'country', regionGroup:'europe',   flagCode:'SI' },
  { code:'ES', name:'Spain',           type:'country', regionGroup:'europe',   flagCode:'ES' },
  { code:'SE', name:'Sweden',          type:'country', regionGroup:'europe',   flagCode:'SE' },
  { code:'CH', name:'Switzerland',     type:'country', regionGroup:'europe',   flagCode:'CH' },
  { code:'GB', name:'United Kingdom',  type:'country', regionGroup:'europe',   flagCode:'GB' },
  // Americas
  { code:'AR', name:'Argentina',       type:'country', regionGroup:'americas', flagCode:'AR' },
  { code:'BR', name:'Brazil',          type:'country', regionGroup:'americas', flagCode:'BR' },
  { code:'CA', name:'Canada',          type:'country', regionGroup:'americas', flagCode:'CA' },
  { code:'CL', name:'Chile',           type:'country', regionGroup:'americas', flagCode:'CL' },
  { code:'CO', name:'Colombia',        type:'country', regionGroup:'americas', flagCode:'CO' },
  { code:'MX', name:'Mexico',          type:'country', regionGroup:'americas', flagCode:'MX' },
  { code:'US', name:'United States',   type:'country', regionGroup:'americas', flagCode:'US' },
  // Asia Pacific
  { code:'AU', name:'Australia',       type:'country', regionGroup:'apac',     flagCode:'AU' },
  { code:'IN', name:'India',           type:'country', regionGroup:'apac',     flagCode:'IN' },
  { code:'ID', name:'Indonesia',       type:'country', regionGroup:'apac',     flagCode:'ID' },
  { code:'JP', name:'Japan',           type:'country', regionGroup:'apac',     flagCode:'JP' },
  { code:'KR', name:'South Korea',     type:'country', regionGroup:'apac',     flagCode:'KR' },
  { code:'MY', name:'Malaysia',        type:'country', regionGroup:'apac',     flagCode:'MY' },
  { code:'NZ', name:'New Zealand',     type:'country', regionGroup:'apac',     flagCode:'NZ' },
  { code:'PH', name:'Philippines',     type:'country', regionGroup:'apac',     flagCode:'PH' },
  { code:'SG', name:'Singapore',       type:'country', regionGroup:'apac',     flagCode:'SG' },
  { code:'TH', name:'Thailand',        type:'country', regionGroup:'apac',     flagCode:'TH' },
  // MENA
  { code:'AE', name:'UAE',             type:'country', regionGroup:'mena',     flagCode:'AE' },
  { code:'SA', name:'Saudi Arabia',    type:'country', regionGroup:'mena',     flagCode:'SA' },
  { code:'EG', name:'Egypt',           type:'country', regionGroup:'mena',     flagCode:'EG' },
  { code:'IL', name:'Israel',          type:'country', regionGroup:'mena',     flagCode:'IL' },
  { code:'ZA', name:'South Africa',    type:'country', regionGroup:'mena',     flagCode:'ZA' },
  { code:'MA', name:'Morocco',         type:'country', regionGroup:'mena',     flagCode:'MA' },
];

// Regions/States — appear in search results
const ALL_REGIONS: GeoLoc[] = [
  // USA — 50 states
  { code:'US-AL', name:'Alabama',        type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-AK', name:'Alaska',         type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-AZ', name:'Arizona',        type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-AR', name:'Arkansas',       type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-CA', name:'California',     type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-CO', name:'Colorado',       type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-CT', name:'Connecticut',    type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-DE', name:'Delaware',       type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-FL', name:'Florida',        type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-GA', name:'Georgia',        type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-HI', name:'Hawaii',         type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-ID', name:'Idaho',          type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-IL', name:'Illinois',       type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-IN', name:'Indiana',        type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-IA', name:'Iowa',           type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-KS', name:'Kansas',         type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-KY', name:'Kentucky',       type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-LA', name:'Louisiana',      type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-ME', name:'Maine',          type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-MD', name:'Maryland',       type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-MA', name:'Massachusetts',  type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-MI', name:'Michigan',       type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-MN', name:'Minnesota',      type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-MS', name:'Mississippi',    type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-MO', name:'Missouri',       type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-MT', name:'Montana',        type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-NE', name:'Nebraska',       type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-NV', name:'Nevada',         type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-NH', name:'New Hampshire',  type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-NJ', name:'New Jersey',     type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-NM', name:'New Mexico',     type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-NY', name:'New York',       type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-NC', name:'North Carolina', type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-ND', name:'North Dakota',   type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-OH', name:'Ohio',           type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-OK', name:'Oklahoma',       type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-OR', name:'Oregon',         type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-PA', name:'Pennsylvania',   type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-RI', name:'Rhode Island',   type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-SC', name:'South Carolina', type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-SD', name:'South Dakota',   type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-TN', name:'Tennessee',      type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-TX', name:'Texas',          type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-UT', name:'Utah',           type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-VT', name:'Vermont',        type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-VA', name:'Virginia',       type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-WA', name:'Washington',     type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-WV', name:'West Virginia',  type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-WI', name:'Wisconsin',      type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-WY', name:'Wyoming',        type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  { code:'US-DC', name:'Washington D.C.',type:'region', parentCode:'US', parentName:'United States', regionGroup:'americas', flagCode:'US' },
  // UK regions
  { code:'GB-ENG', name:'England',         type:'region', parentCode:'GB', parentName:'United Kingdom', regionGroup:'europe', flagCode:'GB' },
  { code:'GB-SCT', name:'Scotland',         type:'region', parentCode:'GB', parentName:'United Kingdom', regionGroup:'europe', flagCode:'GB' },
  { code:'GB-WLS', name:'Wales',            type:'region', parentCode:'GB', parentName:'United Kingdom', regionGroup:'europe', flagCode:'GB' },
  { code:'GB-NIR', name:'Northern Ireland', type:'region', parentCode:'GB', parentName:'United Kingdom', regionGroup:'europe', flagCode:'GB' },
  { code:'GB-LND', name:'London',           type:'region', parentCode:'GB', parentName:'United Kingdom', regionGroup:'europe', flagCode:'GB' },
  { code:'GB-MCR', name:'Manchester',       type:'region', parentCode:'GB', parentName:'United Kingdom', regionGroup:'europe', flagCode:'GB' },
  { code:'GB-BHM', name:'Birmingham',       type:'region', parentCode:'GB', parentName:'United Kingdom', regionGroup:'europe', flagCode:'GB' },
  // Germany (Bundesländer)
  { code:'DE-BY',  name:'Bavaria',                  type:'region', parentCode:'DE', parentName:'Germany', regionGroup:'europe', flagCode:'DE' },
  { code:'DE-BE',  name:'Berlin',                   type:'region', parentCode:'DE', parentName:'Germany', regionGroup:'europe', flagCode:'DE' },
  { code:'DE-HH',  name:'Hamburg',                  type:'region', parentCode:'DE', parentName:'Germany', regionGroup:'europe', flagCode:'DE' },
  { code:'DE-NW',  name:'North Rhine-Westphalia',   type:'region', parentCode:'DE', parentName:'Germany', regionGroup:'europe', flagCode:'DE' },
  { code:'DE-BW',  name:'Baden-Württemberg',       type:'region', parentCode:'DE', parentName:'Germany', regionGroup:'europe', flagCode:'DE' },
  { code:'DE-HE',  name:'Hesse',                    type:'region', parentCode:'DE', parentName:'Germany', regionGroup:'europe', flagCode:'DE' },
  { code:'DE-NI',  name:'Lower Saxony',             type:'region', parentCode:'DE', parentName:'Germany', regionGroup:'europe', flagCode:'DE' },
  { code:'DE-SN',  name:'Saxony',                   type:'region', parentCode:'DE', parentName:'Germany', regionGroup:'europe', flagCode:'DE' },
  // Italy (Regioni)
  { code:'IT-LOM', name:'Lombardy',      type:'region', parentCode:'IT', parentName:'Italy', regionGroup:'europe', flagCode:'IT' },
  { code:'IT-LAZ', name:'Lazio (Rome)',  type:'region', parentCode:'IT', parentName:'Italy', regionGroup:'europe', flagCode:'IT' },
  { code:'IT-CAM', name:'Campania',      type:'region', parentCode:'IT', parentName:'Italy', regionGroup:'europe', flagCode:'IT' },
  { code:'IT-TOS', name:'Tuscany',       type:'region', parentCode:'IT', parentName:'Italy', regionGroup:'europe', flagCode:'IT' },
  { code:'IT-VEN', name:'Veneto',        type:'region', parentCode:'IT', parentName:'Italy', regionGroup:'europe', flagCode:'IT' },
  { code:'IT-SIC', name:'Sicily',        type:'region', parentCode:'IT', parentName:'Italy', regionGroup:'europe', flagCode:'IT' },
  { code:'IT-PIE', name:'Piedmont',      type:'region', parentCode:'IT', parentName:'Italy', regionGroup:'europe', flagCode:'IT' },
  { code:'IT-EMR', name:'Emilia-Romagna',type:'region', parentCode:'IT', parentName:'Italy', regionGroup:'europe', flagCode:'IT' },
  { code:'IT-APU', name:'Apulia',        type:'region', parentCode:'IT', parentName:'Italy', regionGroup:'europe', flagCode:'IT' },
  // France (Régions)
  { code:'FR-IDF', name:'Île-de-France',                  type:'region', parentCode:'FR', parentName:'France', regionGroup:'europe', flagCode:'FR' },
  { code:'FR-PAC', name:'Provence-Alpes-Côte d\'Azur', type:'region', parentCode:'FR', parentName:'France', regionGroup:'europe', flagCode:'FR' },
  { code:'FR-ARA', name:'Auvergne-Rhône-Alpes',        type:'region', parentCode:'FR', parentName:'France', regionGroup:'europe', flagCode:'FR' },
  { code:'FR-OCC', name:'Occitanie',                      type:'region', parentCode:'FR', parentName:'France', regionGroup:'europe', flagCode:'FR' },
  { code:'FR-NAQ', name:'Nouvelle-Aquitaine',             type:'region', parentCode:'FR', parentName:'France', regionGroup:'europe', flagCode:'FR' },
  { code:'FR-NOR', name:'Normandy',                       type:'region', parentCode:'FR', parentName:'France', regionGroup:'europe', flagCode:'FR' },
  // Spain (Comunidades Autónomas)
  { code:'ES-MAD', name:'Madrid',       type:'region', parentCode:'ES', parentName:'Spain', regionGroup:'europe', flagCode:'ES' },
  { code:'ES-CAT', name:'Catalonia',    type:'region', parentCode:'ES', parentName:'Spain', regionGroup:'europe', flagCode:'ES' },
  { code:'ES-AND', name:'Andalusia',    type:'region', parentCode:'ES', parentName:'Spain', regionGroup:'europe', flagCode:'ES' },
  { code:'ES-VAL', name:'Valencia',     type:'region', parentCode:'ES', parentName:'Spain', regionGroup:'europe', flagCode:'ES' },
  { code:'ES-EUS', name:'Basque Country',type:'region', parentCode:'ES', parentName:'Spain', regionGroup:'europe', flagCode:'ES' },
  // Netherlands
  { code:'NL-NH',  name:'North Holland', type:'region', parentCode:'NL', parentName:'Netherlands', regionGroup:'europe', flagCode:'NL' },
  { code:'NL-ZH',  name:'South Holland', type:'region', parentCode:'NL', parentName:'Netherlands', regionGroup:'europe', flagCode:'NL' },
  // Canada (Provinces)
  { code:'CA-ON',  name:'Ontario',         type:'region', parentCode:'CA', parentName:'Canada', regionGroup:'americas', flagCode:'CA' },
  { code:'CA-QC',  name:'Quebec',          type:'region', parentCode:'CA', parentName:'Canada', regionGroup:'americas', flagCode:'CA' },
  { code:'CA-BC',  name:'British Columbia',type:'region', parentCode:'CA', parentName:'Canada', regionGroup:'americas', flagCode:'CA' },
  { code:'CA-AB',  name:'Alberta',         type:'region', parentCode:'CA', parentName:'Canada', regionGroup:'americas', flagCode:'CA' },
  // Australia (States)
  { code:'AU-NSW', name:'New South Wales', type:'region', parentCode:'AU', parentName:'Australia', regionGroup:'apac', flagCode:'AU' },
  { code:'AU-VIC', name:'Victoria',        type:'region', parentCode:'AU', parentName:'Australia', regionGroup:'apac', flagCode:'AU' },
  { code:'AU-QLD', name:'Queensland',      type:'region', parentCode:'AU', parentName:'Australia', regionGroup:'apac', flagCode:'AU' },
  { code:'AU-WA',  name:'Western Australia',type:'region', parentCode:'AU', parentName:'Australia', regionGroup:'apac', flagCode:'AU' },
];

// Combined lookup (countries + regions/states)
const ALL_LOCS: GeoLoc[] = [...ALL_COUNTRIES, ...ALL_REGIONS];

// Region presets — like Meta's location targeting groups
const REGIONS = [
  { id: 'all_europe', emoji: '🌍', label: 'All Europe',   codes: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','NO','PL','PT','RO','SK','SI','ES','SE','CH','GB'] },
  { id: 'west_eu',    emoji: '',   label: 'Western EU',  codes: ['FR','DE','NL','BE','AT','CH','LU','IE','GB'] },
  { id: 'south_eu',   emoji: '',   label: 'Southern EU', codes: ['IT','ES','PT','GR','HR','MT','CY'] },
  { id: 'north_eu',   emoji: '',   label: 'Northern EU', codes: ['NO','SE','DK','FI','EE','LV','LT'] },
  { id: 'americas',   emoji: '🌎', label: 'Americas',    codes: ['US','CA','BR','MX','AR','CL','CO'] },
  { id: 'apac',       emoji: '🌏', label: 'Asia Pacific',codes: ['AU','JP','SG','KR','IN','NZ','MY','TH','PH','ID'] },
  { id: 'mena',       emoji: '🌍', label: 'MENA',         codes: ['AE','SA','EG','IL','ZA','MA'] },
];

// Interest categories for beauty/wellness targeting
const INTEREST_GROUPS = [
  { cat: 'Beauty', items: ['Beauty & Personal Care','Skincare','Luxury Beauty','Organic & Natural Beauty','Makeup & Cosmetics','Hair Care'] },
  { cat: 'Aesthetic & Wellness', items: ['Spa & Wellness Services','Aesthetic Medicine','Anti-aging Treatments','Body Treatments','Medical Aesthetics','Cosmetic Surgery'] },
  { cat: 'Health & Lifestyle', items: ['Health & Fitness','Weight Loss & Nutrition','Yoga & Mindfulness','Healthy Lifestyle','Diet & Wellness'] },
  { cat: 'Lifestyle', items: ["Women's Fashion",'Luxury & Lifestyle','Travel Enthusiasts','High-end Retail'] },
];

const today = new Date().toISOString().split('T')[0];
const thisMonth = new Date().toLocaleString('en', { month: 'long' });
const thisYear = new Date().getFullYear();

// ─── Shared UI atoms ────────────────────────────────────────────
const FL: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '0.5px', color: 'var(--text-2)', marginBottom: 7 }}>
    {children}
  </label>
);

const Field = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => (
    <input
      ref={ref}
      {...props}
      style={{
        width: '100%', background: 'var(--field, #13100F)',
        border: '1px solid var(--border)', borderRadius: 9,
        padding: '11px 13px', color: 'var(--text)',
        fontFamily: 'var(--font-ui)', fontSize: 13.5, outline: 'none',
        transition: 'border-color .15s, box-shadow .15s',
        ...props.style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
    />
  )
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    style={{
      width: '100%', background: 'var(--field, #13100F)',
      border: '1px solid var(--border)', borderRadius: 9,
      padding: '11px 13px', color: 'var(--text)',
      fontFamily: 'var(--font-ui)', fontSize: 13.5, outline: 'none',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%239A9089' stroke-width='2'%3E%3Cpath d='M3 5l4 4 4-4'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 13px center',
      transition: 'border-color .15s', ...props.style,
    }}
  />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    style={{
      width: '100%', background: 'var(--field, #13100F)',
      border: '1px solid var(--border)', borderRadius: 9,
      padding: '11px 13px', color: 'var(--text)',
      fontFamily: 'var(--font-ui)', fontSize: 13.5, outline: 'none',
      resize: 'vertical', transition: 'border-color .15s, box-shadow .15s',
      ...props.style,
    }}
    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)'; }}
    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
  />
);

const MB: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ marginBottom: 18, ...style }}>{children}</div>
);

const PNote: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({ children, icon }) => (
  <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px', marginTop: 16, fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.5, fontFamily: 'var(--font-ui)' }}>
    {icon ?? <Info size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />}
    <span>{children}</span>
  </div>
);

// ─── Step definitions ───────────────────────────────────────────
const STEPS = [
  { n: 1, label: 'Creative' },
  { n: 2, label: 'Goal & platform' },
  { n: 3, label: 'Budget & schedule' },
  { n: 4, label: 'Audience' },
  { n: 5, label: 'Review & publish' },
];
// ─── Main Component ─────────────────────────────────────────────
const CampaignWorkshop: React.FC = () => {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ── Brand context (global sidebar selection) ────────────────
  const { activeBrand: ctxActiveBrand } = useBrand();
  const queryClient = useQueryClient();

  // ── Draft tracking ──────────────────────────────────────────
  const [draftId,      setDraftId]      = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [savingDraft,  setSavingDraft]  = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const [step, setStep]         = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished]   = useState(false);
  const [stepKey, setStepKey]       = useState(0); // forces re-mount for animation
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiInsight, setAiInsight]   = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [activeGeoTab, setActiveGeoTab]   = useState<string>('europe');

  // ── Queries ──────────────────────────────────────────
  const { data: brands = [] } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn:  () => getBrands(user!.id),
    enabled:  !!user,
  });

  const { data: adAccounts = [] } = useQuery({
    queryKey: ['adAccounts', user?.id],
    queryFn:  () => getAdAccounts(user!.id),
    enabled:  !!user,
  });

  // ── Platform connection status (§53) — REAL from DB ─────────
  const metaConnected   = useMemo(() => (adAccounts as { platform: string }[]).some(a => a.platform === 'meta'), [adAccounts]);
  const googleConnected = useMemo(() => (adAccounts as { platform: string }[]).some(a => a.platform === 'google'), [adAccounts]);


  // ── Form state ─────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    creativeFile: null, creativeUrl: '',
    headline: '', primaryText: '',
    googleHeadlines: ['', '', ''], googleDescs: ['', ''],
    keywords: '', ctaText: 'Book now',
    goal: 'leads', brandId: '', platform: 'meta',
    campaignName: '', dailyBudget: '30', startDate: today,
    countries: [], ageMin: '25', ageMax: '55', gender: 'all', interests: [],
    destinationUrl: '',
  });

  const upd = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: val })), []);

  // Set default brand from BrandContext (sidebar selection) or first brand
  useEffect(() => {
    const defaultBrand = ctxActiveBrand ?? (brands.length > 0 ? brands[0] : null);
    if (defaultBrand && !form.brandId) {
      const markets = (defaultBrand.markets ?? []) as string[];
      upd('brandId', defaultBrand.id);
      upd('countries', markets.length ? markets : ['IT']);
      upd('destinationUrl', (defaultBrand as { website?: string }).website ?? '');
    }
  }, [brands, ctxActiveBrand]);

  // When activeBrand changes in sidebar, update form
  useEffect(() => {
    if (ctxActiveBrand && form.brandId && form.brandId !== ctxActiveBrand.id) {
      const markets = (ctxActiveBrand.markets ?? []) as string[];
      upd('brandId', ctxActiveBrand.id);
      upd('countries', markets.length ? markets : ['IT']);
      upd('destinationUrl', (ctxActiveBrand as { website?: string }).website ?? '');
    }
  }, [ctxActiveBrand?.id]);

  // Auto-generate campaign name
  useEffect(() => {
    if (!form.brandId || !form.goal || !form.platform) return;
    const brand = brands.find(b => b.id === form.brandId);
    if (!brand) return;
    const goalLabel = GOALS.find(g => g.value === form.goal)?.label.split('/')[0].trim() ?? form.goal;
    const name = `${brand.name} — ${goalLabel} — ${thisMonth} ${thisYear}`;
    upd('campaignName', name);
  }, [form.brandId, form.goal, form.platform, brands]);

  // When platform changes, default select Meta if connected
  useEffect(() => {
    if (!metaConnected && googleConnected) upd('platform', 'google');
    else if (metaConnected) upd('platform', 'meta');
  }, [metaConnected, googleConnected]);

  // ── Campaigns (for AI audience suggestion context) ─────────────
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', form.brandId],
    queryFn:  () => getCampaigns(form.brandId),
    enabled:  !!form.brandId,
  });

  // ── Workshop drafts (\"Your campaigns\" table) ────────────────────
  const { data: draftsList = [] } = useQuery({
    queryKey: ['drafts', form.brandId],
    queryFn:  () => getDrafts(form.brandId),
    enabled:  !!form.brandId,
  });

  // ── AI Audience Builder ──────────────────────────────────────
  const handleAISuggest = async () => {
    const activeBrand = brands.find(b => b.id === form.brandId);
    if (!activeBrand) return;
    setAiLoading(true);
    setAiInsight(null);
    try {
      const topCampaigns = [...campaigns]
        .filter(c => (c.leads ?? 0) > 0)
        .sort((a, b) => ((a.cpl ?? 999) - (b.cpl ?? 999)))
        .slice(0, 5);

      const systemPrompt = `You are an expert digital advertising strategist specializing in beauty and wellness, with 9 years of benchmark data. Respond ONLY with a valid JSON object — no markdown, no explanation outside the JSON.`;

      const userMsg = `Recommend optimal audience targeting for this campaign:

Brand: ${activeBrand.name}
Type: ${(activeBrand as { business_type?: string }).business_type ?? 'beauty'}
Markets: ${((activeBrand as { markets?: string[] }).markets ?? []).join(', ') || 'not set'}
Avg order value: €${(((activeBrand as { aov_min?: number; aov_max?: number }).aov_min ?? 0) + ((activeBrand as { aov_min?: number; aov_max?: number }).aov_max ?? 0)) / 2}

Campaign goal: ${GOALS.find(g => g.value === form.goal)?.label}
Platform: ${form.platform}
Daily budget: €${form.dailyBudget}

${topCampaigns.length ? `Past campaigns (best CPL):\n${topCampaigns.map(c => `- ${c.name}: ${c.leads} leads, CPL €${((c as { cpl?: number }).cpl ?? 0).toFixed(2)}, spend €${((c as { spend?: number }).spend ?? 0).toFixed(0)}`).join('\n')}` : 'No past campaign data yet.'}

Respond with ONLY this JSON (ISO 3166-1 alpha-2 country codes):
{
  "countries": ["IT", "ES"],
  "ageMin": 28,
  "ageMax": 52,
  "gender": "women",
  "interests": ["Beauty & Personal Care", "Skincare"],
  "reasoning": "2-3 sentences explaining this audience choice"
}`;

      const { data, error } = await supabase.functions.invoke('claude-chat', {
        body: { messages: [{ role: 'user', content: userMsg }], system: systemPrompt, brand_id: form.brandId },
      });

      if (error) throw new Error(error.message);
      const content: string = data?.content ?? data?.message ?? data?.response ?? JSON.stringify(data);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      const s = JSON.parse(jsonMatch[0]);

      if (Array.isArray(s.countries)) {
        const valid = s.countries.filter((c: string) => ALL_COUNTRIES.some(x => x.code === c));
        if (valid.length) upd('countries', valid);
      }
      if (s.ageMin) upd('ageMin', String(s.ageMin));
      if (s.ageMax) upd('ageMax', String(s.ageMax));
      if (s.gender && ['all', 'women', 'men'].includes(s.gender)) upd('gender', s.gender as 'all' | 'women' | 'men');
      if (Array.isArray(s.interests)) upd('interests', s.interests);
      if (s.reasoning) setAiInsight(s.reasoning);
    } catch (err) {
      console.error('AI audience error:', err);
      setAiInsight('Could not generate suggestion. Please set targeting manually.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Region helpers ───────────────────────────────────────────
  const applyRegion = (regionId: string) => {
    const region = REGIONS.find(r => r.id === regionId);
    if (!region) return;
    const already = region.codes.every(c => form.countries.includes(c));
    if (already) {
      upd('countries', form.countries.filter(c => !region.codes.includes(c)));
    } else {
      const merged = Array.from(new Set([...form.countries, ...region.codes]));
      upd('countries', merged);
    }
  };

  const toggleInterest = (interest: string) => {
    const has = form.interests.includes(interest);
    upd('interests', has ? form.interests.filter(i => i !== interest) : [...form.interests, interest]);
  };

  // ── Stepper navigation ───────────────────────────────────────
  const goTo = (n: number) => {
    if (n >= step) return; // only go to completed steps
    setStepKey(k => k + 1);
    setStep(n);
  };

  const goNext = () => {
    if (step < 5) { setStepKey(k => k + 1); setStep(s => s + 1); }
    else handlePublish();
  };

  const goBack = () => {
    if (step > 1) { setStepKey(k => k + 1); setStep(s => s - 1); }
  };

  // ── Creative upload ──────────────────────────────────────────
  const handleFileChange = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    upd('creativeFile', file);
    upd('creativeUrl', url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0] ?? null;
    handleFileChange(f);
  };

  // ── Save Draft ──────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!user?.id || !form.brandId) {
      showToast('Select a brand first', 'err');
      return;
    }
    setSavingDraft(true);
    try {
      // Serialize full form state (exclude File object — not serializable)
      const draftData: Record<string, unknown> = {
        ...form,
        creativeFile: null,   // File objects can't be JSON-serialized
        step,
      };
      const result = await saveDraft({
        draftId:      draftId ?? undefined,
        userId:       user.id,
        brandId:      form.brandId,
        platform:     form.platform,
        goal:         form.goal,
        campaignName: form.campaignName,
        draftData,
      });
      setDraftId(result.id);
      setDraftSavedAt(result.updated_at);
      showToast('Draft saved');
      // Refresh drafts list
      queryClient.invalidateQueries({ queryKey: ['drafts', form.brandId] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      showToast(msg, 'err');
    } finally {
      setSavingDraft(false);
    }
  };

  // ── Load draft into Wizard ────────────────────────────────
  const loadDraft = (draft: CampaignDraftRow) => {
    const raw = draft.draft_data;
    const savedStep = typeof raw.step === 'number' ? raw.step : 1;
    const d = raw as Partial<typeof form>;
    setForm(prev => ({ ...prev, ...d, creativeFile: null, creativeUrl: (d.creativeUrl ?? '') as string }));
    setDraftId(draft.id);
    setDraftSavedAt(draft.updated_at);
    setStep(savedStep);
    setStepKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  // ── Publish a draft directly from the table ─────────────────
  const handlePublishDraft = async (draft: CampaignDraftRow) => {
    if (!confirm(`Publish "${draft.campaign_name ?? 'this campaign'}"? This will submit it to your ad platform.`)) return;
    try {
      await publishDraft(draft.id);
      showToast('Campaign published!');
      queryClient.invalidateQueries({ queryKey: ['drafts', draft.brand_id] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Publish failed';
      showToast(msg, 'err');
    }
  };

  // ── Duplicate draft ──────────────────────────────────────
  const handleDuplicateDraft = async (draft: CampaignDraftRow) => {
    if (!user?.id) return;
    try {
      await saveDraft({
        userId:       user.id,
        brandId:      draft.brand_id,
        platform:     draft.platform,
        goal:         draft.goal ?? '',
        campaignName: `${draft.campaign_name ?? 'Campaign'} (copy)`,
        draftData:    { ...draft.draft_data, campaignName: `${draft.campaign_name ?? 'Campaign'} (copy)` },
      });
      showToast('Campaign duplicated');
      queryClient.invalidateQueries({ queryKey: ['drafts', draft.brand_id] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Duplicate failed';
      showToast(msg, 'err');
    }
  };

  // ── Delete draft ─────────────────────────────────────────
  const handleDeleteDraft = async (draft: CampaignDraftRow) => {
    if (!confirm(`Delete "${draft.campaign_name ?? 'this draft'}"? This cannot be undone.`)) return;
    try {
      await deleteDraft(draft.id);
      showToast('Draft deleted');
      queryClient.invalidateQueries({ queryKey: ['drafts', draft.brand_id] });
      if (draftId === draft.id) {
        setDraftId(null);
        setDraftSavedAt(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      showToast(msg, 'err');
    }
  };

  // ── Publish ──────────────────────────────────────────────────
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const account = (adAccounts as { id: string; platform: string }[])
        .find(a => a.platform === form.platform);

      await supabase.functions.invoke('publish-campaign', {
        body: {
          brand_id:       form.brandId,
          ad_account_id:  account?.id,
          platform:       form.platform,
          goal:           form.goal,
          campaign_name:  form.campaignName,
          daily_budget:   parseFloat(form.dailyBudget) || 0,
          start_date:     form.startDate,
          countries:      form.countries,
          age_min:        parseInt(form.ageMin),
          age_max:        parseInt(form.ageMax),
          gender:         form.gender,
          headline:       form.headline,
          primary_text:   form.primaryText,
          cta_text:       form.ctaText,
          destination_url: form.destinationUrl,
        },
      });
      // Mark draft as published (if we have one)
      if (draftId) {
        await publishDraft(draftId).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['drafts', form.brandId] });
      }
      setPublished(true);
    } catch (e) {
      console.error('Publish error:', e);
    } finally {
      setPublishing(false);
    }
  };


  // ── Derived review values ─────────────────────────────────────
  const activeBrand = brands.find(b => b.id === form.brandId);
  const selectedCountriesLabel = form.countries.length
    ? ALL_COUNTRIES.filter((c: { code: string }) => form.countries.includes(c.code)).map((c: { code: string }) => c.code).join(', ')
    : '—';

  // ── Published success state ───────────────────────────────────
  if (published) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 44px)', background: 'var(--bg)', padding: 40 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-soft)', border: '1px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={28} style={{ color: 'var(--green)' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, color: 'var(--text)', margin: '0 0 10px' }}>Campaign submitted!</h2>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-2)', margin: '0 0 24px', lineHeight: 1.6 }}>
            "{form.campaignName}" has been submitted to your {form.platform === 'meta' ? 'Meta Ads' : 'Google Ads'} account in paused state. Review it in Ads Manager before activating.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => navigate('/campaigns')} style={{ background: 'var(--accent)', color: 'var(--ink)', border: 'none', borderRadius: 10, padding: '11px 22px', fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
              View Campaigns
            </button>
            <button onClick={() => { setPublished(false); setStep(1); setStepKey(k => k + 1); }} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 10, padding: '11px 22px', fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
              New campaign
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 44px)', overflowY: 'auto', background: 'var(--bg)', padding: '22px 28px 50px' }}>

      {/* ══ Header ══════════════════════════════════════════════ */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 7 }}>
          <Wand2 size={20} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500, letterSpacing: -0.4, margin: 0, color: 'var(--text)' }}>
            Campaign Workshop
          </h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--text-3)' }}>
            {draftSavedAt
              ? <>Saved · <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></>
              : 'Draft'}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-2)' }}>
          Build your campaign step by step — AI writes the copy, you publish to your connected ad platform.
        </div>
      </div>

      {/* ══ Stepper ══════════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 20px', boxShadow: 'var(--shadow)', marginBottom: 22, gap: 0 }}>
        {STEPS.map((s, idx) => {
          const isDone   = s.n < step;
          const isActive = s.n === step;
          return (
            <React.Fragment key={s.n}>
              <div
                onClick={() => isDone && goTo(s.n)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: isDone ? 'pointer' : 'default' }}
              >
                {/* Number / checkmark */}
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-mono)', flexShrink: 0,
                  background: isDone ? 'var(--green-soft)' : isActive ? 'var(--accent)' : 'transparent',
                  color: isDone ? 'var(--green)' : isActive ? 'var(--ink)' : 'var(--text-3)',
                  border: isDone || isActive ? '1px solid transparent' : '1px solid var(--border)',
                  transition: 'all .2s',
                }}>
                  {isDone ? <CheckCheck size={13} style={{ color: 'var(--green)' }} /> : s.n}
                </div>
                {/* Label */}
                <div style={{
                  fontSize: 12.5, fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
                  color: isActive ? 'var(--text)' : isDone ? 'var(--text-2)' : 'var(--text-3)',
                  fontWeight: isActive ? 500 : 400,
                }}>
                  {s.label}
                </div>
              </div>
              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 14px', minWidth: 18 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ══ 2-Column Layout ══════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18, alignItems: 'start' }}>

        {/* ── FORM CARD ───────────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow)', padding: '26px 28px', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
          <div key={stepKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'wsfade .25s ease' }}>

            {/* ════ STEP 1 — CREATIVE ═══════════════════════════ */}
            {step === 1 && (
              <>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500, marginBottom: 4, color: 'var(--text)' }}>Creative</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 20 }}>
                  {form.platform === 'google'
                    ? 'Google Search ads are text-only. Write your headlines and descriptions.'
                    : 'Upload the image or video for your ad. AI will analyze it and write the copy.'}
                </div>

                {form.platform !== 'google' ? (
                  /* Meta: upload zone */
                  <>
                    <MB>
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={e => e.preventDefault()}
                        style={{
                          border: `1.5px dashed ${form.creativeUrl ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 13, background: 'var(--field)', minHeight: 160,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 9, color: 'var(--text-3)', cursor: 'pointer', transition: '.15s', overflow: 'hidden',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = form.creativeUrl ? 'var(--accent)' : 'var(--border)'; e.currentTarget.style.background = 'var(--field)'; }}
                      >
                        {form.creativeUrl ? (
                          <img src={form.creativeUrl} alt="creative" style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }} />
                        ) : (
                          <>
                            <CloudUpload size={32} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>Drop your creative here</div>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5 }}>PNG, JPG or MP4 · up to 50MB</div>
                          </>
                        )}
                      </div>
                    </MB>

                    <MB>
                      <FL>HEADLINE</FL>
                      <Field placeholder="e.g. Reveal your glow — non-invasive results in one session" value={form.headline} onChange={e => upd('headline', e.target.value)} maxLength={40} />
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginTop: 4, textAlign: 'right' }}>{form.headline.length}/40</div>
                    </MB>

                    <MB>
                      <FL>PRIMARY TEXT</FL>
                      <Textarea rows={3} placeholder="e.g. Book your free consultation this week. Limited slots at our clinic." value={form.primaryText} onChange={e => upd('primaryText', e.target.value)} maxLength={125} />
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginTop: 4, textAlign: 'right' }}>{form.primaryText.length}/125</div>
                    </MB>

                    <MB>
                      <FL>CTA BUTTON</FL>
                      <Select value={form.ctaText} onChange={e => upd('ctaText', e.target.value)}>
                        {['Book now', 'Learn more', 'Get offer', 'Sign up', 'Shop now', 'Contact us'].map(c => <option key={c}>{c}</option>)}
                      </Select>
                    </MB>

                    <button
                      onClick={() => {/* AI copy generation — calls claude-chat or analyze-creative */}}
                      style={{ width: '100%', background: 'var(--accent)', color: 'var(--ink)', border: 'none', fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500, padding: 13, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-deep)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
                    >
                      <Sparkles size={16} />
                      Analyze creative &amp; generate copy
                    </button>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--text-3)', marginTop: 7 }}>
                      AI reads your creative and writes headline + copy tuned to your beauty audience.
                    </div>
                  </>
                ) : (
                  /* Google: text-only */
                  <>
                    {([0, 1, 2] as const).map(i => (
                      <MB key={i}>
                        <FL>HEADLINE {i + 1} (max 30 chars)</FL>
                        <Field
                          placeholder={['e.g. Book Free Consultation', 'e.g. Milano Aesthetic Clinic', 'e.g. Non-Invasive Treatments'][i]}
                          value={form.googleHeadlines[i]}
                          maxLength={30}
                          onChange={e => {
                            const h = [...form.googleHeadlines] as [string, string, string];
                            h[i] = e.target.value; upd('googleHeadlines', h);
                          }}
                        />
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginTop: 4, textAlign: 'right' }}>{form.googleHeadlines[i].length}/30</div>
                      </MB>
                    ))}
                    {([0, 1] as const).map(i => (
                      <MB key={i}>
                        <FL>DESCRIPTION {i + 1} (max 90 chars)</FL>
                        <Textarea
                          rows={2}
                          placeholder={['e.g. Expert aesthetic treatments, personalized for you. Book online.', 'e.g. Safe, effective, non-invasive. Same-week appointments available.'][i]}
                          value={form.googleDescs[i]}
                          maxLength={90}
                          onChange={e => {
                            const d = [...form.googleDescs] as [string, string];
                            d[i] = e.target.value; upd('googleDescs', d);
                          }}
                        />
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginTop: 4, textAlign: 'right' }}>{form.googleDescs[i].length}/90</div>
                      </MB>
                    ))}
                    <MB>
                      <FL>KEYWORDS (comma-separated)</FL>
                      <Textarea rows={2} placeholder="e.g. aesthetic clinic milan, botox consultation, non-invasive treatment" value={form.keywords} onChange={e => upd('keywords', e.target.value)} />
                    </MB>
                    <PNote>Google Search ads are text-only — no creative needed. Your headlines and descriptions will rotate automatically.</PNote>
                  </>
                )}
              </>
            )}

            {/* ════ STEP 2 — GOAL & PLATFORM ════════════════════ */}
            {step === 2 && (
              <>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500, marginBottom: 4, color: 'var(--text)' }}>Goal &amp; platform</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 20 }}>What this campaign should achieve, and where it runs.</div>

                <MB>
                  <FL>CONVERSION GOAL</FL>
                  <Select value={form.goal} onChange={e => upd('goal', e.target.value)}>
                    {GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </Select>
                </MB>

                <MB>
                  <FL>BRAND</FL>
                  {brands.length === 0 ? (
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)', padding: '11px 13px', background: 'var(--field)', border: '1px solid var(--border)', borderRadius: 9 }}>
                      No brands found. <a href="/onboarding" style={{ color: 'var(--accent)' }}>Create a brand →</a>
                    </div>
                  ) : (
                    <Select value={form.brandId} onChange={e => upd('brandId', e.target.value)}>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                  )}
                </MB>

                <div style={{ marginBottom: 10, fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '0.5px', color: 'var(--text-2)' }}>PLATFORM</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 11, marginBottom: 4 }}>
                  {/* Meta */}
                  <div
                    onClick={() => metaConnected && upd('platform', 'meta')}
                    style={{
                      border: `1px solid ${form.platform === 'meta' ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 12, padding: '15px 14px',
                      background: form.platform === 'meta' ? 'var(--accent-soft)' : 'var(--field)',
                      cursor: metaConnected ? 'pointer' : 'not-allowed',
                      opacity: metaConnected ? 1 : 0.55, position: 'relative', transition: '.15s',
                    }}
                  >
                    {form.platform === 'meta' && <div style={{ position: 'absolute', top: 10, right: 10, color: 'var(--accent)', fontSize: 14 }}>✓</div>}
                    <div style={{ fontSize: 22, marginBottom: 8, color: form.platform === 'meta' ? 'var(--accent)' : 'var(--text)' }}>𝕄</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>Meta</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, marginTop: 3, color: metaConnected ? 'var(--green)' : 'var(--text-3)' }}>
                      {metaConnected ? '● Connected' : 'Not connected'}
                    </div>
                  </div>

                  {/* Google */}
                  <div
                    onClick={() => googleConnected ? upd('platform', 'google') : navigate('/connect')}
                    style={{
                      border: `1px solid ${form.platform === 'google' ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 12, padding: '15px 14px',
                      background: form.platform === 'google' ? 'var(--accent-soft)' : 'var(--field)',
                      cursor: 'pointer', opacity: googleConnected ? 1 : 0.7, position: 'relative', transition: '.15s',
                    }}
                  >
                    {form.platform === 'google' && <div style={{ position: 'absolute', top: 10, right: 10, color: 'var(--accent)', fontSize: 14 }}>✓</div>}
                    <Globe size={22} style={{ color: form.platform === 'google' ? 'var(--accent)' : 'var(--text)', marginBottom: 8, display: 'block' }} />
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>Google</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, marginTop: 3, color: googleConnected ? 'var(--green)' : 'var(--accent)' }}>
                      {googleConnected ? '● Connected' : 'Connect to use →'}
                    </div>
                  </div>

                  {/* TikTok — coming soon */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '15px 14px', background: 'var(--field)', cursor: 'not-allowed', opacity: 0.45 }}>
                    <div style={{ fontSize: 22, marginBottom: 8, color: 'var(--text)' }}>♪</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>TikTok</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, marginTop: 3, color: 'var(--text-3)' }}>Coming soon</div>
                  </div>
                </div>

                <PNote>
                  {form.platform === 'meta'
                    ? 'Meta ads use a visual creative + headline + primary text. Your uploaded creative will be used as the ad image.'
                    : form.platform === 'google'
                      ? 'Google Search ads use headlines + descriptions + keywords. Text-only — no creative image needed. Keywords are set in the Audience step.'
                      : 'Select a connected platform to see format requirements.'}
                </PNote>
              </>
            )}

            {/* ════ STEP 3 — BUDGET & SCHEDULE ════════════════ */}
            {step === 3 && (
              <>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500, marginBottom: 4, color: 'var(--text)' }}>Budget &amp; schedule</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 20 }}>Set your spend and when the campaign runs.</div>

                <MB>
                  <FL>CAMPAIGN NAME</FL>
                  <Field value={form.campaignName} onChange={e => upd('campaignName', e.target.value)} placeholder="e.g. Brand — Lead gen — June 2026" />
                </MB>

                <MB>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <FL>DAILY BUDGET (€)</FL>
                      <Field type="number" min="5" step="5" value={form.dailyBudget} onChange={e => upd('dailyBudget', e.target.value)} />
                    </div>
                    <div>
                      <FL>START DATE</FL>
                      <Field type="date" value={form.startDate} min={today} onChange={e => upd('startDate', e.target.value)} />
                    </div>
                  </div>
                </MB>

                <PNote>
                  {form.goal === 'leads'
                    ? 'Beauty lead-gen benchmark: min €30/day for consistent results. Below €20/day, Meta\'s algorithm may underperform.'
                    : form.goal === 'sales'
                      ? 'For conversion campaigns, Meta recommends at least 50 conversions/week to optimize. Budget accordingly.'
                      : 'Ensure your budget aligns with your campaign goal and market size.'}
                </PNote>
              </>
            )}

            {/* ════ STEP 4 — AUDIENCE (full geo + AI) ══════════ */}
            {step === 4 && (
              <>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500, marginBottom: 4, color: 'var(--text)' }}>Audience</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 16 }}>Who should see this ad.</div>

                {/* ── AI Build Audience button ── */}
                <div style={{ marginBottom: 20, padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 13, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Brain size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>Build audience with AI</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)' }}>
                      Uses your brand profile + past campaign performance to suggest the best targeting
                    </div>
                  </div>
                  <button
                    onClick={handleAISuggest}
                    disabled={aiLoading || !form.brandId}
                    style={{
                      background: 'var(--accent)', color: 'var(--ink)', border: 'none',
                      fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 500,
                      padding: '9px 16px', borderRadius: 9, cursor: aiLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                      opacity: aiLoading ? 0.7 : 1,
                    }}
                    onMouseEnter={e => { if (!aiLoading) e.currentTarget.style.background = 'var(--accent-deep)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                  >
                    {aiLoading
                      ? <><span style={{ display: 'inline-block', animation: 'wspin 1s linear infinite' }}>⟳</span> Building…</>
                      : <><Sparkles size={13} /> Build audience</>}
                  </button>
                </div>

                {/* AI reasoning */}
                {aiInsight && (
                  <div style={{ marginBottom: 16, padding: '11px 14px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 11, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, position: 'relative' }}>
                    <Brain size={12} style={{ color: 'var(--accent)', marginRight: 7, verticalAlign: 'middle' }} />
                    <strong style={{ color: 'var(--accent)' }}>AI insight: </strong>{aiInsight}
                    <button onClick={() => setAiInsight(null)} style={{ position: 'absolute', top: 9, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* ── Geo targeting — Meta-style ── */}
                <MB>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <FL>LOCATIONS</FL>
                    {form.countries.length > 0 && (
                      <button onClick={() => upd('countries', [])} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <X size={11} /> Clear all ({form.countries.length})
                      </button>
                    )}
                  </div>

                  {/* Region preset pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {REGIONS.map(r => {
                      const allSel = r.codes.every(c => form.countries.includes(c));
                      const someSel = r.codes.some(c => form.countries.includes(c));
                      return (
                        <button key={r.id} onClick={() => applyRegion(r.id)} style={{
                          border: `1px solid ${allSel ? 'var(--accent)' : someSel ? 'var(--amber)' : 'var(--border)'}`,
                          borderRadius: 8, padding: '5px 11px',
                          background: allSel ? 'var(--accent-soft)' : someSel ? 'rgba(217,176,106,0.1)' : 'var(--field)',
                          color: allSel ? 'var(--accent)' : someSel ? 'var(--amber)' : 'var(--text-2)',
                          fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', transition: '.12s',
                        }}>
                          {r.emoji && <span style={{ marginRight: 4 }}>{r.emoji}</span>}{r.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected chips — shown above search */}
                  {form.countries.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {form.countries.map(code => {
                        const loc = ALL_LOCS.find(l => l.code === code);
                        if (!loc) return null;
                        return (
                          <div key={code} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'var(--accent-soft)', border: '1px solid var(--accent)',
                            borderRadius: 20, padding: '4px 8px 4px 10px',
                            fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--accent)',
                          }}>
                            <span style={{ fontSize: 15 }}>{flag(loc.flagCode)}</span>
                            <span>{loc.name}</span>
                            {loc.type === 'region' && (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--accent-deep)', opacity: 0.7 }}>{loc.parentCode}</span>
                            )}
                            <button onClick={() => upd('countries', form.countries.filter(c => c !== code))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex', alignItems: 'center' }}>
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Search box */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--field)', border: `1px solid ${countrySearch ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 9, padding: '9px 13px', transition: '.15s', boxShadow: countrySearch ? '0 0 0 3px var(--accent-soft)' : 'none' }}>
                    <Search size={14} style={{ color: countrySearch ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0 }} />
                    <input
                      placeholder="Search countries, regions, states…"
                      value={countrySearch}
                      onChange={e => setCountrySearch(e.target.value)}
                      style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text)', width: '100%' }}
                    />
                    {countrySearch && <button onClick={() => setCountrySearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}><X size={13} /></button>}
                  </div>

                  {/* Search results / browse list */}
                  {countrySearch ? (
                    // ── Search results (countries + regions/states) ──
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 11, overflow: 'hidden', marginTop: 8, maxHeight: 260, overflowY: 'auto' }}>
                      {(() => {
                        const q = countrySearch.toLowerCase();
                        const results = ALL_LOCS.filter(l =>
                          l.name.toLowerCase().includes(q) ||
                          l.code.toLowerCase().includes(q) ||
                          (l.parentName ?? '').toLowerCase().includes(q)
                        ).slice(0, 30);
                        if (results.length === 0) return (
                          <div style={{ padding: '14px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)' }}>
                            No locations match "{countrySearch}"
                          </div>
                        );
                        return results.map(loc => {
                          const sel = form.countries.includes(loc.code);
                          return (
                            <div key={loc.code}
                              onClick={() => {
                                const next = sel ? form.countries.filter(c => c !== loc.code) : [...form.countries, loc.code];
                                upd('countries', next);
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 16px', cursor: 'pointer', transition: '.1s',
                                background: sel ? 'var(--accent-soft)' : 'transparent',
                                borderBottom: '1px solid var(--border)',
                              }}
                              onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--surface-2)'; }}
                              onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                            >
                              {/* Flag */}
                              <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{flag(loc.flagCode)}</span>
                              {/* Name + parent */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: sel ? 'var(--accent)' : 'var(--text)' }}>
                                  {loc.name}
                                </div>
                                {loc.type === 'region' && (
                                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                                    {loc.parentName}
                                  </div>
                                )}
                              </div>
                              {/* Type badge */}
                              <span style={{
                                fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.4px',
                                padding: '2px 7px', borderRadius: 10,
                                background: loc.type === 'region' ? 'rgba(106,163,217,0.15)' : 'var(--surface-2)',
                                color: loc.type === 'region' ? 'var(--blue)' : 'var(--text-3)',
                                border: `1px solid ${loc.type === 'region' ? 'rgba(106,163,217,0.3)' : 'var(--border)'}`,
                              }}>
                                {loc.type === 'region' ? 'Region' : 'Country'}
                              </span>
                              {/* Check */}
                              {sel && <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15, flexShrink: 0 }}>✓</span>}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    // ── Browse by tab (countries only, chips style) ──
                    <>
                      {/* Geo tabs */}
                      <div style={{ display: 'flex', background: 'var(--field)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, gap: 3, marginTop: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                        {[{ id: 'europe', label: '🌍 Europe' }, { id: 'americas', label: '🌎 Americas' }, { id: 'apac', label: '🌏 Asia Pacific' }, { id: 'mena', label: 'MENA' }].map(tab => (
                          <button key={tab.id} onClick={() => setActiveGeoTab(tab.id)} style={{
                            border: 'none', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500,
                            padding: '6px 12px', borderRadius: 7, cursor: 'pointer', transition: '.12s',
                            background: activeGeoTab === tab.id ? 'var(--accent-soft)' : 'transparent',
                            color: activeGeoTab === tab.id ? 'var(--accent)' : 'var(--text-2)',
                          }}>
                            {tab.label}
                            {(() => { const n = ALL_COUNTRIES.filter(c => c.regionGroup === tab.id && form.countries.includes(c.code)).length; return n > 0 ? <span style={{ marginLeft: 5, background: 'var(--accent)', color: 'var(--ink)', borderRadius: 10, padding: '1px 6px', fontSize: 9, fontFamily: 'var(--font-mono)' }}>{n}</span> : null; })()}
                          </button>
                        ))}
                      </div>
                      {/* Country grid with flags */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
                        {ALL_COUNTRIES.filter(c => c.regionGroup === activeGeoTab).map(c => {
                          const sel = form.countries.includes(c.code);
                          return (
                            <div key={c.code} onClick={() => { upd('countries', sel ? form.countries.filter(x => x !== c.code) : [...form.countries, c.code]); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 9,
                                padding: '8px 11px', borderRadius: 9, cursor: 'pointer', transition: '.1s',
                                border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                                background: sel ? 'var(--accent-soft)' : 'var(--field)',
                              }}
                              onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--surface-2)'; } }}
                              onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--field)'; } }}
                            >
                              <span style={{ fontSize: 18, flexShrink: 0 }}>{flag(c.flagCode)}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: sel ? 'var(--accent)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: sel ? 'var(--accent-deep)' : 'var(--text-3)' }}>{c.code}</div>
                              </div>
                              {sel && <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </MB>

                {/* ── Age + Gender ── */}
                <MB>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <FL>AGE RANGE</FL>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <Field type="number" min="18" max="65" value={form.ageMin} onChange={e => upd('ageMin', e.target.value)} placeholder="18" />
                        <Field type="number" min="18" max="65" value={form.ageMax} onChange={e => upd('ageMax', e.target.value)} placeholder="65" />
                      </div>
                    </div>
                    <div>
                      <FL>GENDER</FL>
                      <div style={{ display: 'inline-flex', background: 'var(--field)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, gap: 3 }}>
                        {(['all', 'women', 'men'] as const).map(g => (
                          <button
                            key={g}
                            onClick={() => upd('gender', g)}
                            style={{
                              border: 'none', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 500,
                              padding: '7px 14px', borderRadius: 7, cursor: 'pointer', transition: '.12s',
                              background: form.gender === g ? 'var(--accent-soft)' : 'transparent',
                              color: form.gender === g ? 'var(--accent)' : 'var(--text-2)',
                            }}
                          >
                            {g.charAt(0).toUpperCase() + g.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </MB>

                {/* ── Interests (Meta only) ── */}
                {form.platform === 'meta' && (
                  <MB>
                    <FL>INTERESTS & BEHAVIORS</FL>
                    {INTEREST_GROUPS.map(group => (
                      <div key={group.cat} style={{ marginBottom: 10 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.5px', marginBottom: 6 }}>{group.cat.toUpperCase()}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {group.items.map(interest => {
                            const sel = form.interests.includes(interest);
                            return (
                              <button
                                key={interest}
                                onClick={() => toggleInterest(interest)}
                                style={{
                                  border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                                  borderRadius: 30, padding: '5px 12px',
                                  background: sel ? 'var(--accent-soft)' : 'var(--field)',
                                  color: sel ? 'var(--accent)' : 'var(--text-2)',
                                  fontFamily: 'var(--font-ui)', fontSize: 11.5, cursor: 'pointer', transition: '.1s',
                                }}
                              >
                                {sel && '✓ '}{interest}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {form.interests.length > 0 && (
                      <div style={{ marginTop: 6, fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-3)' }}>
                        {form.interests.length} interest{form.interests.length > 1 ? 's' : ''} selected
                      </div>
                    )}
                  </MB>
                )}

                {/* ── Destination URL ── */}
                <MB>
                  <FL>{form.platform === 'google' ? 'LANDING PAGE URL' : 'DESTINATION URL'}</FL>
                  <Field type="url" value={form.destinationUrl} onChange={e => upd('destinationUrl', e.target.value)} placeholder="https://yourbrand.com/book" />
                </MB>

                {form.platform === 'google' && (
                  <MB>
                    <FL>KEYWORDS (comma-separated)</FL>
                    <Textarea rows={3} placeholder="e.g. aesthetic clinic milan, botox near me, non-invasive body treatment" value={form.keywords} onChange={e => upd('keywords', e.target.value)} />
                    <PNote>Keywords help Google match your ad to relevant searches. Use 10–20 specific keywords for best results.</PNote>
                  </MB>
                )}
              </>
            )}

            {/* ════ STEP 5 — REVIEW & PUBLISH ═════════════════ */}
            {step === 5 && (
              <>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500, marginBottom: 4, color: 'var(--text)' }}>Review &amp; publish</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 20 }}>Confirm everything looks right, then publish to your platform.</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {[
                    { l: 'PLATFORM', v: form.platform === 'meta' ? 'Meta Ads' : 'Google Ads' },
                    { l: 'GOAL', v: GOALS.find(g => g.value === form.goal)?.label ?? '—' },
                    { l: 'BRAND', v: activeBrand?.name ?? '—' },
                    { l: 'DAILY BUDGET', v: form.dailyBudget ? `€${form.dailyBudget} / day` : '—', mono: true },
                    { l: 'AUDIENCE', v: `${selectedCountriesLabel} · ${form.ageMin}–${form.ageMax} · ${form.gender.charAt(0).toUpperCase() + form.gender.slice(1)}` },
                    { l: 'START DATE', v: form.startDate || '—', mono: true },
                    { l: 'HEADLINE', v: form.platform === 'google' ? (form.googleHeadlines[0] || '—') : (form.headline || '—') },
                    { l: 'CAMPAIGN NAME', v: form.campaignName || '—' },
                  ].map(item => (
                    <div key={item.l} style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: 11, padding: '13px 15px' }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.8px', color: 'var(--text-3)', marginBottom: 5 }}>{item.l}</div>
                      <div style={{ fontFamily: item.mono ? 'var(--font-mono)' : 'var(--font-ui)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.v}
                      </div>
                    </div>
                  ))}
                </div>

                <PNote icon={<CheckCircle2 size={15} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />}>
                  Everything's ready. Publishing will create the campaign in your connected {form.platform === 'meta' ? 'Meta Ads' : 'Google Ads'} account in <strong>paused state</strong> for final review. No spend until you activate it in Ads Manager.
                </PNote>
              </>
            )}

          </div>{/* /step animation wrapper */}

          {/* ── Nav bar (bottom of form) ─────────────────────── */}
          <div style={{ marginTop: 'auto', paddingTop: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={goBack}
              disabled={step === 1}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)',
                fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500,
                padding: '12px 20px', borderRadius: 10, cursor: step === 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 7, opacity: step === 1 ? 0.4 : 1,
              }}
            >
              <ArrowLeft size={15} /> Back
            </button>

            <button
              onClick={handleSaveDraft}
              disabled={savingDraft}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)',
                fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500,
                padding: '12px 18px', borderRadius: 10,
                cursor: savingDraft ? 'not-allowed' : 'pointer',
                opacity: savingDraft ? 0.6 : 1, transition: '.15s',
              }}
              onMouseEnter={e => { if (!savingDraft) e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              {savingDraft
                ? <><span style={{ display: 'inline-block', animation: 'wspin 1s linear infinite' }}>⟳</span> Saving…</>
                : <><Save size={13} /> Save draft</>}
            </button>

            <button
              onClick={goNext}
              disabled={publishing}
              style={{
                marginLeft: 'auto',
                background: 'var(--accent)', color: 'var(--ink)',
                border: 'none', fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500,
                padding: '12px 24px', borderRadius: 10, cursor: publishing ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 7, opacity: publishing ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!publishing) e.currentTarget.style.background = 'var(--accent-deep)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
            >
              {step === 5
                ? publishing
                  ? <><span style={{ display: 'inline-block', animation: 'wspin 1s linear infinite' }}>⟳</span> Publishing…</>
                  : <><Rocket size={15} /> Publish</>
                : <>Next <ArrowRight size={15} /></>
              }
            </button>
          </div>
        </div>

        {/* ── STICKY PREVIEW ───────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow)', overflow: 'hidden', marginBottom: 14 }}>
            {/* Preview header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Live preview</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: 'var(--accent)', fontSize: 12 }}>●</span>
                {form.platform === 'meta' ? 'Meta feed' : form.platform === 'google' ? 'Google Search' : 'Preview'}
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {form.platform === 'google' ? (
                /* Google Search preview */
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--field)', padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)', marginBottom: 6 }}>Ad · {form.destinationUrl || 'yourbrand.com'}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500, color: 'var(--blue)', marginBottom: 6, lineHeight: 1.4 }}>
                    {[form.googleHeadlines[0], form.googleHeadlines[1], form.googleHeadlines[2]].filter(Boolean).join(' | ') || 'Headline 1 | Headline 2 | Headline 3'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                    {form.googleDescs[0] || 'Your description will appear here. Make it compelling and action-oriented.'}
                  </div>
                </div>
              ) : (
                /* Meta Feed preview */
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--field)' }}>
                  {/* Ad header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 12px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>{activeBrand?.name || 'Your Brand'}</div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-3)' }}>Sponsored</div>
                    </div>
                  </div>
                  {/* Primary text above image */}
                  {form.primaryText && (
                    <div style={{ padding: '0 12px 10px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                      {form.primaryText.slice(0, 90)}{form.primaryText.length > 90 ? '…' : ''}
                    </div>
                  )}
                  {/* Creative area */}
                  <div style={{ aspectRatio: '1/1', background: form.creativeUrl ? 'transparent' : 'linear-gradient(150deg, var(--accent) 0%, var(--accent-deep) 55%, #9E5436 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.7)', fontSize: 28, overflow: 'hidden' }}>
                    {form.creativeUrl
                      ? <img src={form.creativeUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : '🖼'}
                  </div>
                  {/* Copy */}
                  <div style={{ padding: 12 }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, minHeight: 20 }}>
                      {form.headline || <span style={{ color: 'var(--text-3)' }}>Your headline…</span>}
                    </div>
                    {/* CTA */}
                    <div style={{ marginTop: 11, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, textAlign: 'center', padding: 8, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--accent)' }}>
                      {form.ctaText || 'Book now'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview footer — budget real; reach/CPL = "—" per §45 */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              {[
                { l: 'EST. REACH', v: '—', accent: true },
                { l: 'EST. CPL',   v: '—', accent: false },
                { l: 'DAILY',      v: form.dailyBudget ? `€${form.dailyBudget}` : '—', accent: false },
              ].map(m => (
                <div key={m.l}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '0.6px', color: 'var(--text-3)' }}>{m.l}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, color: m.accent ? 'var(--accent)' : 'var(--text)', marginTop: 2 }}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Benchmark hint below preview */}
          {activeBrand && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', fontSize: 11.5, color: 'var(--text-3)', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>9yr beauty benchmark · {activeBrand.name}</span>
              <br />
              EST. REACH and CPL estimates are not available without a live campaign. They will show after your first sync.
            </div>
          )}
        </div>

      </div>{/* /grid */}

      {/* ══ Toast notification ═══════════════════════════════════════ */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'ok' ? 'var(--surface)' : '#3D1515',
          border: `1px solid ${toast.type === 'ok' ? 'var(--green)' : '#EF4444'}`,
          borderRadius: 12, padding: '12px 20px', zIndex: 999,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          animation: 'wsfade .2s ease',
          fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500,
          color: toast.type === 'ok' ? 'var(--text)' : '#FCA5A5',
        }}>
          <span style={{ fontSize: 16 }}>{toast.type === 'ok' ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}

      {/* ══ Your campaigns table ══════════════════════════════════════ */}
      <div style={{ marginTop: 40, paddingBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '1px', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4 }}>Workshop</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Your campaigns</h2>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 110px 100px 140px 120px',
            gap: 0,
            borderBottom: '1px solid var(--border)',
            padding: '11px 18px',
            background: 'var(--field)',
          }}>
            {['CAMPAIGN NAME', 'PLATFORM', 'STATUS', 'LAST EDITED', 'ACTIONS'].map(h => (
              <div key={h} style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, letterSpacing: '0.8px', color: 'var(--text-3)', fontWeight: 500 }}>{h}</div>
            ))}
          </div>

          {draftsList.length === 0 ? (
            /* Empty state */
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text-2)', marginBottom: 8 }}>
                No campaigns yet
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-3)' }}>
                Build your first campaign above — it will appear here as a draft.
              </div>
            </div>
          ) : (
            draftsList.map((draft, idx) => {
              const isDraft = draft.status === 'draft';
              const editedAt = new Date(draft.updated_at);
              const now = new Date();
              const diffMs = now.getTime() - editedAt.getTime();
              const diffM = Math.floor(diffMs / 60000);
              const diffH = Math.floor(diffM / 60);
              const diffD = Math.floor(diffH / 24);
              const relTime = diffM < 1 ? 'Just now' : diffM < 60 ? `${diffM}m ago` : diffH < 24 ? `${diffH}h ago` : `${diffD}d ago`;
              const platformLabel = draft.platform === 'meta' ? '📘 Meta' : draft.platform === 'google' ? '🔍 Google' : draft.platform;
              return (
                <div
                  key={draft.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 110px 100px 140px 120px',
                    gap: 0, padding: '14px 18px', alignItems: 'center',
                    borderBottom: idx < draftsList.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: '.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Name */}
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }}>
                    {draft.campaign_name || 'Untitled campaign'}
                  </div>
                  {/* Platform */}
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)' }}>{platformLabel}</div>
                  {/* Status pill */}
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 20,
                      fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 500,
                      background: isDraft ? 'var(--surface-2)' : 'var(--green-soft)',
                      color: isDraft ? 'var(--text-2)' : 'var(--green)',
                      border: `1px solid ${isDraft ? 'var(--border)' : 'var(--green)'}`,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                      {isDraft ? 'Draft' : 'Published'}
                    </span>
                  </div>
                  {/* Last edited */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{relTime}</div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={() => loadDraft(draft)}
                      title="Edit"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '5px 10px',
                        fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 500,
                        color: 'var(--accent)', cursor: 'pointer', transition: '.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-soft)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                    >
                      <Edit3 size={11} /> Edit
                    </button>
                    {isDraft && (
                      <button
                        onClick={() => handlePublishDraft(draft)}
                        title="Publish"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: 'var(--accent)', border: 'none',
                          borderRadius: 8, padding: '5px 10px',
                          fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 500,
                          color: 'var(--ink)', cursor: 'pointer', transition: '.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-deep)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                      >
                        <Rocket size={11} /> Publish
                      </button>
                    )}
                    <button
                      onClick={() => handleDuplicateDraft(draft)}
                      title="Duplicate"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 5,
                        color: 'var(--text-3)', borderRadius: 7, transition: '.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none'; }}
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteDraft(draft)}
                      title="Delete"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 5,
                        color: 'var(--text-3)', borderRadius: 7, transition: '.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes wsfade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes wspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 1080px) { .ws-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

export default CampaignWorkshop;
