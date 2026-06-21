import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Whatshot,
  Lightbulb,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import type { AxiosResponse } from 'axios';
import { financeApi, type FinanceReport } from '../api/finance';
import { tasksApi, type Task, type Habit } from '../api/tasks';
import { analyticsApi, type Insight } from '../api/analytics';

function parseInsights(raw: unknown): Insight[] {
  if (typeof raw === 'object' && raw !== null && 'insight' in raw) {
    const text = (raw as { insight: string }).insight;
    return text.split('\n').filter(Boolean).map((t: string, idx: number) => ({
      id: idx, type: 'Аналитика', title: '', description: t, severity: 'info', created_at: new Date().toISOString(),
    }));
  }
  return [];
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      financeApi.getReports().catch(() => null),
      financeApi.getCategoryBreakdown().catch(() => ({ data: [] })),
      tasksApi.getTasks().catch(() => ({ data: [] as Task[] }) as AxiosResponse<Task[]>),
      tasksApi.getHabits().catch(() => ({ data: [] as Habit[] }) as AxiosResponse<Habit[]>),
      analyticsApi.getInsights().catch(() => ({ data: { insight: '' } })),
    ]).then(([r, cat, t, h, i]) => {
      if (r) setReport(r.data);
      if (cat && cat.data) {
        setPieData((cat.data as { category: string; amount: number }[]).map((c) => ({ name: c.category, value: Math.round(c.amount) })));
      }
      setTasks(t.data || []);
      setHabits(h.data || []);
      setInsights(parseInsights(i?.data));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const totalBalance = report?.total_balance ?? 0;
  const monthlyIncome = report?.monthly_income ?? 0;
  const monthlyExpenses = report?.monthly_expenses ?? 0;
  const tasksCompleted = tasks.filter((t) => t.status === 'done').length;
  const tasksActive = tasks.filter((t) => t.status !== 'done').length;
  const maxStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.streak)) : 0;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Dashboard
      </Typography>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={4}>
              <motion.div variants={itemVariants}>
                <Card
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate('/finance')}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Общий баланс
                      </Typography>
                      <AccountBalance sx={{ color: 'primary.main', fontSize: 20 }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {totalBalance.toLocaleString()} ₽
                    </Typography>
                    <Chip
                      label={totalBalance >= 0 ? 'Положительный' : 'Отрицательный'}
                      color={totalBalance >= 0 ? 'success' : 'error'}
                      size="small"
                      sx={{ mt: 1, fontWeight: 500 }}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={4}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Доходы
                      </Typography>
                      <TrendingUp sx={{ color: 'success.main', fontSize: 20 }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                      +{monthlyIncome.toLocaleString()} ₽
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      За текущий месяц
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={4}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Расходы
                      </Typography>
                      <TrendingDown sx={{ color: 'error.main', fontSize: 20 }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                      -{monthlyExpenses.toLocaleString()} ₽
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      За текущий месяц
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            <Grid item xs={12} sm={6}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Задачи
                      </Typography>
                      <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                          {tasksCompleted}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Выполнено
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {tasksActive}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Активных
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={6}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Привычки
                      </Typography>
                      <Whatshot sx={{ color: 'warning.main', fontSize: 20 }} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>
                        {maxStreak}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        дней максимальная серия
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={4}>
          <motion.div variants={itemVariants}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Расходы по категориям
                  </Typography>
                </Box>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#1E293B',
                          border: '1px solid rgba(148, 163, 184, 0.12)',
                          borderRadius: 8,
                        }}
                        formatter={(value: number) => `${value.toLocaleString()} ₽`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                    Нет данных
                  </Typography>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {insights.length > 0 && (
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(124, 58, 237, 0.1))',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Lightbulb sx={{ color: '#F59E0B' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      AI Инсайты
                    </Typography>
                  </Box>
                  {insights.slice(0, 3).map((insight) => (
                    <Box key={insight.id} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                        {insight.description || insight.title}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}
      </Grid>
    </motion.div>
  );
}
