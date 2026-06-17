import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActiveAccount } from '../../contexts/ActiveAccountContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { CONVERSION_META } from '../../lib/conversionConfig';
import type { ActiveAccount } from '../../contexts/ActiveAccountContext';

interface AccountRow {
  id: string;
  account_id: string;
  account_name: string;
  display_name: string;
  conversion_type: string;
  platform: string;
  brand_id: string | null;
  brands: { name: string } | { name: string }[] | null;
}

interface BrandGroup {
  brand_id: string | null;
  brand_name: string;
  accounts: ActiveAccount[];
}

const AccountSwitcher: React.FC = () => {
  const { activeAccount, setActiveAccount } = useActiveAccount();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<ActiveAccount[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch accounts on mount
  useEffect(() => {
    if (!user) return;
    const fetchAccounts = async () => {
      const { data } = await supabase
        .from('ad_accounts')
        .select('id, account_id, account_name, display_name, conversion_type, platform, brand_id, brands(name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at');

      if (data) {
        const mapped: ActiveAccount[] = (data as AccountRow[]).map(row => ({
          id: row.id,
          account_id: row.account_id,
          account_name: row.account_name,
          display_name: row.display_name || row.account_name,
          conversion_type: (row.conversion_type || 'ecommerce') as ActiveAccount['conversion_type'],
          platform: row.platform as ActiveAccount['platform'],
          brand_id: row.brand_id ?? undefined,
          brand_name: Array.isArray(row.brands) ? row.brands[0]?.name : row.brands?.name ?? undefined,
        }));
        setAccounts(mapped);

        // Auto-select first account if none is active
        if (!activeAccount && mapped.length > 0) {
          setActiveAccount(mapped[0]);
        }
      }
    };
    fetchAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Group accounts by brand
  const groups: BrandGroup[] = [];
  const brandMap = new Map<string, BrandGroup>();

  accounts.forEach(acc => {
    const key = acc.brand_id ?? '__no_brand__';
    if (!brandMap.has(key)) {
      const group: BrandGroup = {
        brand_id: acc.brand_id ?? null,
        brand_name: acc.brand_name ?? 'No Brand',
        accounts: [],
      };
      brandMap.set(key, group);
      groups.push(group);
    }
    brandMap.get(key)!.accounts.push(acc);
  });

  const activeMeta = activeAccount
    ? CONVERSION_META[activeAccount.conversion_type] ?? CONVERSION_META.ecommerce
    : null;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          background: '#FFFFFF',
          border: open ? '0.5px solid #C4836A' : '0.5px solid #E8E4DF',
          borderRadius: 4,
          padding: '7px 10px',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
      >
        {activeMeta && (
          <span style={{ fontSize: 12, lineHeight: 1, flexShrink: 0 }}>
            {activeMeta.emoji}
          </span>
        )}
        <span
          style={{
            flex: 1,
            fontFamily: "'Outfit', sans-serif",
            fontSize: 11,
            fontWeight: 300,
            color: activeAccount ? '#1A1410' : '#A09890',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'left',
          }}
        >
          {activeAccount ? activeAccount.display_name : 'Select account…'}
        </span>
        <ChevronDown
          size={11}
          strokeWidth={1.5}
          style={{
            color: '#A09890',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#FFFFFF',
            border: '0.5px solid #E8E4DF',
            borderRadius: 4,
            zIndex: 200,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            minWidth: 188,
          }}
        >
          {groups.length === 0 ? (
            <div
              style={{
                padding: '10px 12px',
                fontFamily: "'Outfit', sans-serif",
                fontSize: 10,
                color: '#A09890',
                fontWeight: 300,
              }}
            >
              No active accounts
            </div>
          ) : (
            groups.map((group, gi) => (
              <div key={group.brand_id ?? '__no_brand__'}>
                {gi > 0 && (
                  <div
                    style={{
                      height: '0.5px',
                      background: '#E8E4DF',
                      margin: '4px 0',
                    }}
                  />
                )}
                {/* Brand header */}
                <div
                  style={{
                    padding: '6px 12px 2px',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 8,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#A09890',
                    fontWeight: 400,
                  }}
                >
                  {group.brand_name}
                </div>

                {/* Account items */}
                {group.accounts.map(acc => {
                  const meta = CONVERSION_META[acc.conversion_type] ?? CONVERSION_META.ecommerce;
                  const isActive = activeAccount?.id === acc.id;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => {
                        setActiveAccount(acc);
                        setOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        width: '100%',
                        padding: '6px 12px',
                        background: isActive ? 'rgba(196,131,106,0.08)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(196,131,106,0.04)';
                      }}
                      onMouseLeave={e => {
                        if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                    >
                      <span style={{ width: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isActive
                          ? <Check size={10} strokeWidth={2} style={{ color: '#C4836A' }} />
                          : null
                        }
                      </span>
                      <span style={{ fontSize: 12, lineHeight: 1, flexShrink: 0 }}>
                        {meta.emoji}
                      </span>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: 11,
                            fontWeight: isActive ? 400 : 300,
                            color: isActive ? '#1A1410' : '#5C4035',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {acc.display_name}
                        </div>
                        <div
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 9,
                            color: '#A09890',
                            marginTop: 1,
                          }}
                        >
                          {acc.account_id}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}

          {/* Separator */}
          <div style={{ height: '0.5px', background: '#E8E4DF', margin: '4px 0' }} />

          {/* Connect new account */}
          <button
            onClick={() => {
              setOpen(false);
              navigate('/connect');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              width: '100%',
              padding: '7px 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(196,131,106,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <Plus size={10} strokeWidth={1.5} style={{ color: '#C4836A', flexShrink: 0 }} />
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 10,
                fontWeight: 300,
                color: '#C4836A',
                letterSpacing: '0.02em',
              }}
            >
              Connect new account
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountSwitcher;
