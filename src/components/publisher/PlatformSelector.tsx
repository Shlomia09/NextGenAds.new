import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

type Platform = 'meta' | 'google' | 'tiktok';

interface AdAccount {
  account_id: string;
  account_name: string;
  platform: Platform;
  status: string;
}

interface Props {
  brandId: string;
  selected: Platform | null;
  selectedAccountId: string;
  onSelect: (platform: Platform, accountId: string) => void;
}

const PLATFORMS: {
  key: Platform;
  label: string;
  emoji: string;
}[] = [
  { key: 'meta',   label: 'Meta',   emoji: '📘' },
  { key: 'google', label: 'Google', emoji: '🔍' },
  { key: 'tiktok', label: 'TikTok', emoji: '🎵' },
];

export default function PlatformSelector({ brandId, selected, selectedAccountId, onSelect }: Props) {
  const { user } = useAuth();

  const { data: accounts = [] } = useQuery<AdAccount[]>({
    queryKey: ['ad_accounts', brandId, user?.id],
    enabled: !!user?.id && !!brandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_accounts')
        .select('account_id,account_name,platform,status')
        .eq('brand_id', brandId);
      if (error) throw error;
      return (data ?? []) as AdAccount[];
    },
  });

  const getAccount = (platform: Platform): AdAccount | undefined =>
    accounts.find(a => a.platform === platform && a.status === 'active');

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {PLATFORMS.map(({ key, label, emoji }) => {
        const account = getAccount(key);
        const isTikTok = key === 'tiktok';
        const isDisabled = isTikTok || !account;
        const isSelected = selected === key && selectedAccountId === account?.account_id;

        let subLabel: React.ReactNode = null;
        if (account) {
          subLabel = (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--text-hint)',
              marginTop: 4,
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 120,
            }}>
              {account.account_name}
            </span>
          );
        } else if (isTikTok) {
          subLabel = (
            <span style={{
              fontSize: 9,
              color: 'var(--text-hint)',
              marginTop: 4,
              display: 'block',
              background: '#F0ECE8',
              borderRadius: 4,
              padding: '1px 5px',
            }}>
              Coming soon
            </span>
          );
        } else if (key === 'google') {
          subLabel = (
            <span style={{
              fontSize: 9,
              color: 'var(--rose-gold)',
              marginTop: 4,
              display: 'block',
            }}>
              Apply for Developer Token
            </span>
          );
        } else {
          // meta — no account
          subLabel = (
            <a
              href="/connect"
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: 9,
                color: 'var(--rose-gold)',
                marginTop: 4,
                display: 'block',
                textDecoration: 'none',
              }}
            >
              Connect Meta Account
            </a>
          );
        }

        return (
          <button
            key={key}
            disabled={isDisabled}
            onClick={() => !isDisabled && account && onSelect(key, account.account_id)}
            style={{
              flex: '1 1 100px',
              minWidth: 100,
              maxWidth: 160,
              padding: '12px 14px',
              borderRadius: 10,
              border: isSelected
                ? '1px solid var(--rose-gold)'
                : '0.5px solid #E8E4DF',
              background: isSelected
                ? 'rgba(196,131,106,0.08)'
                : '#FFFFFF',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.5 : 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 2,
              transition: 'border-color 0.15s, background 0.15s',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: isSelected ? 'var(--rose-gold)' : 'var(--text-primary)',
              }}>
                {label}
              </span>
            </div>
            {subLabel}
          </button>
        );
      })}
    </div>
  );
}
