import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  LinearProgress,
  CircularProgress,
  Chip,
  IconButton,
} from '@mui/material';
import { Add, Whatshot, CheckCircleOutline, RadioButtonUnchecked, Delete } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { tasksApi, type Habit } from '../api/tasks';

const HABIT_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    frequency: 'daily' as Habit['frequency'],
    color: HABIT_COLORS[0],
  });
  const [editDialog, setEditDialog] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchHabits = () => {
    setLoading(true);
    tasksApi.getHabits().then((r) => {
      setHabits(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchHabits(); }, []);

  const handleComplete = async (id: number) => {
    try {
      await tasksApi.completeHabit(id);
      fetchHabits();
    } catch {}
  };

  const handleAdd = async () => {
    if (!newHabit.title.trim()) return;
    try {
      await tasksApi.createHabit(newHabit);
      setAddDialog(false);
      setNewHabit({ title: '', description: '', frequency: 'daily', color: HABIT_COLORS[0] });
      fetchHabits();
    } catch {}
  };

  const handleEditClick = (habit: Habit) => {
    setEditHabit(habit);
    setEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!editHabit || !editHabit.title.trim()) return;
    try {
      await tasksApi.updateHabit(editHabit.id, {
        title: editHabit.title,
        description: editHabit.description,
        frequency: editHabit.frequency,
        color: editHabit.color,
      });
      setEditDialog(false);
      setEditHabit(null);
      fetchHabits();
    } catch {}
  };

  const handleDelete = async (id: number) => {
    try {
      await tasksApi.deleteHabit(id);
      setDeleteConfirm(null);
      fetchHabits();
    } catch {}
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Привычки</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setAddDialog(true)}>
          Добавить
        </Button>
      </Box>

      <Grid container spacing={2.5}>
        {habits.map((habit, idx) => {
          const isCompletedToday = habit.completed_dates?.includes(todayStr);
          const progress = habit.frequency === 'daily'
            ? Math.min(habit.streak / 30, 1)
            : habit.frequency === 'weekly'
            ? Math.min(habit.streak / 12, 1)
            : Math.min(habit.streak / 6, 1);

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={habit.id}>
              <motion.div variants={cardVariants}>
                <Card
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    border: isCompletedToday ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.12)',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 4,
                      height: '100%',
                      bgcolor: habit.color || HABIT_COLORS[idx % HABIT_COLORS.length],
                    }}
                  />
                  <CardContent sx={{ pl: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.3 }}>
                          {habit.title}
                        </Typography>
                        {habit.description && (
                          <Typography variant="caption" color="text.secondary">
                            {habit.description}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                          label={habit.frequency === 'daily' ? 'Ежедневно' : habit.frequency === 'weekly' ? 'Еженедельно' : 'Ежемесячно'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 10 }}
                        />
                        <IconButton size="small" onClick={() => handleEditClick(habit)} sx={{ p: 0.3 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>✎</Typography>
                        </IconButton>
                        <IconButton size="small" onClick={() => setDeleteConfirm(habit.id)} sx={{ p: 0.3 }}>
                          <Delete fontSize="small" sx={{ color: 'error.main', fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Whatshot sx={{ color: 'warning.main', fontSize: 20 }} />
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>
                        {habit.streak}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        дней подряд
                      </Typography>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={progress * 100}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(148, 163, 184, 0.12)',
                        mb: 1.5,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: habit.color || HABIT_COLORS[idx % HABIT_COLORS.length],
                          borderRadius: 3,
                        },
                      }}
                    />

                    <Button
                      fullWidth
                      variant={isCompletedToday ? 'outlined' : 'contained'}
                      color={isCompletedToday ? 'success' : 'primary'}
                      size="small"
                      startIcon={isCompletedToday ? <CheckCircleOutline /> : <RadioButtonUnchecked />}
                      onClick={() => handleComplete(habit.id)}
                      disabled={isCompletedToday}
                    >
                      {isCompletedToday ? 'Выполнено' : 'Отметить'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          );
        })}
        {habits.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
              Нет привычек. Начните добавлять!
            </Typography>
          </Grid>
        )}
      </Grid>

      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новая привычка</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Название"
              fullWidth
              value={newHabit.title}
              onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
            />
            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={2}
              value={newHabit.description}
              onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Частота</InputLabel>
              <Select
                value={newHabit.frequency}
                label="Частота"
                onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value as Habit['frequency'] })}
              >
                <MenuItem value="daily">Ежедневно</MenuItem>
                <MenuItem value="weekly">Еженедельно</MenuItem>
                <MenuItem value="monthly">Ежемесячно</MenuItem>
              </Select>
            </FormControl>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Цвет
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {HABIT_COLORS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setNewHabit({ ...newHabit, color })}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: color,
                      cursor: 'pointer',
                      border: newHabit.color === color ? '3px solid #fff' : '3px solid transparent',
                      transition: 'border 0.2s',
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleAdd}>Создать</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать привычку</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Название"
              fullWidth
              value={editHabit?.title || ''}
              onChange={(e) => setEditHabit(editHabit ? { ...editHabit, title: e.target.value } : null)}
            />
            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={2}
              value={editHabit?.description || ''}
              onChange={(e) => setEditHabit(editHabit ? { ...editHabit, description: e.target.value } : null)}
            />
            <FormControl fullWidth>
              <InputLabel>Частота</InputLabel>
              <Select
                value={editHabit?.frequency || 'daily'}
                label="Частота"
                onChange={(e) => setEditHabit(editHabit ? { ...editHabit, frequency: e.target.value as Habit['frequency'] } : null)}
              >
                <MenuItem value="daily">Ежедневно</MenuItem>
                <MenuItem value="weekly">Еженедельно</MenuItem>
                <MenuItem value="monthly">Ежемесячно</MenuItem>
              </Select>
            </FormControl>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Цвет
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {HABIT_COLORS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setEditHabit(editHabit ? { ...editHabit, color } : null)}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: color,
                      cursor: 'pointer',
                      border: editHabit?.color === color ? '3px solid #fff' : '3px solid transparent',
                      transition: 'border 0.2s',
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleEditSave}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Удалить привычку?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={() => { const id = deleteConfirm; if (id === null) return; setDeleteConfirm(null); tasksApi.deleteHabit(id).then(() => fetchHabits()); }}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}
