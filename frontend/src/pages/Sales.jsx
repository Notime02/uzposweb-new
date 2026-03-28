import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Calendar, TrendingUp, Filter,
  ArrowUpRight, Clock, User, Hash, ChevronRight
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' });

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const res = await api.get('/sales');
        setSales(res.data || []);
      } catch (err) {
        console.error("Satış yükleme hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Günlük Satışlar</h1>
          <p className="text-slate-500 font-medium mt-1 italic italic">Restoran içi ve paket servis adisyon takibi.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="bg-slate-900 px-6 py-3 rounded-2xl border border-slate-800 flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Bugünkü Toplam:</span>
              <span className="text-xl font-black text-primary italic">
                 {(sales || []).reduce((acc, curr) => acc + (curr.total_amount || 0), 0).toLocaleString('tr-TR')} ₺
              </span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sales List */}
        <div className="lg:col-span-3 space-y-4">
           {sales.map(sale => (
             <div key={sale.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl hover:border-slate-700 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-8">
                   <div className="text-center bg-black p-4 rounded-2xl border border-slate-800">
                      <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Kod</p>
                      <p className="text-lg font-black text-white italic">#{String(sale.id || '0000').slice(-4)}</p>
                   </div>
                   <div className="space-y-2">
                      <div className="flex items-center gap-3">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                           sale.table_id ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                         }`}>
                            {sale.table_id ? 'Masa' : 'Paket'}
                         </span>
                         <h3 className="font-black text-white">Sipariş Detayı</h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                         <span className="flex items-center gap-1"><Clock size={12} /> {sale.created_at ? new Date(sale.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                         <span className="flex items-center gap-1 uppercase tracking-widest"><Hash size={12} /> {sale.payment_status || 'Tamamlandı'}</span>
                      </div>
                   </div>
                </div>
                
                <div className="flex items-center gap-12">
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tutar</p>
                      <p className="text-2xl font-black text-white italic">{sale.total_amount?.toLocaleString('tr-TR')} ₺</p>
                   </div>
                   <button className="p-3 bg-black rounded-xl text-slate-600 group-hover:text-primary transition-all border border-slate-800 hover:border-primary/30">
                      <ChevronRight size={20} />
                   </button>
                </div>
             </div>
           ))}

           {sales.length === 0 && !loading && (
             <div className="py-32 text-center bg-slate-900/10 rounded-[4rem] border-2 border-dashed border-slate-900">
                <ShoppingCart size={48} className="text-slate-800 mx-auto mb-6" />
                <h2 className="text-xl font-black text-slate-700 uppercase tracking-widest">Bugün Henüz Satış Yapılmadı</h2>
                <p className="text-sm font-bold text-slate-800 mt-2 italic">Adisyonlar kapandığında buraya yansıyacaktır.</p>
             </div>
           )}
        </div>

        {/* Sales Stats Sidebar */}
        <div className="space-y-6">
           <div className="bg-primary p-8 rounded-[3rem] shadow-xl shadow-primary/20">
              <TrendingUp className="text-white opacity-20 mb-4" size={48} />
              <h2 className="text-xl font-black text-white mb-1">Satış Analizi</h2>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-8 italic">Bugünkü Dağılım</p>
              
              <div className="space-y-6">
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-white uppercase tracking-tighter">
                       <span>Masa</span>
                       <span>%65</span>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                       <div className="h-full bg-white w-[65%]"></div>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-white uppercase tracking-tighter">
                       <span>Paket</span>
                       <span>%35</span>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                       <div className="h-full bg-white w-[35%]"></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;
