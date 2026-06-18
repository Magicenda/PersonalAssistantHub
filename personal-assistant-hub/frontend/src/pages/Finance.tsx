import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  LinearProgress,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, Search, AccountBalance, Category, Description, CalendarMonth, Savings } from '@mui/icons-material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import { motion } from 'framer-motion';
import { financeApi, type Account, type Category, type Transaction, type Budget, type FinanceReport } from '../api/finance';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return value === index ? <motion.div variants={itemVariants} initial="hidden" animate="visible">{children}</motion.div> : null;
}

export default function Finance() {
  const [tabValue, setTabValue] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [txDialog, setTxDialog] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txAccountId, setTxAccountId] = useState<number | ''>('');
  const [txCategoryId, setTxCategoryId] = useState<number | ''>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [txSubmitting, setTxSubmitting] = useState(false);

  const [accountDialog, setAccountDialog] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', type: 'bank', balance: '', currency: 'RUB' });
  const [accountSubmitting, setAccountSubmitting] = useState(false);

  const [budgetDialog, setBudgetDialog] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category_id: '' as string | number, limit_amount: '', period: 'monthly' });
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);

  const [editAccountDialog, setEditAccountDialog] = useState(false);
  const [editAccountForm, setEditAccountForm] = useState<Account | null>(null);

  const [editTxDialog, setEditTxDialog] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const getCategoryName = (catId: number) => categories.find(c => c.id === catId)?.name || 'Без категории';

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      financeApi.getAccounts(),
      financeApi.getTransactions(),
      financeApi.getBudgets(),
      financeApi.getReports(),
      financeApi.getCategories(),
    ]).then(([a, t, b, r, c]) => {
      setAccounts(a.data);
      setTransactions(t.data || []);
      setBudgets(b.data);
      setReport(r.data);
      setCategories(c.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const resetTxForm = () => {
    setTxType('expense');
    setTxAmount('');
    setTxDescription('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxAccountId('');
    setTxCategoryId('');
  };

  const handleTxSubmit = async () => {
    if (!txAmount || !txAccountId) return;
    setTxSubmitting(true);
    try {
      await financeApi.createTransaction({
        account_id: txAccountId as number,
        category_id: txCategoryId || null,
        amount: parseFloat(txAmount),
        description: txDescription || '',
        transaction_type: txType,
        date: txDate,
      });
      setTxDialog(false);
      resetTxForm();
      fetchData();
    } catch (err: any) {
      console.error('Create tx error:', err);
    }
    setTxSubmitting(false);
  };

  const handleAccountSubmit = async () => {
    if (!accountForm.name) return;
    setAccountSubmitting(true);
    try {
      await financeApi.createAccount({ name: accountForm.name, type: accountForm.type, balance: parseFloat(accountForm.balance || '0'), currency: accountForm.currency });
      setAccountDialog(false);
      setAccountForm({ name: '', type: 'bank', balance: '', currency: 'RUB' });
      fetchData();
    } catch {}
    setAccountSubmitting(false);
  };

  const handleBudgetSubmit = async () => {
    if (!budgetForm.limit_amount || !budgetForm.category_id) return;
    setBudgetSubmitting(true);
    try {
      await financeApi.createBudget({ category_id: Number(budgetForm.category_id), limit_amount: parseFloat(budgetForm.limit_amount), period: budgetForm.period as 'monthly' });
      setBudgetDialog(false);
      setBudgetForm({ category_id: '', limit_amount: '', period: 'monthly' });
      fetchData();
    } catch {}
    setBudgetSubmitting(false);
  };

  const handleEditAccount = async () => {
    if (!editAccountForm || !editAccountForm.name) return;
    try {
      await financeApi.updateAccount(editAccountForm.id, {
        name: editAccountForm.name,
        type: editAccountForm.type,
        currency: editAccountForm.currency,
      });
      setEditAccountDialog(false);
      setEditAccountForm(null);
      fetchData();
    } catch {}
  };

  const handleEditTx = async () => {
    if (!editTx) return;
    try {
      await financeApi.updateTransaction(editTx.id, {
        amount: editTx.amount,
        description: editTx.description,
        category_id: editTx.category_id,
        date: editTx.date,
      });
      setEditTxDialog(false);
      setEditTx(null);
      fetchData();
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const filteredTransactions = transactions.filter((tx) =>
    (tx.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.category_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const pieData: { name: string; value: number }[] = [];
  const barData: { month: string; Доходы: number; Расходы: number }[] = [];

  const balanceHistory = accounts.length > 0
    ? [{ date: 'Текущий', balance: totalBalance }]
    : [];

  return (
    <motion.div initial="hidden" animate="visible" variants={itemVariants}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Финансы</Typography>

      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{ mb: 3, '& .MuiTabs-indicator': { borderRadius: 1 } }}
      >
        <Tab label="Счета" />
        <Tab label="Транзакции" />
        <Tab label="Бюджеты" />
        <Tab label="Графики" />
      </Tabs>

      {/* Accounts Tab */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Счета</Typography>
              <Button variant="contained" startIcon={<Add />} size="small" onClick={() => setAccountDialog(true)}>
                Добавить счёт
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Название</TableCell>
                    <TableCell>Тип</TableCell>
                    <TableCell align="right">Баланс</TableCell>
                    <TableCell>Валюта</TableCell>
                    <TableCell width={50}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell sx={{ fontWeight: 500 }}>{account.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={account.type === 'credit' ? 'Кредитная' : account.type === 'debit' ? 'Дебетовая' : account.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          sx={{ fontWeight: 600, color: account.balance >= 0 ? 'success.main' : 'error.main' }}
                        >
                          {account.balance.toLocaleString()} ₽
                        </Typography>
                      </TableCell>
                      <TableCell>{account.currency || 'RUB'}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => { setEditAccountForm(account); setEditAccountDialog(true); }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {accounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Нет счетов
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Transactions Tab */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Поиск транзакций..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ minWidth: 280 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
                  ),
                }}
              />
              <Button variant="contained" startIcon={<Add />} size="small" onClick={() => setTxDialog(true)}>
                Добавить
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Категория</TableCell>
                      <TableCell>Описание</TableCell>
                      <TableCell align="right">Сумма</TableCell>
                      <TableCell width={50}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{tx.date?.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Chip
                            label={tx.category_name || 'Без категории'}
                            size="small"
                            sx={{ bgcolor: tx.category_color ? `${tx.category_color}20` : undefined, color: tx.category_color || undefined }}
                          />
                        </TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{ fontWeight: 600, color: tx.transaction_type === 'income' ? 'success.main' : 'error.main' }}
                          >
                            {tx.transaction_type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} ₽
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => { setEditTx(tx); setEditTxDialog(true); }}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Нет транзакций
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Budgets Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" startIcon={<Add />} size="small" onClick={() => setBudgetDialog(true)}>
            Добавить бюджет
          </Button>
        </Box>
        <Grid container spacing={2}>
          {budgets.map((budget) => {
            const percent = budget.limit_amount > 0 ? Math.min((budget.spent_amount / budget.limit_amount) * 100, 100) : 0;
            const isOver = budget.spent_amount > budget.limit_amount;
            return (
              <Grid item xs={12} sm={6} md={4} key={budget.id}>
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {getCategoryName(budget.category_id)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(budget.spent_amount).toLocaleString()} / {Math.round(budget.limit_amount).toLocaleString()} ₽
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'rgba(148, 163, 184, 0.12)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: isOver ? 'error.main' : percent > 75 ? 'warning.main' : 'success.main',
                            borderRadius: 4,
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" color={isOver ? 'error.main' : 'text.secondary'}>
                          {percent.toFixed(0)}%
                        </Typography>
                        {isOver && (
                          <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                            Превышение!
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
          {budgets.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Нет бюджетов
              </Typography>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Charts Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Расходы по категориям
                </Typography>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: 8 }} />
                      <Legend />
                    </PieChart>
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
                  Доходы / Расходы по месяцам
                </Typography>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
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
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>Нет данных</Typography>
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
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={balanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
                    <YAxis stroke="#94A3B8" fontSize={12} />
                    <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="balance" stroke="#2563EB" strokeWidth={2} dot={{ fill: '#2563EB' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <Dialog open={txDialog} onClose={() => { setTxDialog(false); resetTxForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle>Новая транзакция</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Select
              value={txType}
              onChange={(e) => setTxType(e.target.value as 'income' | 'expense')}
              size="small"
              fullWidth
            >
              <MenuItem value="expense">Расход</MenuItem>
              <MenuItem value="income">Доход</MenuItem>
            </Select>
            <Select
              value={txAccountId}
              onChange={(e) => setTxAccountId(e.target.value === '' ? '' : Number(e.target.value))}
              size="small"
              fullWidth
              displayEmpty
            >
              <MenuItem value="" disabled>Выберите счёт</MenuItem>
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.name} ({a.balance.toLocaleString()} ₽)</MenuItem>
              ))}
            </Select>
            <Select
              value={txCategoryId}
              onChange={(e) => setTxCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
              size="small"
              fullWidth
              displayEmpty
            >
              <MenuItem value="">Без категории</MenuItem>
              {categories.filter((c) => c.type === txType).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
            <TextField
              label="Сумма"
              type="number"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start">₽</InputAdornment>,
              }}
            />
            <TextField
              label="Описание"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Дата"
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setTxDialog(false); resetTxForm(); }}>Отмена</Button>
          <Button variant="contained" onClick={handleTxSubmit} disabled={txSubmitting || !txAmount || !txAccountId}>
            {txSubmitting ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={accountDialog} onClose={() => setAccountDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новый счёт</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Название" fullWidth value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} />
            <Select value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })} size="small" fullWidth>
              <MenuItem value="bank">Банковский</MenuItem>
              <MenuItem value="cash">Наличные</MenuItem>
              <MenuItem value="card">Карта</MenuItem>
              <MenuItem value="savings">Сбережения</MenuItem>
            </Select>
            <TextField label="Начальный баланс" type="number" fullWidth value={accountForm.balance}
              onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">₽</InputAdornment> }} />
            <TextField label="Валюта" fullWidth value={accountForm.currency} onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccountDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleAccountSubmit} disabled={accountSubmitting || !accountForm.name}>
            {accountSubmitting ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={budgetDialog} onClose={() => setBudgetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новый бюджет</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Select value={budgetForm.category_id} onChange={(e) => setBudgetForm({ ...budgetForm, category_id: e.target.value })} size="small" fullWidth displayEmpty>
              <MenuItem value="" disabled>Выберите категорию</MenuItem>
              {categories.filter((c) => c.type === 'expense').map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
            <TextField label="Лимит" type="number" fullWidth value={budgetForm.limit_amount}
              onChange={(e) => setBudgetForm({ ...budgetForm, limit_amount: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">₽</InputAdornment> }} />
            <Select value={budgetForm.period} onChange={(e) => setBudgetForm({ ...budgetForm, period: e.target.value })} size="small" fullWidth>
              <MenuItem value="monthly">Ежемесячно</MenuItem>
              <MenuItem value="weekly">Еженедельно</MenuItem>
              <MenuItem value="yearly">Ежегодно</MenuItem>
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBudgetDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleBudgetSubmit} disabled={budgetSubmitting || !budgetForm.limit_amount || !budgetForm.category_id}>
            {budgetSubmitting ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editAccountDialog} onClose={() => setEditAccountDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать счёт</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Название" fullWidth value={editAccountForm?.name || ''}
              onChange={(e) => setEditAccountForm(editAccountForm ? { ...editAccountForm, name: e.target.value } : null)} />
            <Select value={editAccountForm?.type || 'bank'}
              onChange={(e) => setEditAccountForm(editAccountForm ? { ...editAccountForm, type: e.target.value } : null)}
              size="small" fullWidth>
              <MenuItem value="bank">Банковский</MenuItem>
              <MenuItem value="cash">Наличные</MenuItem>
              <MenuItem value="card">Карта</MenuItem>
              <MenuItem value="savings">Сбережения</MenuItem>
            </Select>
            <TextField label="Валюта" fullWidth value={editAccountForm?.currency || 'RUB'}
              onChange={(e) => setEditAccountForm(editAccountForm ? { ...editAccountForm, currency: e.target.value } : null)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAccountDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleEditAccount}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editTxDialog} onClose={() => setEditTxDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать транзакцию</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Select
              value={editTx?.transaction_type || 'expense'}
              onChange={(e) => setEditTx(editTx ? { ...editTx, transaction_type: e.target.value as 'income' | 'expense' } : null)}
              size="small" fullWidth
            >
              <MenuItem value="expense">Расход</MenuItem>
              <MenuItem value="income">Доход</MenuItem>
            </Select>
            <Select
              value={editTx?.category_id || ''}
              onChange={(e) => setEditTx(editTx ? { ...editTx, category_id: e.target.value === '' ? null : Number(e.target.value) } : null)}
              size="small" fullWidth displayEmpty
            >
              <MenuItem value="">Без категории</MenuItem>
              {categories.filter((c) => c.type === editTx?.transaction_type).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
            <TextField label="Сумма" type="number" value={editTx?.amount || ''}
              onChange={(e) => setEditTx(editTx ? { ...editTx, amount: parseFloat(e.target.value) || 0 } : null)}
              fullWidth InputProps={{ startAdornment: <InputAdornment position="start">₽</InputAdornment> }} />
            <TextField label="Описание" value={editTx?.description || ''}
              onChange={(e) => setEditTx(editTx ? { ...editTx, description: e.target.value } : null)}
              fullWidth multiline rows={2} />
            <TextField label="Дата" type="date" value={editTx?.date?.slice(0, 10) || ''}
              onChange={(e) => setEditTx(editTx ? { ...editTx, date: e.target.value } : null)}
              fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTxDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleEditTx}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}
