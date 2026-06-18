import client from './client';

export interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  account_id: number;
  account_name?: string;
  category_id?: number | null;
  category_name?: string;
  category_color?: string;
  amount: number;
  description: string;
  date: string;
  transaction_type: 'income' | 'expense';
  is_recurring: boolean;
  recurring_day?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  limit_amount: number;
  spent_amount: number;
  period: string;
  progress?: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceReport {
  total_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  monthly_net: number;
}

export const financeApi = {
  getAccounts: () =>
    client.get<Account[]>('/finance/api/accounts'),

  createAccount: (data: Partial<Account>) =>
    client.post<Account>('/finance/api/accounts', data),

  updateAccount: (id: number, data: Partial<Account>) =>
    client.put<Account>(`/finance/api/accounts/${id}`, data),

  deleteAccount: (id: number) =>
    client.delete(`/finance/api/accounts/${id}`),

  getCategories: () =>
    client.get<Category[]>('/finance/api/categories'),

  createCategory: (data: Partial<Category>) =>
    client.post<Category>('/finance/api/categories', data),

  getTransactions: (params?: { page?: number; account?: number; category?: number; start_date?: string; end_date?: string }) =>
    client.get<Transaction[]>('/finance/api/transactions', { params }),

  createTransaction: (data: Partial<Transaction>) =>
    client.post<Transaction>('/finance/api/transactions', data),

  updateTransaction: (id: number, data: Partial<Transaction>) =>
    client.put<Transaction>(`/finance/api/transactions/${id}`, data),

  getBudgets: (month?: string) =>
    client.get<Budget[]>('/finance/api/budgets', { params: { month } }),

  createBudget: (data: Partial<Budget>) =>
    client.post<Budget>('/finance/api/budgets', data),

  getReports: (params?: { start_date?: string; end_date?: string }) =>
    client.get<FinanceReport>('/finance/api/reports/dashboard', { params }),

  getBalanceHistory: (params?: { days?: number }) =>
    client.get<{ date: string; balance: number }[]>('/finance/api/balance-history', { params }),
};
