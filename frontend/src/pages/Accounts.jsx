import React, { useState, useEffect } from 'react';
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, 
  History, DollarSign, Calendar, Plus,
  CreditCard, Banknote
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' });

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, transRes] = await Promise.all([
          api.get('/accounts'),
          api.get('/dashboard/summary') // Başlangıçta özet üzerinden hareketleri alıyoruz
        ]);
        setAccounts(accRes.data || []);
        setTransactions(transRes.data.recent_movements || []);
      } catch (err) {
        console.error("Kasa verisi yükleme hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Kasa & Finans</h1>
          <p className="text-slate-500 font-medium mt-1 italic italic">Nakit ve POS hesaplarının anlık takibi.</p>
        </div>
        <button className="flex items-center gap-2 px-8 py-3 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5">
           <Plus size={20} /> Hareket Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 -mr-8 -mt-8 rounded-full ${acc.name === 'Nakit' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
            
            <div className="flex justify-between items-start mb-8">
               <div className={`p-4 rounded-2xl ${acc.name === 'Nakit' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {acc.name === 'Nakit' ? <Banknote size={32} /> : <CreditCard size={32} />}
               </div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic group-hover:text-primary transition-colors">Hesap Detayı</span>
            </div>
            
            <h3 className="text-xl font-black text-white mb-2">{acc.name} Kasası</h3>
            <p className="text-4xl font-black text-white italic tracking-tighter">
               {(acc.balance || 0).toLocaleString('tr-TR')} ₺
            </p>
          </div>
        ))}
      </div>

      {/* Transaction History */}
      <div className="bg-slate-900/30 rounded-[3rem] border border-slate-800 p-8 lg:p-12">
         <div className="flex items-center gap-3 mb-8">
            <History className="text-primary" size={24} />
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Son Finansal Hareketler</h2>
         </div>
         
         <div className="space-y-4">
            {transactions.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-6 bg-black border border-slate-900 rounded-3xl hover:border-slate-700 transition-all">
                 <div className="flex items-center gap-6">
                    <div className={`p-3 rounded-xl ${t.type === 'Giriş' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                       {t.type === 'Giriş' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div>
                       <p className="font-black text-white">{t.description || (t.type === 'Nakit' ? 'Nakit Satış' : 'Kartlı Satış')}</p>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                          {new Date(t.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • {t.type}
                       </p>
                    </div>
                 </div>
                 <div className={`text-xl font-black italic ${t.type === 'Giriş' ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {t.type === 'Giriş' ? '+' : ''}{t.amount.toLocaleString('tr-TR')} ₺
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default Accounts;
