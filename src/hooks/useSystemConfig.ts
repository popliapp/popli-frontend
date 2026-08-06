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
  minWatchDurationMs: number;
  minWithdrawalInr: number;
  giftCreatorSharePercent: number;
  giftCoinToInrRate: number;
  viewerCoinRewardPerView: number;
  viewerCoinMaxDaily: number;
  likerCoinRewardPer2Likes: number;
  likerCoinMaxDaily: number;
  coinPurchasePricePerCoin: number;
  coinWithdrawalRedeemRate: number;
  tdsPercentage: number;
  platformFeePercentage: number;
  referralCreatorReward: number;
  referralStandardReward: number;
  referralSuperReward: number;
  coinPackages: CoinPackage[];
  gifts: GiftItem[];
}

let cachedConfig: SystemConfig | null = null;
let fetchPromise: Promise<SystemConfig> | null = null;

async function loadSystemConfig(): Promise<SystemConfig> {
  if (cachedConfig) return cachedConfig;
  if (fetchPromise) return fetchPromise;

  fetchPromise = apiClient
    .get('/system/public-configs')
    .then((res) => {
      cachedConfig = res.data as SystemConfig;
      fetchPromise = null;
      return cachedConfig;
    })
    .catch((err) => {
      fetchPromise = null;
      throw err;
    });

  return fetchPromise;
}

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(cachedConfig === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig);
      setLoading(false);
      return;
    }
    loadSystemConfig()
      .then((c) => {
        setConfig(c);
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.response?.data?.message ?? 'Failed to load platform configuration');
        setLoading(false);
      });
  }, []);

  const refresh = () => {
    cachedConfig = null;
    fetchPromise = null;
    setLoading(true);
    setError(null);
    loadSystemConfig()
      .then((c) => {
        setConfig(c);
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.response?.data?.message ?? 'Failed to load platform configuration');
        setLoading(false);
      });
  };

  return { config, loading, error, refresh };
}

export { loadSystemConfig };