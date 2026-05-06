export interface AppData {
  id: string;
  name: string;
  platform: 'ios' | 'android';
  category: string;
  revenue: number;
  downloads: number;
  dau: number;
  retention: number;
  lifecycleStage: 'launch' | 'growth' | 'mature' | 'decline';
  icon?: string;
}

export interface MetricSnapshot {
  timestamp: string;
  revenue: number;
  downloads: number;
  activeUsers: number;
}

export interface Report {
  id: string;
  name: string;
  category: string;
  date: string;
  metrics: string[];
}
