import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
  CircularProgress,
  Chip,
} from '@mui/material';
import { TrendingUp, Lightbulb } from '@mui/icons-material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import { motion } from 'framer-motion';
import { financeApi } from '../api/finance';
import { analyticsApi, type Insight } from '../api/analytics';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return value === index ? <motion.div variants={itemVariants} initial="hidden" animate="visible">{children}</motion.div> : null;
}

export default function Analytics() {
  const [tabValue, setTabValue] = useState(0);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  const [barData, setBarData] = useState<{ month: string; income: number; expenses: number }[]>([]);
  const [balanceData, setBalanceData] = useState<{ month: string; balance: number }[]>([]);
  const [dashboard, setDashboard] = useState<{ total_balance: number; monthly_income: number; monthly_expenses: number; monthly_net: number } | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      financeApi.getReports(),
      financeApi.getCategoryBreakdown(),
      financeApi.getMonthlyTrends({ months: 12 }),
      financeApi.getBalanceHistory({ days: 30 }),
      analyticsApi.getInsights(),
    ]).then(([rep, cat, trend, balance, ins]) => {
      setDashboard(rep.data);

      const catData = cat.data || [];
      setPieData(
        catData.map((c: { category: string; amount: number }) => ({ name: c.category, value: Math.round(c.amount) }))
      );

      const trendData = trend.data || [];
      setBarData(trendData);

      const balData = balance.data || [];
      const grouped: Record<string, number> = {};
      balData.forEach((b: { date: string; balance: number }) => {
        const m = b.date.slice(0, 7);
        grouped[m] = b.balance;
      });
      setBalanceData(
        Object.entries(grouped).map(([month, balance]) => ({ month, balance: Math.round(balance) }))
      );

      const raw = ins.data as unknown;
      if (typeof raw === 'object' && raw !== null && 'insight' in raw) {
        const insightText = (raw as { insight: string }).insight;
        const parts = insightText.split('\n').filter(Boolean);
        setInsights(parts.map((text: string, idx: number) => ({
          id: idx,
          type: 'Аналитика',
          title: '',
          description: text,
          severity: 'info',
          created_at: new Date().toISOString(),
        })));
      } else if (Array.isArray(raw)) {
        setInsights(raw as Insight[]);
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Отчеты</Typography>

      {dashboard && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Общий баланс</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {Math.round(dashboard.total_balance).toLocaleString()} ₽
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Доходы за месяц</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {Math.round(dashboard.monthly_income).toLocaleString()} ₽
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Расходы за месяц</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                  {Math.round(dashboard.monthly_expenses).toLocaleString()} ₽
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Чистый доход</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: dashboard.monthly_net >= 0 ? 'success.main' : 'error.main' }}>
                  {Math.round(dashboard.monthly_net).toLocaleString()} ₽
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{ mb: 3, '& .MuiTabs-indicator': { borderRadius: 1 } }}
      >
        <Tab label="Финансы" />
        <Tab label="Инсайты" />
      </Tabs>

      {/* Finance Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Расходы по категориям
                </Typography>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="value">
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: 8 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 10 }}>Нет данных</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Доходы / Расходы
                </Typography>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                      <YAxis stroke="#94A3B8" fontSize={12} />
                      <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: 8 }} />
                      <Bar dataKey="income" name="Доходы" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Расходы" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 10 }}>Нет данных</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Динамика баланса
                </Typography>
                {balanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={balanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                      <YAxis stroke="#94A3B8" fontSize={12} />
                      <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: 8 }} />
                      <Line type="monotone" dataKey="balance" stroke="#2563EB" strokeWidth={2} dot={{ fill: '#2563EB' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 10 }}>Нет данных</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Insights Tab */}
      <TabPanel value={tabValue} index={1}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(124, 58, 237, 0.08))',
            border: '1px solid rgba(37, 99, 235, 0.15)',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Lightbulb sx={{ color: '#F59E0B' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                AI Аналитика
              </Typography>
            </Box>
            {insights.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {insights.map((insight) => (
                  <Box key={insight.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        label={insight.type}
                        size="small"
                        color={insight.severity === 'high' ? 'error' : insight.severity === 'medium' ? 'warning' : 'info'}
                        sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {insight.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {insight.description}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                Нет инсайтов
              </Typography>
            )}
          </CardContent>
        </Card>
      </TabPanel>
    </motion.div>
  );
}
