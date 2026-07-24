import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface CoinPackage {
  id: string;
  title: string;
  coins: number;
  bonusCoins: number;
  priceInr: number;
  badge?: string;
  badgeColor?: string;
  description?: string;
  isPopular: boolean;
  isRecommended: boolean;
  isActive: boolean;
  sortOrder: number;
}
export interface GiftItem {
  id: string;
  name: string;
  costInCoins: number;
  costInINR: number;
  iconUrl: string;
  animationType: string;
  isActive: boolean;
  sortOrder: number;
}

export interface SystemConfig {
  viewRatePer1000: number;
  minWithdrawalInr: number;
  giftCreatorSharePercent: number;
  viewerCoinRewardPerView: number;
  viewerCoinMaxDaily: number;
  likerCoinRewardPer2Likes: number;
  likerCoinMaxDaily: number;
  coinPurchasePricePerCoin: number;
  coinWithdrawalRedeemRate: number;
  coinPackages: CoinPackage[];
  gifts: GiftItem[];
}

const DEFAULTS: SystemConfig = {
  viewRatePer1000: 5,
  minWithdrawalInr: 500,
  giftCreatorSharePercent: 60,
  viewerCoinRewardPerView: 10,
  viewerCoinMaxDaily: 200,
  likerCoinRewardPer2Likes: 1,
  likerCoinMaxDaily: 50,
  coinPurchasePricePerCoin: 1.25,
  coinWithdrawalRedeemRate: 0.85,
  coinPackages: [],
  gifts: [],
};

let cachedConfig: SystemConfig | null = null;
let fetchPromise: Promise<SystemConfig> | null = null;

async function fetchSystemConfig(): Promise<SystemConfig> {
  if (cachedConfig) return cachedConfig;
  if (fetchPromise) return fetchPromise;

  fetchPromise = apiClient
    .get('/system/public-configs')
    .then((res) => {
      cachedConfig = { ...DEFAULTS, ...res.data };
      fetchPromise = null;
      return cachedConfig!;
    })
    .catch(() => {
      fetchPromise = null;
      return DEFAULTS;
    });

  return fetchPromise;
}

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig>(
    cachedConfig ?? DEFAULTS,
  );
  const [loading, setLoading] = useState(!cachedConfig);

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig);
      setLoading(false);
      return;
    }
    fetchSystemConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  // Call this to force a refresh (e.g. after admin changes a config)
  const refresh = () => {
    cachedConfig = null;
    setLoading(true);
    fetchSystemConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  };

  return { ...config, loading, refresh };
}

// One-shot fetch for use outside of components (e.g. in Zustand actions)
export { fetchSystemConfig };