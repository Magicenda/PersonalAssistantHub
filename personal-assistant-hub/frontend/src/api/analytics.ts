import client from './client';

export interface ProductivityStats {
  tasks_completed: number;
  tasks_total: number;
  tasks_by_day: { date: string; count: number }[];
  habits_completed: number;
  habits_total: number;
  habits_by_day: { date: string; count: number }[];
  current_streak: number;
}

export interface BudgetForecast {
  next_month_income: number;
  next_month_expenses: number;
  predicted_balance: number;
  confidence: number;
}

export interface Insight {
  id: number;
  type: string;
  title: string;
  description: string;
  severity?: string;
  created_at: string;
}

export interface CorrelationData {
  productivity_score: number;
  expenses: number;
  date: string;
}

export const analyticsApi = {
  getProductivity: (params?: { start_date?: string; end_date?: string }) =>
    client.get<ProductivityStats>('/integration/api/analytics/productivity-reports', { params }),

  getForecast: () =>
    client.get<BudgetForecast>('/integration/api/analytics/budget-forecasts'),

  getInsights: () =>
    client.get<Insight[]>('/integration/api/analytics/insights'),

  getCorrelation: (params?: { start_date?: string; end_date?: string }) =>
    client.get<CorrelationData[]>('/integration/api/analytics/correlation', { params }),
};
