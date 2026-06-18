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
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ScatterChart, Scatter,
} from 'recharts';
import { motion } from 'framer-motion';
import { financeApi, type FinanceReport } from '../api/finance';
import { analyticsApi, type ProductivityStats, type CorrelationData, type Insight } from '../api/analytics';

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
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [productivity, setProductivity] = useState<ProductivityStats | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationData[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      financeApi.getReports(),
      analyticsApi.getProductivity(),
      analyticsApi.getCorrelation(),
      analyticsApi.getInsights(),
    ]).then(([r, p, c, i]) => {
      setReport(r.data);
      setProductivity(p.data);
      setCorrelation(c.data);
      setInsights(i.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  const pieData: { name: string; value: number }[] = [];
  const barData: { month: string; Доходы: number; Расходы: number }[] = [];
  const balanceData: { month: string; balance: number }[] = [];

  const productivityChartData = productivity?.tasks_by_day?.map((d) => ({
    date: d.date?.slice(5, 10) || '',
    tasks: d.count,
  })) || [];

  const habitsChartData = productivity?.habits_by_day?.map((d) => ({
    date: d.date?.slice(5, 10) || '',
    habits: d.count,
  })) || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Отчеты</Typography>

      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{ mb: 3, '& .MuiTabs-indicator': { borderRadius: 1 } }}
      >
        <Tab label="Финансы" />
        <Tab label="Продуктивность" />
        <Tab label="Корреляция" />
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
                      <Bar dataKey="Доходы" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Расходы" fill="#EF4444" radius={[4, 4, 0, 0]} />
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

      {/* Productivity Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Задач выполнено</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main', my: 1 }}>
                  {productivity?.tasks_completed ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  из {productivity?.tasks_total ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Привычек выполнено</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main', my: 1 }}>
                  {productivity?.habits_completed ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  из {productivity?.habits_total ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Текущая серия</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', my: 1 }}>
                  {productivity?.current_streak ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">дней</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Продуктивность</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: productivity && productivity.tasks_total > 0
                  ? Math.round((productivity.tasks_completed / productivity.tasks_total) * 100) > 50 ? 'success.main' : 'warning.main'
                  : 'text.secondary', my: 1
                }}>
                  {productivity && productivity.tasks_total > 0
                    ? Math.round((productivity.tasks_completed / productivity.tasks_total) * 100)
                    : 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Выполненные задачи
                </Typography>
                {productivityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={productivityChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
                      <YAxis stroke="#94A3B8" fontSize={12} />
                      <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: 8 }} />
                      <Bar dataKey="tasks" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>Нет данных</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Выполненные привычки
                </Typography>
                {habitsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={habitsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
                      <YAxis stroke="#94A3B8" fontSize={12} />
                      <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: 8 }} />
                      <Bar dataKey="habits" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>Нет данных</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Correlation Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Продуктивность vs Расходы
                </Typography>
                {correlation.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis
                        dataKey="productivity_score"
                        name="Продуктивность"
                        stroke="#94A3B8"
                        fontSize={12}
                        label={{ value: 'Продуктивность', position: 'bottom', fill: '#94A3B8', fontSize: 12 }}
                      />
                      <YAxis
                        dataKey="expenses"
                        name="Расходы"
                        stroke="#94A3B8"
                        fontSize={12}
                        label={{ value: 'Расходы (₽)', angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{ background: '#1E293B', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: 8 }}
                        formatter={(value: number) => value.toLocaleString()}
                      />
                      <Scatter data={correlation} fill="#2563EB" />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 12 }}>Нет данных</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(124, 58, 237, 0.08))',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                height: '100%',
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
          </Grid>
        </Grid>
      </TabPanel>
    </motion.div>
  );
}
