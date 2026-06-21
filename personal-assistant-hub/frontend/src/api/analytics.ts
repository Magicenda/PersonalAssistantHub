import client from './client';

export interface Insight {
  id: number;
  type: string;
  title: string;
  description: string;
  severity?: string;
  created_at: string;
}

export const analyticsApi = {
  getInsights: () =>
    client.get<{ insight: string }>('/integration/api/analytics/insights'),
};
