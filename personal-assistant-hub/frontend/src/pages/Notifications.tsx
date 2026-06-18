import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Button,
  Divider,
} from '@mui/material';
import {
  Notifications as NotifIcon,
  Info,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Delete,
  DoneAll,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import client from '../api/client';

dayjs.extend(relativeTime);
dayjs.locale('ru');

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG = {
  info: { icon: <Info />, color: '#2563EB', label: 'Инфо' },
  warning: { icon: <Warning />, color: '#F59E0B', label: 'Предупреждение' },
  error: { icon: <ErrorIcon />, color: '#EF4444', label: 'Ошибка' },
  success: { icon: <CheckCircle />, color: '#10B981', label: 'Успех' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = () => {
    setLoading(true);
    client.get('/notification/api/notifications')
      .then((r) => {
        setNotifications(r.data.results || r.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await client.patch(`/notification/api/notifications/${id}`, { is_read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await client.post('/notification/api/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleDelete = async (id: number) => {
    try {
      await client.delete(`/notification/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Уведомления</Typography>
          {unreadCount > 0 && (
            <Chip label={unreadCount} color="primary" size="small" sx={{ fontWeight: 600 }} />
          )}
        </Box>
        {unreadCount > 0 && (
          <Button
            startIcon={<DoneAll />}
            size="small"
            onClick={handleMarkAllRead}
          >
            Прочитать все
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {notifications.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <NotifIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Нет уведомлений
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Здесь будут появляться уведомления о задачах, платежах и других событиях
              </Typography>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
            return (
              <motion.div key={notif.id} variants={itemVariants}>
                <Card
                  sx={{
                    borderLeft: `4px solid ${config.color}`,
                    opacity: notif.is_read ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <CardContent sx={{ py: 2, px: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ color: config.color, mt: 0.3 }}>
                        {config.icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {notif.title}
                            </Typography>
                            <Chip
                              label={config.label}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 10,
                                fontWeight: 600,
                                bgcolor: `${config.color}20`,
                                color: config.color,
                              }}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(notif.created_at).fromNow()}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {notif.message}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {!notif.is_read && (
                          <IconButton size="small" onClick={() => handleMarkRead(notif.id)}>
                            <DoneAll fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton size="small" onClick={() => handleDelete(notif.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </Box>
    </motion.div>
  );
}
