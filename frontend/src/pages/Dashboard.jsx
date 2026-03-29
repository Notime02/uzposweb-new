import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, CreditCard, Wallet, Banknote, 
  UtensilsCrossed, Bike, Package, AlertCircle,
  ArrowUpRight, ArrowDownRight, Clock, Users, Bell,
  QrCode
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'https://api.uzpos.site' });

const StatCard = ({ icon: Icon, title, value, trend, trendType, color }) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-start justify-between">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 transition-transform group-hover:scale-110`}>
        <Icon className={`${color.replace('bg-', 'text-')}`} size={24} />
      </div>
      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
        trendType === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
      }`}>
        {trendType === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend}
      </div>
    </div>
    <div className="mt-4">
      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</h3>
      <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [isStatic, setIsStatic] = useState(false);

  const staticFallback = {
    metrics: {
      total_revenue: 14500,
      cash_payment: 8200,
      card_payment: 6300,
      total_debt: 2450,
      table_revenue: 9800,
      package_revenue: 4700,
      package_count: 32
    },
    recent_movements: [
      { type: 'Nakit', amount: 150, created_at: new Date().toISOString() },
      { type: 'Kart', amount: 240, created_at: new Date().toISOString() },
    ],
    debts: [
      { name: 'Örnek Tedarikçi A', balance: 1200 },
      { name: 'Örnek Tedarikçi B', balance: 850 },
    ]
  };

  const staticChartFallback = [
    { name: '20 Mar', revenue: 1200 },
    { name: '21 Mar', revenue: 1500 },
    { name: '22 Mar', revenue: 1100 },
    { name: '23 Mar', revenue: 1800 },
    { name: '24 Mar', revenue: 2200 },
    { name: '25 Mar', revenue: 1900 },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, chartRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/chart')
        ]);
        setData(sumRes.data);
        setChartData(chartRes.data);
        setIsStatic(false);
      } catch (err) {
        console.warn("Backend'den veri alınamadı, statik veriler gösteriliyor:", err);
        setData(staticFallback);
        setChartData(staticChartFallback);
        setIsStatic(true);
      }
    };
    fetchData();
  }, []);

  if (!data) return <div className="p-8 text-center text-slate-500 animate-pulse">Yükleniyor...</div>;

  const { metrics, recent_movements, debts } = data;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Genel Bakış
            {isStatic && (
              <span className="flex items-center gap-1 text-[10px] font-black bg-amber-100 text-amber-600 px-2 py-1 rounded-md uppercase tracking-tighter animate-pulse">
                <AlertCircle size={12} /> Statik Test Verisi
              </span>
            )}
          </h1>
          <p className="text-slate-500 font-medium mt-1 italic italic">İşletmenizin bugünkü performansı ve mali durumu.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.open('https://qr.uzpos.site', '_blank')}
            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-primary transition-all shadow-sm"
            title="QR Menü Önizleme"
          >
             <QrCode size={22} />
          </button>

          <div className="relative group">
            <button className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-rose-500 transition-all shadow-sm">
               <Bell size={22} />
               <span className="absolute top-2 right-2 w-3 h-3 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full animate-bounce"></span>
            </button>
            <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl p-6 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all z-50">
               <h4 className="font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest text-[10px]">Akıllı Uyarılar</h4>
               <div className="space-y-4">
                  <div className="flex gap-3 p-3 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                     <AlertCircle className="text-rose-500 shrink-0" size={18} />
                     <div>
                        <p className="text-xs font-black text-slate-800 dark:text-white">Maliyet Artışı!</p>
                        <p className="text-[10px] font-medium text-slate-500 mt-1">Domates maliyeti %15 arttı. Reçete kâr marjı düştü.</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <Clock size={18} className="text-primary" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
               {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={TrendingUp} title="Günlük Ciro" 
          value={`${metrics.total_revenue.toLocaleString('tr-TR')} ₺`} 
          trend="%12.5" trendType="up" color="bg-blue-500" 
        />
        <StatCard 
          icon={Banknote} title="Nakit Tahsilat" 
          value={`${metrics.cash_payment.toLocaleString('tr-TR')} ₺`} 
          trend="%3.2" trendType="down" color="bg-emerald-500" 
        />
        <StatCard 
          icon={CreditCard} title="Kart Tahsilat" 
          value={`${metrics.card_payment.toLocaleString('tr-TR')} ₺`} 
          trend="%8.1" trendType="up" color="bg-indigo-500" 
        />
        <StatCard 
          icon={Wallet} title="Toplam Borç" 
          value={`${metrics.total_debt.toLocaleString('tr-TR')} ₺`} 
          trend="%2.0" trendType="up" color="bg-rose-500" 
        />
      </div>

      {/* Secondary Service Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl flex items-center gap-4 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
          <div className="p-3 bg-slate-900 text-white rounded-xl"><UtensilsCrossed size={20} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Masa Geliri</p>
            <p className="text-xl font-bold">{metrics.table_revenue.toLocaleString('tr-TR')} ₺</p>
          </div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl flex items-center gap-4 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
          <div className="p-3 bg-primary text-white rounded-xl"><Bike size={20} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Paket Geliri</p>
            <p className="text-xl font-bold">{metrics.package_revenue.toLocaleString('tr-TR')} ₺</p>
          </div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl flex items-center gap-4 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
          <div className="p-3 bg-orange-500 text-white rounded-xl"><Package size={20} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Paket Sayısı</p>
            <p className="text-xl font-bold">{metrics.package_count} Adet</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Gelir Akışı (15 Gün)</h2>
            <div className="flex gap-2 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary opacity-50"></div> Günlük Ciro</span>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Lists */}
        <div className="space-y-8">
          {/* Debts list */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <AlertCircle size={20} className="text-rose-500" />
              Cari Borçlar
            </h2>
            <div className="space-y-4">
              {debts.map((debt, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center font-bold text-xs text-slate-500">{index + 1}</div>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{debt.name}</span>
                  </div>
                  <span className="font-black text-rose-500">{debt.balance.toLocaleString('tr-TR')} ₺</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Movements */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Son Hareketler</h2>
            <div className="space-y-3">
              {recent_movements.map((move, index) => (
                <div key={index} className="flex gap-4 items-start group">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${move.type === 'Nakit' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{move.type} Tahsilat</span>
                    <span className="text-xs text-slate-400 font-medium">{new Date(move.created_at).toLocaleTimeString('tr-TR')}</span>
                  </div>
                  <span className="ml-auto font-bold text-sm text-slate-900 dark:text-white">{move.amount.toLocaleString('tr-TR')} ₺</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
