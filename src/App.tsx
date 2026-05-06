import React, { useState, useEffect } from 'react';
import { 
  FileText,
  Calendar,
  Layers,
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Search, 
  Filter, 
  MoreHorizontal,
  ArrowUpDown,
  ChevronRight,
  Plus,
  LayoutDashboard,
  PieChart,
  Target,
  Sparkles,
  Download,
  Smartphone,
  Apple,
  AppWindow,
  LogOut,
  User as UserIcon,
  Activity,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';
import { auth, db, signIn, logOut } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { MOCK_APPS, CATEGORIES } from './constants';
import { AppData, Report } from './types';
import { cn } from './lib/utils';
import { getAIInsight, MarketInsight } from './services/geminiService';

const MOCK_REPORTS: Report[] = [
  { id: 'RPT-001', name: 'Global Revenue Synthesis', category: 'Finance', date: '2024-03-15', metrics: ['Revenue', 'LTV'] },
  { id: 'RPT-002', name: 'Market Penetration Deep Dive', category: 'Productivity', date: '2024-03-20', metrics: ['Downloads', 'DAU'] },
  { id: 'RPT-003', name: 'User Retention Benchmarking', category: 'Entertainment', date: '2024-04-01', metrics: ['Retention', 'Engagement'] },
  { id: 'RPT-004', name: 'Q3 Growth Velocity Analysis', category: 'All', date: '2024-04-10', metrics: ['Revenue', 'Growth'] }
];

// --- Shared Components ---

const StatCard = ({ title, value, change, icon: Icon, color }: { title: string, value: string, change: string, icon: any, color: string }) => (
  <div className="bg-[var(--app-card-bg)] border border-[var(--app-border)] p-6 rounded-xl group hover:border-teal-500/50 transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-2 rounded-lg bg-[var(--app-bg)]", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={cn(
        "text-[10px] font-mono font-bold uppercase tracking-widest",
        change.startsWith('+') ? "text-teal-400" : "text-rose-400"
      )}>{change}</span>
    </div>
    <h3 className="text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--app-text-muted)] mb-1">{title}</h3>
    <p className="text-2xl font-mono tracking-tight font-bold text-[var(--app-text)]">{value}</p>
  </div>
);

// --- Main Application ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchSearching, setIsSearchSearching] = useState(false);
  const [insight, setInsight] = useState<MarketInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [view, setView] = useState<'dashboard' | 'competitive' | 'insights' | 'reporting'>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  // Filtering & Sorting State
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [revenueRange, setRevenueRange] = useState({ min: 0, max: 10000000 });
  const [sortBy, setSortBy] = useState<'revenue' | 'downloads' | 'dau' | 'retention'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [reportConfig, setReportConfig] = useState({
    dateRange: 'last7',
    category: 'All',
    metrics: ['revenue', 'downloads', 'engagement']
  });

  const [realTimeMetrics, setRealTimeMetrics] = useState({
    liveDau: 18542012,
    liveRevenue: 4210500,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeMetrics(prev => ({
        liveDau: prev.liveDau + Math.floor(Math.random() * 100) - 40,
        liveRevenue: prev.liveRevenue + Math.random() * 50
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const [notification, setNotification] = useState<string | null>(null);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const filteredApps = MOCK_APPS.filter(app => {
    const matchesCat = selectedCategory === 'All' || app.category === selectedCategory;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = selectedPlatform === 'All' || app.platform === selectedPlatform.toLowerCase();
    const matchesRevenue = app.revenue >= revenueRange.min && app.revenue <= revenueRange.max;
    return matchesCat && matchesSearch && matchesPlatform && matchesRevenue;
  }).sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    return sortOrder === 'desc' ? valB - valA : valA - valB;
  });

  const globalSearchResults = searchQuery.length > 1 ? {
    apps: MOCK_APPS.filter(app => 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      app.category.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 4),
    categories: CATEGORIES.filter(cat => 
      cat.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    reports: MOCK_REPORTS.filter(rpt => 
      rpt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rpt.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
  } : null;

  const generateAIInsight = async () => {
    setLoadingInsight(true);
    // If user has specifically selected apps, use those. Otherwise use top 5 filtered results.
    const selectedApps = MOCK_APPS.filter(app => selectedAppIds.includes(app.id));
    const data = selectedApps.length > 0 ? selectedApps : filteredApps.slice(0, 5);
    const res = await getAIInsight(data);
    setInsight(res);
    setLoadingInsight(false);
    setView('insights');
  };

  const toggleAppSelection = (id: string) => {
    setSelectedAppIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const chartData = [
    { name: 'Mon', revenue: 4000, users: 2400 },
    { name: 'Tue', revenue: 3000, users: 1398 },
    { name: 'Wed', revenue: 2000, users: 9800 },
    { name: 'Thu', revenue: 2780, users: 3908 },
    { name: 'Fri', revenue: 1890, users: 4800 },
    { name: 'Sat', revenue: 2390, users: 3800 },
    { name: 'Sun', revenue: 3490, users: 4300 },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[var(--app-card-bg)] border border-[var(--app-border)] p-10 rounded-2xl text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-teal-500/20 rotate-3">
            <BarChart3 className="text-zinc-950 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-sans font-bold mb-2 tracking-tight uppercase text-[var(--app-text)]">AppPulse</h1>
          <p className="text-sm font-sans mb-10 text-[var(--app-text-muted)] font-medium">Market Intelligence Architecture</p>
          <button 
            onClick={signIn}
            className="w-full py-4 bg-teal-500 text-zinc-950 font-sans font-bold text-xs uppercase tracking-[0.2em] hover:bg-teal-400 transition-all flex items-center justify-center gap-3 rounded-xl shadow-lg shadow-teal-500/10"
          >
            Enter Platform
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] font-sans selection:bg-teal-500/30">
      {/* Sidebar / Nav Rail - Desktop */}
      <div className="hidden md:flex fixed left-0 top-0 h-screen w-20 bg-[var(--app-card-bg)] border-r border-[var(--app-border)] flex-col items-center py-10 z-50">
        <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center mb-16 cursor-pointer shadow-lg shadow-teal-500/20" onClick={() => setView('dashboard')}>
          <BarChart3 className="text-zinc-950 w-6 h-6" />
        </div>
        
        <nav className="flex-1 flex flex-col gap-10">
          <button onClick={() => setView('dashboard')} className={cn("p-3 rounded-xl transition-all", view === 'dashboard' ? 'bg-teal-500 text-zinc-950 shadow-lg shadow-teal-500/20' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]')}>
            <LayoutDashboard className="w-6 h-6" />
          </button>
          <button onClick={() => setView('competitive')} className={cn("p-3 rounded-xl transition-all", view === 'competitive' ? 'bg-teal-500 text-zinc-950 shadow-lg shadow-teal-500/20' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]')}>
            <Target className="w-6 h-6" />
          </button>
          <button onClick={() => setView('reporting')} className={cn("p-3 rounded-xl transition-all", view === 'reporting' ? 'bg-teal-500 text-zinc-950 shadow-lg shadow-teal-500/20' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]')}>
            <FileText className="w-6 h-6" />
          </button>
          <button onClick={generateAIInsight} className={cn("p-3 rounded-xl transition-all", view === 'insights' ? 'bg-teal-500 text-zinc-950 shadow-lg shadow-teal-500/20' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]')}>
            <Sparkles className="w-6 h-6" />
          </button>
        </nav>

        <button onClick={logOut} className="p-3 text-[var(--app-text-muted)] hover:text-rose-400 transition-colors">
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--app-card-bg)] border-t border-[var(--app-border)] flex items-center justify-around px-2 z-50">
        <button onClick={() => setView('dashboard')} className={cn("p-2 rounded-xl transition-all", view === 'dashboard' ? 'text-teal-400' : 'text-[var(--app-text-muted)]')}>
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button onClick={() => setView('competitive')} className={cn("p-2 rounded-xl transition-all", view === 'competitive' ? 'text-teal-400' : 'text-[var(--app-text-muted)]')}>
          <Target className="w-6 h-6" />
        </button>
        <button onClick={generateAIInsight} className={cn("p-2 rounded-xl transition-all", view === 'insights' ? 'text-teal-400' : 'text-[var(--app-text-muted)]')}>
          <Sparkles className="w-6 h-6" />
        </button>
        <button onClick={() => setView('reporting')} className={cn("p-2 rounded-xl transition-all", view === 'reporting' ? 'text-teal-400' : 'text-[var(--app-text-muted)]')}>
          <FileText className="w-6 h-6" />
        </button>
        <button onClick={logOut} className="p-2 text-rose-400">
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      <main className="md:pl-20 pb-20 md:pb-0">
        <header className="h-16 md:h-20 bg-[var(--app-bg)] border-b border-[var(--app-border)] flex items-center justify-between px-4 md:px-10 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 bg-teal-500 rounded flex items-center justify-center cursor-pointer shadow-lg shadow-teal-500/20" onClick={() => setView('dashboard')}>
              <BarChart3 className="text-zinc-950 w-5 h-5" />
            </div>
            <h2 className="text-sm md:text-lg font-bold uppercase tracking-widest text-[var(--app-text-muted)] whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] sm:max-w-none">
              {view === 'dashboard' && 'Market Ops'}
              {view === 'competitive' && 'Matrix'}
              {view === 'insights' && 'AI Core'}
              {view === 'reporting' && 'Reports'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-8">
            <div className="hidden sm:relative sm:group sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-[var(--app-text-muted)] border-none" />
              <input 
                type="text" 
                placeholder="Global Search..." 
                value={searchQuery}
                onFocus={() => setIsSearchSearching(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[var(--app-card-bg)] h-9 md:h-10 pl-10 pr-4 text-[10px] md:text-xs font-mono focus:outline-none border border-[var(--app-border)] focus:border-teal-500/50 transition-all w-32 md:w-48 lg:focus:w-64 rounded-xl text-[var(--app-text)]"
              />

              <AnimatePresence>
                {isSearchSearching && searchQuery.length > 1 && (
                  <>
                    <div 
                      className="fixed inset-0 z-[-1]" 
                      onClick={() => setIsSearchSearching(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      className="absolute top-12 left-0 w-80 bg-[var(--app-card-bg)] border border-[var(--app-border)] rounded-2xl shadow-2xl overflow-hidden z-[60] backdrop-blur-xl"
                    >
                      <div className="p-4 border-b border-[var(--app-border)] bg-[var(--app-bg)]/50">
                        <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-teal-400">Intelligence Index Search</span>
                      </div>
                      
                      <div className="max-h-[400px] overflow-y-auto p-2 space-y-4">
                        {globalSearchResults?.apps.length! > 0 && (
                          <div className="space-y-2">
                            <div className="px-3 text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">Applications</div>
                            {globalSearchResults?.apps.map(app => (
                              <button 
                                key={app.id}
                                onClick={() => {
                                  setSelectedCategory(app.category);
                                  setView('dashboard');
                                  setIsSearchSearching(false);
                                  setSearchQuery('');
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-teal-500/10 text-left transition-all group"
                              >
                                <div className="w-8 h-8 bg-[var(--app-bg)] rounded-lg flex items-center justify-center border border-[var(--app-border)] group-hover:border-teal-500/30">
                                  <AppWindow className="w-4 h-4 text-[var(--app-text-muted)]" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-[var(--app-text)]">{app.name}</div>
                                  <div className="text-[8px] font-mono text-[var(--app-text-muted)] uppercase tracking-widest">{app.category}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {globalSearchResults?.categories.length! > 0 && (
                          <div className="space-y-2">
                            <div className="px-3 text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">Segments</div>
                            <div className="flex flex-wrap gap-1 px-3">
                              {globalSearchResults?.categories.map(cat => (
                                <button 
                                  key={cat}
                                  onClick={() => {
                                    setSelectedCategory(cat);
                                    setView('dashboard');
                                    setIsSearchSearching(false);
                                    setSearchQuery('');
                                  }}
                                  className="px-2 py-1 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-md text-[8px] font-bold text-[var(--app-text-muted)] hover:text-teal-400 hover:border-teal-500/30 transition-all"
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {globalSearchResults?.reports.length! > 0 && (
                          <div className="space-y-2">
                            <div className="px-3 text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">Reports</div>
                            {globalSearchResults?.reports.map(rpt => (
                              <button 
                                key={rpt.id}
                                onClick={() => {
                                  setView('reporting');
                                  setIsSearchSearching(false);
                                  setSearchQuery('');
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-teal-500/10 text-left transition-all group"
                              >
                                <div className="w-8 h-8 bg-[var(--app-bg)] rounded-lg flex items-center justify-center border border-[var(--app-border)] group-hover:border-teal-500/30">
                                  <FileText className="w-4 h-4 text-teal-400" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-[var(--app-text)]">{rpt.name}</div>
                                  <div className="text-[8px] font-mono text-[var(--app-text-muted)] uppercase tracking-widest">{rpt.date}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {(!globalSearchResults?.apps.length && !globalSearchResults?.categories.length && !globalSearchResults?.reports.length) && (
                          <div className="p-8 text-center">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)] opacity-50">Null Vector Detected</div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2 md:gap-4 sm:border-l sm:border-[var(--app-border)] sm:pl-4 md:pl-8">
              <button 
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                className="p-2 md:p-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)]/50 text-[var(--app-text-muted)] hover:text-teal-400 transition-all"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5 text-zinc-900" />}
              </button>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text)]">{user.displayName?.split(' ')[0]}</span>
                <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-teal-400">BI Active</span>
              </div>
              <img src={user.photoURL || ''} className="w-8 h-8 md:w-10 md:h-10 rounded-xl border border-[var(--app-border)] overflow-hidden" alt="Avatar" />
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <AnimatePresence>
            {notification && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="fixed bottom-8 right-8 bg-[#141414] text-white px-6 py-3 font-mono text-[10px] uppercase tracking-widest z-[100] border border-white/10 shadow-2xl"
              >
                {notification}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  <StatCard title="Est. Revenue" value={`$${(realTimeMetrics.liveRevenue / 1000000).toFixed(2)}B`} change="+14.2%" icon={DollarSign} color="text-teal-400" />
                  <StatCard title="Live DAU" value={`${(realTimeMetrics.liveDau / 1000000).toFixed(1)}M`} change="+2.1%" icon={Users} color="text-teal-400" />
                  <StatCard title="iOS MRR" value={`$${((realTimeMetrics.liveRevenue * 0.62) / 1000).toFixed(0)}k`} change="+3.2%" icon={Apple} color="text-teal-400" />
                  <StatCard title="Android" value={`$${((realTimeMetrics.liveRevenue * 0.38) / 1000).toFixed(0)}k`} change="-0.8%" icon={Smartphone} color="text-rose-400" />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 bg-[var(--app-card-bg)] border border-[var(--app-border)] p-10 rounded-2xl">
                    <div className="flex justify-between items-start mb-10">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--app-text)]">App Lifecycle Revenue</h3>
                        <p className="text-[10px] uppercase tracking-widest text-[var(--app-text-muted)] mt-1 font-bold">Real-time Top 50 Global Apps</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-4 py-1.5 bg-[var(--app-bg)] text-[var(--app-text-muted)] text-[10px] font-bold uppercase tracking-widest rounded-lg border border-[var(--app-border)]">Monthly</button>
                        <button className="px-4 py-1.5 bg-teal-500 text-zinc-950 text-[10px] font-bold uppercase tracking-widest rounded-lg">Quarterly</button>
                      </div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-border)" opacity={0.5} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--app-text-muted)' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--app-text-muted)' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-border)', borderRadius: '12px' }}
                            itemStyle={{ color: '#14b8a6', fontSize: '10px', textTransform: 'uppercase', fontFamily: 'monospace' }}
                            labelStyle={{ color: 'var(--app-text)', fontSize: '10px', marginBottom: '8px', opacity: 0.5 }}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#14b8a6" fillOpacity={1} fill="url(#colorTeal)" strokeWidth={3} />
                          <Area type="monotone" dataKey="users" stroke="var(--app-text-muted)" fill="transparent" strokeWidth={1} strokeDasharray="5 5" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[var(--app-card-bg)] border border-[var(--app-border)] p-10 rounded-2xl">
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--app-text)] mb-10">Market Segmentation</h3>
                    <div className="flex flex-col justify-between h-64">
                       <div className="space-y-8">
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <Apple className="w-4 h-4 text-[var(--app-text)]" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">iOS High-Net</span>
                            </div>
                            <span className="text-[10px] font-mono tracking-widest text-teal-400">64%</span>
                          </div>
                          <div className="h-1.5 bg-[var(--app-bg)] w-full rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: '64%' }} className="h-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]" />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-[var(--app-text-muted)]" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">Android Open</span>
                            </div>
                            <span className="text-[10px] font-mono tracking-widest text-[var(--app-text-muted)]">18%</span>
                          </div>
                          <div className="h-1.5 bg-[var(--app-bg)] w-full rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: '18%' }} className="h-full bg-zinc-600" />
                          </div>
                        </div>
                       </div>
                       <div className="mt-auto pt-8 border-t border-[var(--app-border)]">
                         <div className="flex flex-wrap gap-2">
                           {['APAC', 'Tier 1', 'Mobile-First', 'Gen Z'].map(tag => (
                             <span key={tag} className="px-2 py-1 bg-[var(--app-bg)] rounded text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">{tag}</span>
                           ))}
                         </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Market Grid Table */}
                <div className="bg-[var(--app-card-bg)] border border-[var(--app-border)] rounded-2xl overflow-hidden">
                  <div className="p-4 md:p-8 border-b border-[var(--app-border)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-2 md:gap-6">
                      {['All', ...CATEGORIES.slice(0, 4)].map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={cn(
                            "px-3 md:px-4 py-1.5 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] transition-all rounded-lg",
                            selectedCategory === cat ? "bg-teal-500 text-zinc-950 shadow-lg shadow-teal-500/10" : "text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-bg)]"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => triggerNotification("Exporting core dataset as CSV...")}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
                    >
                      <Download className="w-4 h-4" /> Export
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[var(--app-bg)]/50 border-b border-[var(--app-border)]">
                        <tr>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-text-muted)]">Resource Identity</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-text-muted)]">Platform</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-text-muted)]">Net Revenue</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-text-muted)]">Active Users</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-text-muted)]">Retention</th>
                          <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-text-muted)]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--app-border)]">
                        {filteredApps.map((app) => (
                          <motion.tr 
                            layout
                            key={app.id} 
                            onClick={() => toggleAppSelection(app.id)}
                            className={cn(
                              "group cursor-pointer transition-all duration-200",
                              selectedAppIds.includes(app.id) 
                                ? "bg-teal-500/10 border-l-2 border-l-teal-500" 
                                : "hover:bg-teal-500/5"
                            )}
                          >
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-12 h-12 bg-[var(--app-bg)] rounded-xl border flex items-center justify-center overflow-hidden transition-colors",
                                  selectedAppIds.includes(app.id) ? "border-teal-500 shadow-lg shadow-teal-500/10" : "border-[var(--app-border)] group-hover:border-teal-500/30"
                                )}>
                                  {selectedAppIds.includes(app.id) ? (
                                    <Sparkles className="w-6 h-6 text-teal-400" />
                                  ) : null}
                                </div>
                                <div>
                                  <div className="text-sm font-bold tracking-tight text-[var(--app-text)]">{app.name}</div>
                                  <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--app-text-muted)] group-hover:text-teal-400 transition-colors">{app.category}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              {app.platform === 'ios' ? <Apple className="w-5 h-5 text-[var(--app-text-muted)]" /> : <Smartphone className="w-5 h-5 text-[var(--app-text-muted)]" />}
                            </td>
                            <td className="px-8 py-6 font-mono text-sm tracking-tighter text-[var(--app-text)]">${(app.revenue / 1000).toFixed(0)}k</td>
                            <td className="px-8 py-6 font-mono text-sm tracking-tighter text-[var(--app-text)]">{(app.dau / 1000).toFixed(0)}k</td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <span className={cn("text-xs font-bold font-mono tracking-widest", app.retention > 40 ? "text-teal-400" : "text-amber-400")}>{app.retention}%</span>
                                <div className="w-16 h-1 bg-[var(--app-bg)] rounded-full overflow-hidden">
                                  <div className={cn("h-full", app.retention > 40 ? "bg-teal-500" : "bg-amber-500")} style={{ width: `${app.retention}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className={cn(
                                "px-3 py-1 text-[8px] font-bold uppercase tracking-[0.2em] rounded border",
                                app.lifecycleStage === 'growth' ? "border-teal-500/30 text-teal-400 bg-teal-500/5" : 
                                app.lifecycleStage === 'mature' ? "border-indigo-500/30 text-indigo-400 bg-indigo-500/5" : 
                                "border-[var(--app-border)] text-[var(--app-text-muted)]"
                              )}>
                                {app.lifecycleStage}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'competitive' && (
              <motion.div 
                key="competitive"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                {/* Advanced Filtering bar */}
                <div className="bg-[var(--app-card-bg)] border border-[var(--app-border)] p-6 rounded-2xl flex flex-wrap items-center gap-6 shadow-xl">
                  <div className="flex items-center gap-3">
                    <Filter className="w-4 h-4 text-teal-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">Refine Intelligence</span>
                  </div>
                  
                  <div className="h-4 w-px bg-[var(--app-border)]" />

                  <div className="flex gap-2">
                    {['All', 'iOS', 'Android'].map(p => (
                      <button 
                        key={p}
                        onClick={() => setSelectedPlatform(p)}
                        className={cn(
                          "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                          selectedPlatform === p ? "bg-teal-500 text-zinc-950" : "bg-[var(--app-bg)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <div className="h-4 w-px bg-[var(--app-border)]" />

                  <div className="flex items-center gap-4">
                    <Layers className="w-3 h-3 text-[var(--app-text-muted)]" />
                    <select 
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-[var(--app-text)] focus:outline-none cursor-pointer"
                    >
                      <option value="All" className="bg-[var(--app-card-bg)]">All Segments</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="bg-[var(--app-card-bg)]">{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="h-4 w-px bg-[var(--app-border)]" />

                  <div className="flex items-center gap-4">
                    <ArrowUpDown className="w-3 h-3 text-[var(--app-text-muted)]" />
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-[var(--app-text)] focus:outline-none cursor-pointer"
                    >
                      <option value="revenue" className="bg-[var(--app-card-bg)]">Sort by Revenue</option>
                      <option value="downloads" className="bg-[var(--app-card-bg)]">Sort by Downloads</option>
                      <option value="dau" className="bg-[var(--app-card-bg)]">Sort by DAU</option>
                      <option value="retention" className="bg-[var(--app-card-bg)]">Sort by Retention</option>
                    </select>
                    <button 
                      onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                      className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)] hover:text-teal-400"
                    >
                      {sortOrder === 'desc' ? 'High to Low' : 'Low to High'}
                    </button>
                  </div>

                  <div className="ml-auto flex items-center gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)] px-2">Revenue Floor:</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="3000000" 
                      step="100000"
                      value={revenueRange.min}
                      onChange={(e) => setRevenueRange(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                      className="w-24 accent-teal-500 h-1 bg-[var(--app-border)] rounded-full cursor-pointer h-1"
                    />
                    <span className="text-[10px] font-mono text-[var(--app-text-muted)] w-12 text-right">${(revenueRange.min / 1000).toFixed(0)}k</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[var(--app-card-bg)] border border-[var(--app-border)] p-6 md:p-10 rounded-2xl gap-6">
                  <div>
                    <h3 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-tight text-[var(--app-text)]">Competitive Matrix</h3>
                    <p className="text-xs md:text-sm text-[var(--app-text-muted)] mt-2 font-medium">Select apps below to target Cognitive Synthesis.</p>
                  </div>
                  <button className="w-full md:w-auto bg-teal-500 text-zinc-950 px-8 py-4 font-bold rounded-xl text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-teal-500/10">
                    <Plus className="w-5 h-5" /> Compare New Set
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="bg-[var(--app-card-bg)] border border-[var(--app-border)] p-10 rounded-2xl">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--app-text-muted)] mb-10">Revenue Distribution (USD)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredApps.slice(0, 5)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-border)" opacity={0.5} />
                          <XAxis dataKey="name" hide />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--app-text-muted)' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-border)', borderRadius: '12px' }}
                            itemStyle={{ color: '#14b8a6', fontSize: '10px' }}
                          />
                          <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                            {filteredApps.slice(0, 5).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#14b8a6' : 'var(--app-border)'} stroke={index === 0 ? 'transparent' : 'var(--app-text-muted)'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-[var(--app-card-bg)] border border-[var(--app-border)] p-10 rounded-2xl">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--app-text-muted)] mb-10">Retention Variance (%)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredApps.map(a => ({ name: a.name, val: a.retention }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-border)" opacity={0.5} />
                          <XAxis dataKey="name" hide />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--app-text-muted)' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--app-card-bg)', border: '1px solid var(--app-border)', borderRadius: '12px' }}
                            itemStyle={{ color: '#14b8a6', fontSize: '10px' }}
                          />
                          <Area type="step" dataKey="val" stroke="#14b8a6" fill="rgba(20, 184, 166, 0.05)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {filteredApps.slice(0, 3).map(app => (
                    <div 
                      key={app.id} 
                      onClick={() => toggleAppSelection(app.id)}
                      className={cn(
                        "p-8 rounded-2xl group transition-all cursor-pointer border",
                        selectedAppIds.includes(app.id)
                          ? "bg-teal-500/5 border-teal-500 shadow-xl shadow-teal-500/10"
                          : "bg-[var(--app-card-bg)] border-[var(--app-border)] hover:border-teal-500/30"
                      )}
                    >
                      <div className="flex items-center gap-4 mb-8">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl border flex items-center justify-center transition-colors",
                          selectedAppIds.includes(app.id) ? "bg-teal-500/10 border-teal-500" : "bg-[var(--app-bg)] border-[var(--app-border)]"
                        )}>
                          {selectedAppIds.includes(app.id) ? <Sparkles className="w-6 h-6 text-teal-400" /> : null}
                        </div>
                        <div>
                          <h4 className="font-bold tracking-tight text-[var(--app-text)] uppercase text-sm">{app.name}</h4>
                          <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-[var(--app-text-muted)]">{app.platform} Node</span>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
                          <span>Intelligence Score</span>
                          <span className="text-teal-400">8.4 / 10</span>
                        </div>
                        <div className="h-2 bg-[var(--app-bg)] w-full rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.3)]" style={{ width: '84%' }} />
                        </div>
                        <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-[var(--app-border)]">
                          <div>
                            <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-muted)] mb-2">Market Loc</div>
                            <div className="text-[10px] font-mono text-[var(--app-text)]">Global S1</div>
                          </div>
                          <div>
                            <div className="text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-muted)] mb-2">Velo Index</div>
                            <div className="text-[10px] font-mono text-teal-400">+4.2 pts</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {view === 'reporting' && (
              <motion.div 
                key="reporting"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-10"
              >
                <div className="bg-[var(--app-card-bg)] border border-[var(--app-border)] p-10 rounded-2xl">
                  <h3 className="text-xl font-bold uppercase tracking-tight mb-8">Report Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-text-muted)] flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Temporal Range
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {['Last 24 Hours', 'Last 7 Days', 'Q3 Archive', 'Year to Date'].map(range => (
                          <button 
                            key={range}
                            onClick={() => setReportConfig(prev => ({ ...prev, dateRange: range }))}
                            className={cn(
                              "text-left px-4 py-3 text-xs font-mono tracking-widest rounded-xl border transition-all",
                              reportConfig.dateRange === range ? "bg-teal-500 text-zinc-950 border-teal-500" : "bg-[var(--app-bg)] text-[var(--app-text-muted)] border-[var(--app-border)] hover:border-teal-500/30"
                            )}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-text-muted)] flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Market Segment
                      </label>
                      <select 
                        value={reportConfig.category}
                        onChange={(e) => setReportConfig(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-4 py-3 text-xs font-mono tracking-widest text-[var(--app-text)] focus:outline-none focus:border-teal-500"
                      >
                        <option value="All">Global Market</option>
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <p className="text-[10px] text-[var(--app-text-muted)] font-medium">Filtering by segment isolates competitive variance and localized growth trends.</p>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-text-muted)] flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Telemetry Metrics
                      </label>
                      <div className="flex flex-wrap gap-2 text-[var(--app-text)]">
                        {['Revenue', 'Downloads', 'DAU', 'Retention', 'LTV'].map(metric => (
                           <label key={metric} className="flex items-center gap-2 bg-[var(--app-bg)] border border-[var(--app-border)] px-3 py-2 rounded-lg cursor-pointer hover:border-teal-500/30 transition-colors">
                              <input 
                                type="checkbox" 
                                checked={reportConfig.metrics.includes(metric)}
                                onChange={(e) => {
                                  if (e.target.checked) setReportConfig(prev => ({ ...prev, metrics: [...prev.metrics, metric] }));
                                  else setReportConfig(prev => ({ ...prev, metrics: prev.metrics.filter(m => m !== metric) }));
                                }}
                                className="accent-teal-500"
                              />
                              <span className="text-[10px] font-bold uppercase tracking-widest">{metric}</span>
                           </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-12 flex justify-end">
                    <button 
                      onClick={() => triggerNotification("Synthesizing custom intelligence dataset...")}
                      className="bg-teal-500 text-zinc-950 px-10 py-4 font-bold rounded-xl text-xs uppercase tracking-[0.2em] shadow-lg shadow-teal-500/10 hover:bg-teal-400"
                    >
                      Process Report
                    </button>
                  </div>
                </div>

                <div className="bg-[var(--app-card-bg)] border border-[var(--app-border)] rounded-2xl overflow-hidden">
                   <div className="p-8 border-b border-[var(--app-border)] flex justify-between items-center bg-[var(--app-bg)]/50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-teal-400" />
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.3em]">Generated Intelligence Feed</h4>
                      </div>
                      <div className="text-[10px] font-mono text-[var(--app-text-muted)]">
                         FORMAT: CSV / PDF / JSON
                      </div>
                   </div>
                   <div className="p-8">
                      <div className="space-y-6">
                        {MOCK_REPORTS.filter(r => reportConfig.category === 'All' || r.category === reportConfig.category).map((rpt, i) => (
                          <div key={rpt.id} className="flex items-start justify-between p-6 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl group hover:border-teal-500/30 transition-all">
                            <div className="flex gap-6">
                              <div className="w-12 h-12 bg-[var(--app-card-bg)] flex items-center justify-center rounded-xl border border-[var(--app-border)] font-mono text-[var(--app-text-muted)]">
                                0{i + 1}
                              </div>
                              <div>
                                <h5 className="font-bold text-sm text-[var(--app-text)] uppercase tracking-tight">{rpt.name}</h5>
                                <p className="text-[10px] text-[var(--app-text-muted)] mt-1 font-medium italic">Includes {rpt.metrics.join(', ')} telemetry</p>
                                <div className="mt-4 flex items-center gap-4">
                                  <span className="text-[8px] font-bold uppercase tracking-widest bg-[var(--app-card-bg)] px-2 py-0.5 rounded text-[var(--app-text-muted)]">Stable Build</span>
                                  <span className="text-[8px] font-mono text-[var(--app-text-muted)] opacity-50">ID: {rpt.id}</span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => triggerNotification("Extracting finalized report to local storage...")}
                              className="p-3 bg-[var(--app-card-bg)] rounded-xl text-[var(--app-text-muted)] hover:text-teal-400 hover:bg-[var(--app-bg)] transition-all"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {view === 'insights' && (
              <motion.div 
                key="insights"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                    <div className="bg-teal-500 md:p-16 p-8 text-zinc-950 rounded-3xl relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-950/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 relative z-10 gap-6">
                        <div className="flex items-center gap-4 font-bold uppercase tracking-[0.4em] text-[10px]">
                          <Sparkles className="w-6 h-6" />
                          <span>OmniSight Cognitive Synthesis</span>
                        </div>
                        {selectedAppIds.length > 0 && (
                          <div className="bg-zinc-950/10 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-zinc-950/20">
                            Analyzing {selectedAppIds.length} Targeted Points
                          </div>
                        )}
                      </div>
                      
                      {loadingInsight ? (
                        <div className="space-y-8 relative z-10">
                          <div className="h-12 bg-zinc-950/10 w-3/4 rounded-xl animate-pulse" />
                          <div className="h-5 bg-zinc-950/10 w-full rounded-lg animate-pulse" />
                          <div className="h-5 bg-zinc-950/10 w-5/6 rounded-lg animate-pulse" />
                          <div className="h-32 bg-zinc-950/10 w-full rounded-2xl animate-pulse mt-12" />
                        </div>
                      ) : insight ? (
                        <div className="space-y-12 md:space-y-16 relative z-10">
                          <h2 className="text-3xl md:text-5xl font-sans font-bold leading-[1.1] tracking-tight uppercase">
                            {insight.summary}
                          </h2>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 pt-10 md:pt-16 border-t border-zinc-950/10">
                            <div>
                              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8 opacity-60">Strategic Openings</h4>
                              <ul className="space-y-6">
                                {insight.opportunities.map((opt, i) => (
                                  <li key={i} className="text-sm font-bold flex items-start gap-4">
                                    <span className="bg-zinc-950 text-teal-400 w-6 h-6 rounded flex items-center justify-center text-[8px] flex-shrink-0 mt-0.5">0{i+1}</span>
                                    {opt}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8 opacity-60">Friction Vectors</h4>
                              <ul className="space-y-6">
                                {insight.risks.map((risk, i) => (
                                  <li key={i} className="text-sm font-bold flex items-start gap-4">
                                    <span className="bg-zinc-950 text-rose-400 w-6 h-6 rounded flex items-center justify-center text-[8px] flex-shrink-0 mt-0.5">X-{i+1}</span>
                                    {risk}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="pt-10 md:pt-16 border-t border-zinc-950/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div className="flex items-center gap-6">
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Trend Velocity</span>
                               <div className="px-6 py-2 bg-zinc-950 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
                                 {insight.predictedTrend} Market Phase
                               </div>
                            </div>
                            <button 
                              onClick={() => triggerNotification("Strategic report archived to library.")}
                              className="w-full sm:w-auto text-[10px] font-bold uppercase tracking-widest bg-zinc-950 text-white px-10 py-4 rounded-xl hover:scale-105 transition-all shadow-xl shadow-zinc-950/20"
                            >
                              Archive Report
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-24 text-zinc-950/40 font-bold uppercase tracking-widest text-xs">
                          Awaiting Data Stream Input...
                        </div>
                      )}
                    </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
                  <div className="bg-[var(--app-card-bg)] border border-[var(--app-border)] p-8 rounded-2xl">
                    <PieChart className="w-6 h-6 mb-6 text-teal-400 opacity-60" />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-[var(--app-text)]">Market Penetration</h4>
                    <p className="text-xs text-[var(--app-text-muted)] font-medium leading-relaxed">Cross-platform integration in high-tier segments has increased by 14% this quarter.</p>
                  </div>
                  <div className="bg-[var(--app-card-bg)] border border-[var(--app-border)] p-8 rounded-2xl">
                    <TrendingUp className="w-6 h-6 mb-6 text-teal-400 opacity-60" />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-[var(--app-text)]">Stability Index</h4>
                    <p className="text-xs text-[var(--app-text-muted)] font-medium leading-relaxed">Retention rates are stabilizing as personalization engines become standard benchmarks.</p>
                  </div>
                  <div className="bg-[var(--app-card-bg)] border border-[var(--app-border)] p-8 rounded-2xl">
                    <Activity className="w-6 h-6 mb-6 text-teal-400 opacity-60" />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-[var(--app-text)]">Velocity Metric</h4>
                    <p className="text-xs text-[var(--app-text-muted)] font-medium leading-relaxed">Average update cycle has compressed to 12.4 days for top percentile revenue generators.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      {/* Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-8 bg-[var(--app-card-bg)] border-t border-[var(--app-border)] flex items-center justify-between px-6 z-50 pointer-events-none">
        <div className="flex gap-6 text-[8px] font-mono text-[var(--app-text-muted)] uppercase tracking-widest">
            <span>Core: v2.4.1 Premium</span>
            <span>Ref: 2m ago</span>
        </div>
        <div className="flex gap-6 text-[8px] font-mono text-[var(--app-text-muted)] uppercase tracking-widest">
            <span>OmniSight Engine Running</span>
        </div>
      </footer>
    </div>
  );
}

const Zap = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
);
