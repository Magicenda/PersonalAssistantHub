import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { financeApi, type Transaction } from '../api/finance';
import { tasksApi, type Task, type Habit } from '../api/tasks';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const TYPE_COLORS: Record<string, string> = {
  task: '#2563EB',
  habit: '#F59E0B',
  payment: '#10B981',
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      financeApi.getTransactions({
        start_date: startOfMonth.format('YYYY-MM-DD'),
        end_date: endOfMonth.format('YYYY-MM-DD'),
      }),
      tasksApi.getTasks(),
      tasksApi.getHabits(),
    ]).then(([t, ts, h]) => {
      setTransactions(t.data.results || []);
      setTasks(ts.data);
      setHabits(h.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentDate]);

  const getDaysInMonth = () => {
    const daysInMonth = currentDate.daysInMonth();
    const firstDayOfWeek = startOfMonth.day() || 7;
    const days: (number | null)[] = Array(firstDayOfWeek - 1).fill(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getEventsForDate = (day: number) => {
    const dateStr = currentDate.date(day).format('YYYY-MM-DD');
    const dateStrFixed = currentDate.date(day).format('YYYY-MM-DD');
    const dayTasks = tasks.filter((t) => t.deadline?.startsWith(dateStrFixed));
    const dayHabits = habits.filter((h) => h.completed_dates?.includes(dateStrFixed));
    const dayPayments = transactions.filter((t) => t.date.startsWith(dateStrFixed));
    return { tasks: dayTasks, habits: dayHabits, payments: dayPayments };
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(currentDate.add(direction, 'month'));
  };

  const goToday = () => setCurrentDate(dayjs());

  const days = getDaysInMonth();
  const today = dayjs().format('YYYY-MM-DD');

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  const selectedDayEvents = selectedDate
    ? (() => {
        const day = parseInt(selectedDate.split('-')[2]);
        return getEventsForDate(day);
      })()
    : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Календарь</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigateMonth(-1)}><ChevronLeft /></IconButton>
          <Typography variant="h6" sx={{ minWidth: 180, textAlign: 'center', fontWeight: 600 }}>
            {currentDate.format('MMMM YYYY')}
          </Typography>
          <IconButton onClick={() => navigateMonth(1)}><ChevronRight /></IconButton>
          <IconButton onClick={goToday}><Today /></IconButton>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={0}>
            {WEEKDAYS.map((day) => (
              <Grid item xs={12 / 7} key={day} sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={0}>
            {days.map((day, idx) => {
              if (day === null) {
                return <Grid item xs={12 / 7} key={`empty-${idx}`} sx={{ minHeight: 100 }} />;
              }

              const dateStr = currentDate.date(day).format('YYYY-MM-DD');
              const events = getEventsForDate(day);
              const isToday = dateStr === today;
              const totalEvents = events.tasks.length + events.habits.length + events.payments.length;

              return (
                <Grid
                  item
                  xs={12 / 7}
                  key={dateStr}
                  sx={{
                    minHeight: 100,
                    p: 0.5,
                    borderTop: '1px solid',
                    borderRight: idx % 7 === 6 ? 'none' : '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.05)' },
                    bgcolor: isToday ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                  }}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? 'primary.main' : 'text.primary',
                      display: 'block',
                      mb: 0.5,
                    }}
                  >
                    {day}
                  </Typography>

                  {events.tasks.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap', mb: 0.3 }}>
                      {events.tasks.slice(0, 2).map((t) => (
                        <Box
                          key={t.id}
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: TYPE_COLORS.task,
                          }}
                        />
                      ))}
                      {events.tasks.length > 2 && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                          +{events.tasks.length - 2}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {events.habits.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap', mb: 0.3 }}>
                      {events.habits.slice(0, 2).map((h) => (
                        <Box
                          key={h.id}
                          sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: TYPE_COLORS.habit }}
                        />
                      ))}
                    </Box>
                  )}
                  {events.payments.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap' }}>
                      {events.payments.slice(0, 2).map((p) => (
                        <Box
                          key={p.id}
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: TYPE_COLORS.payment,
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      <Dialog open={!!selectedDate} onClose={() => setSelectedDate(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedDate && dayjs(selectedDate).format('DD MMMM YYYY')}
        </DialogTitle>
        <DialogContent>
          {selectedDayEvents && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedDayEvents.tasks.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: TYPE_COLORS.task, fontWeight: 600 }}>
                    Задачи ({selectedDayEvents.tasks.length})
                  </Typography>
                  {selectedDayEvents.tasks.map((t) => (
                    <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TYPE_COLORS.task }} />
                      <Typography variant="body2">{t.title}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {selectedDayEvents.habits.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: TYPE_COLORS.habit, fontWeight: 600 }}>
                    Привычки ({selectedDayEvents.habits.length})
                  </Typography>
                  {selectedDayEvents.habits.map((h) => (
                    <Box key={h.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TYPE_COLORS.habit }} />
                      <Typography variant="body2">{h.title}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {selectedDayEvents.payments.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: TYPE_COLORS.payment, fontWeight: 600 }}>
                    Платежи ({selectedDayEvents.payments.length})
                  </Typography>
                  {selectedDayEvents.payments.map((p) => (
                    <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TYPE_COLORS.payment }} />
                      <Typography variant="body2">
                        {p.description}: {p.amount.toLocaleString()} ₽
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {!selectedDayEvents.tasks.length && !selectedDayEvents.habits.length && !selectedDayEvents.payments.length && (
                <Typography variant="body2" color="text.secondary">
                  Нет событий на этот день
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedDate(null)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}
