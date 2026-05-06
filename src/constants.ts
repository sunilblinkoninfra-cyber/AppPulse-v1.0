import { AppData } from './types';

export const MOCK_APPS: AppData[] = [
  {
    id: '1',
    name: 'PhotoPulse',
    platform: 'ios',
    category: 'Photo & Video',
    revenue: 450000,
    downloads: 1200000,
    dau: 450000,
    retention: 35,
    lifecycleStage: 'growth'
  },
  {
    id: '2',
    name: 'GameGrid',
    platform: 'android',
    category: 'Games',
    revenue: 1200000,
    downloads: 5000000,
    dau: 1200000,
    retention: 28,
    lifecycleStage: 'mature'
  },
  {
    id: '3',
    name: 'TaskMaster',
    platform: 'ios',
    category: 'Productivity',
    revenue: 85000,
    downloads: 300000,
    dau: 75000,
    retention: 52,
    lifecycleStage: 'growth'
  },
  {
    id: '4',
    name: 'FitTrack AI',
    platform: 'ios',
    category: 'Health & Fitness',
    revenue: 950000,
    downloads: 2500000,
    dau: 800000,
    retention: 41,
    lifecycleStage: 'mature'
  },
  {
    id: '5',
    name: 'ZenFlow',
    platform: 'android',
    category: 'Health & Fitness',
    revenue: 120000,
    downloads: 450000,
    dau: 150000,
    retention: 38,
    lifecycleStage: 'growth'
  },
  {
    id: '6',
    name: 'CryptoTrack',
    platform: 'android',
    category: 'Finance',
    revenue: 2500000,
    downloads: 8000000,
    dau: 2100000,
    retention: 15,
    lifecycleStage: 'decline'
  }
];

export const CATEGORIES = ['Games', 'Productivity', 'Finance', 'Health & Fitness', 'Photo & Video', 'Social', 'Entertainment'];
export const PLATFORMS = ['ios', 'android'];
