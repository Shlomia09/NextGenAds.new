/**
 * BrandContext — Global active brand state
 * Fetches all brands for the current user and exposes the active brand
 * to all pages. Persists selection in localStorage.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  category?: string;
  business_type?: string;
  aov_min?: number;
  aov_max?: number;
  currency?: string;
  markets?: string[];
  stage?: string;
  website?: string;
  created_at?: string;
}

interface BrandContextValue {
  brands: Brand[];
  activeBrand: Brand | null;
  setActiveBrand: (brand: Brand | null) => void;
  loading: boolean;
  refetch: () => void;
}

const BrandContext = createContext<BrandContextValue>({
  brands: [],
  activeBrand: null,
  setActiveBrand: () => {},
  loading: false,
  refetch: () => {},
});

const STORAGE_KEY = 'nextadsgen_active_brand_id';

export const BrandProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrand, setActiveBrandState] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBrands = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data ?? []) as Brand[];
      setBrands(list);

      // Restore persisted selection or auto-select first
      const storedId = localStorage.getItem(STORAGE_KEY);
      const restored = storedId ? list.find(b => b.id === storedId) ?? null : null;
      if (restored) {
        setActiveBrandState(restored);
      } else if (list.length > 0) {
        setActiveBrandState(list[0]);
        localStorage.setItem(STORAGE_KEY, list[0].id);
      }
    } catch (e) {
      console.error('[BrandContext] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const setActiveBrand = (brand: Brand | null) => {
    setActiveBrandState(brand);
    if (brand) localStorage.setItem(STORAGE_KEY, brand.id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <BrandContext.Provider value={{ brands, activeBrand, setActiveBrand, loading, refetch: fetchBrands }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => useContext(BrandContext);
