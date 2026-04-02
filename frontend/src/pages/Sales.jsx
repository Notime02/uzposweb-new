import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Calendar, TrendingUp, Clock, 
  ChevronDown, ChevronUp, Receipt, 
  Bike, UtensilsCrossed
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' });

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  // Default expandedDays is empty object -> all days are CLOSED by default
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const res = await api.get('/sales');
        setSales(res.data || []);
      } catch (err) {
        console.error("Sipariş yükleme hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

  // Orders grouping by date (Strictly from orders table)
  const groupedSales = sales.reduce((acc, sale) => {
    const date = new Date(sale.created_at).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(sale);
    return acc;
  }, {});

  const toggleDay = (date) => {
    setExpandedDays(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse font-black italic uppercase tracking-widest">Sipariş Arşivi Yükleniyor...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Sipariş Arşivi</h1>
          <p className="text-slate-500 font-medium mt-1 italic uppercase text-[10px] tracking-widest">Orders tablosundan gelen tüm adisyon geçmişi.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="bg-slate-900 px-6 py-3 rounded-2xl border border-slate-800 flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Toplam İşlem:</span>
              <span className="text-xl font-black text-primary italic">{sales.length}</span>
           </div>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-6">
        {Object.keys(groupedSales).length === 0 ? (
          <div className="py-32 text-center bg-slate-900/10 rounded-[4rem] border-2 border-dashed border-slate-900">
             <ShoppingCart size={48} className="text-slate-800 mx-auto mb-6" />
             <h2 className="text-xl font-black text-slate-700 uppercase tracking-widest italic">Henüz Sipariş Kaydı Bulunmuyor</h2>
             <p className="text-sm font-bold text-slate-800 mt-2 italic">Orders sekmesine veri düştüğünde buraya yansıyacaktır.</p>
          </div>
        ) : (
          Object.entries(groupedSales).map(([date, daySales]) => {
            const dayTotal = daySales.reduce((sum, s) => sum + (float(s.total_amount) || 0), 0);
            const isExpanded = expandedDays[date];

            // Helper to clean total_amount
            function float(val) { return parseFloat(val) || 0; }

            return (
              <div key={date} className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] overflow-hidden transition-all shadow-xl shadow-black/20">
                {/* Accordion Header (Selectable) */}
                <div 
                  onClick={() => toggleDay(date)}
                  className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-2xl border transition-all ${isExpanded ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-black text-slate-600 border-slate-800'}`}>
                       <Calendar size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">{date}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{daySales.length} Adet Sipariş</span>
                        <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">İşlendi</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Günlük Ciro</p>
                      <p className="text-2xl font-black text-white font-mono">{dayTotal.toLocaleString('tr-TR')} ₺</p>
                    </div>
                    <div className="p-3 rounded-xl bg-black border border-slate-800 text-slate-500">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Accordion Content (Visible only when expanded) */}
                {isExpanded && (
                  <div className="px-6 pb-8 md:px-8 animate-in slide-in-from-top-2 duration-300">
                    <div className="border-t border-slate-800/50 pt-6">
                      <div className="grid grid-cols-1 gap-3">
                        {daySales.map((sale) => (
                          <div key={sale.id} className="bg-black/60 border border-slate-800/50 p-5 rounded-2xl hover:border-slate-700 transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-8">
                              <div className="text-center w-14">
                                <p className="text-[9px] font-black text-slate-700 uppercase mb-1">ID</p>
                                <p className="text-xs font-black text-slate-400 italic">#{String(sale.id || '0').slice(-4)}</p>
                              </div>
                              
                              <div className="h-10 w-px bg-slate-800/50 hidden md:block"></div>
                              
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  {sale.table_id ? <UtensilsCrossed size={14} className="text-blue-500" /> : <Bike size={14} className="text-amber-500" />}
                                  <h3 className="text-sm font-black text-white uppercase tracking-tight">
                                    {sale.item || 'İsimsiz Ürün'}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-4">
                                   <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${sale.table_id ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                      {sale.table_id ? `Masa ${sale.table_id}` : 'Paket Servis'}
                                   </span>
                                   <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                      <Clock size={10} /> {new Date(sale.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                   </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-12">
                               <div className="text-right hidden sm:block">
                                  <div className="flex items-center gap-2 justify-end mb-1">
                                     <Receipt size={10} className="text-slate-600" />
                                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Ödeme Türü</span>
                                  </div>
                                  <p className="text-[11px] font-black text-white uppercase italic tracking-tighter">{sale.type || 'Nakit'}</p>
                               </div>
                               <div className="text-right min-w-[100px]">
                                  <p className="text-xl font-black text-white italic">{float(sale.total_amount).toLocaleString('tr-TR')} ₺</p>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Analytics Mini Cards (Based on Orders) */}
      {sales.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="bg-slate-900/30 p-8 rounded-[2rem] border border-slate-800 flex items-center gap-6">
               <div className="p-4 bg-primary/10 text-primary rounded-2xl border border-primary/20"><TrendingUp size={24} /></div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Haftalık Yoğunluk</p>
                  <p className="text-2xl font-black text-white italic">Hatasız</p>
               </div>
            </div>
            
            <div className="bg-slate-900/30 p-8 rounded-[2rem] border border-slate-800 flex items-center gap-6">
               <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20"><ShoppingCart size={24} /></div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Sipariş Kaynağı</p>
                  <p className="text-2xl font-black text-white italic">Orders Sekmesi</p>
               </div>
            </div>

            <div className="bg-slate-900/30 p-8 rounded-[2rem] border border-slate-800 flex items-center gap-6">
               <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20"><UtensilsCrossed size={24} /></div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Ortalama Tutar</p>
                  <p className="text-2xl font-black text-white italic">
                    {(sales.reduce((acc, s) => acc + (parseFloat(s.total_amount) || 0), 0) / sales.length).toFixed(0)} ₺
                  </p>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Sales;
