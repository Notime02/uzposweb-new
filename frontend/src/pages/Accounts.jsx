import React, { useState, useEffect } from 'react';
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, 
  History, DollarSign, Calendar, Plus,
  CreditCard, Banknote, X, Save, Search,
  TrendingDown, TrendingUp
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' });

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  
  // Form States
  const [transactionForm, setTransactionForm] = useState({
    account_id: '',
    amount: '',
    t_type: 'Çıkış',
    target: '',
    description: ''
  });
  const [accountForm, setAccountForm] = useState({
    name: '',
    balance: 0
  });

  const fetchData = async () => {
    try {
      const [accRes, transRes, targetRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/dashboard/summary'),
        api.get('/accounts/targets')
      ]);
      
      let accData = accRes.data || [];
      
      // Auto-initialize Nakit and Kart if no accounts exist
      if (accData.length === 0) {
        const nakit = await api.post('/accounts', { name: 'Nakit', balance: 0 });
        const kart = await api.post('/accounts', { name: 'Kart', balance: 0 });
        accData = [nakit.data, kart.data];
      }
      
      setAccounts(accData);
      setTransactions(transRes.data.recent_movements || []);
      setTargets(targetRes.data || []);
      
      if (accData.length > 0) {
        setTransactionForm(prev => ({ ...prev, account_id: accData[0].id }));
      }
    } catch (err) {
      console.error("Kasa verisi yükleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddAccount = async () => {
    try {
      if (!accountForm.name) return alert("Lütfen isim girin");
      await api.post('/accounts', accountForm);
      setShowAccountModal(false);
      setAccountForm({ name: '', balance: 0 });
      fetchData();
    } catch (err) {
      alert("Hata oluştu");
    }
  };

  const handleAddTransaction = async () => {
    try {
      if (!transactionForm.amount || !transactionForm.account_id) return alert("Eksik bilgi");
      await api.post('/transactions', {
        ...transactionForm,
        amount: Number(transactionForm.amount)
      });
      setShowTransactionModal(false);
      setTransactionForm({
        account_id: accounts[0]?.id || '',
        amount: '',
        t_type: 'Çıkış',
        target: '',
        description: ''
      });
      fetchData();
    } catch (err) {
      alert("İşlem başarısız");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Kasa & Finans</h1>
          <p className="text-slate-500 font-medium mt-1 italic">Nakit, POS, Maaş ve tüm dükkan giderlerinin anlık takibi.</p>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={() => setShowAccountModal(true)}
             className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all active:scale-95 border border-slate-700"
           >
              <Wallet size={20} className="text-primary" /> Kasa Ekle
           </button>
           <button 
             onClick={() => setShowTransactionModal(true)}
             className="flex items-center gap-2 px-8 py-3 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5"
           >
              <Plus size={20} /> Hareket Ekle
           </button>
        </div>
      </div>

      {/* Account Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] relative overflow-hidden group hover:border-primary/50 transition-all duration-500">
            <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 -mr-8 -mt-8 rounded-full ${acc.name === 'Nakit' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
               <div className={`p-4 rounded-2xl ${acc.name === 'Nakit' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {acc.name === 'Nakit' ? <Banknote size={32} /> : <CreditCard size={32} />}
               </div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic group-hover:text-primary transition-colors">Hesap Detayı</span>
            </div>
            
            <h3 className="text-xl font-black text-white mb-2 relative z-10">{acc.name}</h3>
            <p className="text-4xl font-black text-white italic tracking-tighter relative z-10">
               {(acc.balance || 0).toLocaleString('tr-TR')} ₺
            </p>
          </div>
        ))}
      </div>

      {/* History Table */}
      <div className="bg-slate-900/30 rounded-[3rem] border border-slate-800 p-8 lg:p-12">
         <div className="flex items-center gap-3 mb-8">
            <History className="text-primary" size={24} />
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Son Finansal Hareketler</h2>
         </div>
         
         <div className="space-y-4">
            {transactions.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-6 bg-black border border-slate-900 rounded-3xl hover:border-slate-700 transition-all group">
                 <div className="flex items-center gap-6">
                    <div className={`p-3 rounded-xl transition-all ${t.type === 'Giriş' ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black' : 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'}`}>
                       {t.type === 'Giriş' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div>
                       <p className="font-black text-white">{t.description || (t.type === 'Nakit' ? 'Nakit Satış' : 'Kartlı Satış')}</p>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                          <span className="text-primary/70">{t.target || 'Genel'}</span>
                          <span>•</span>
                          <span>{new Date(t.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                       </p>
                    </div>
                 </div>
                 <div className={`text-xl font-black italic ${t.type === 'Giriş' ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {t.type === 'Giriş' ? '+' : '-'}{t.amount.toLocaleString('tr-TR')} ₺
                 </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-600 font-bold uppercase tracking-widest italic font-black">
                 Henüz bir hareket bulunmuyor
              </div>
            )}
         </div>
      </div>

      {/* Modals */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[3rem] shadow-2xl p-8 space-y-8 animate-in zoom-in-95">
             <div>
               <h2 className="text-2xl font-black text-white italic">YENİ KASA EKLE</h2>
               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Dükkan Hesabı Tanımla</p>
             </div>
             <div className="space-y-4">
                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Kasa Adı (Örn: Ziraat Bankası)</label>
                   <input 
                     className="w-full bg-black border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-primary/50 outline-none"
                     placeholder="Hesap Adı"
                     value={accountForm.name}
                     onChange={e => setAccountForm({...accountForm, name: e.target.value})}
                   />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Açılış Bakiyesi (₺)</label>
                   <input 
                     type="number"
                     className="w-full bg-black border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-primary/50 outline-none"
                     placeholder="0.00"
                     value={accountForm.balance}
                     onChange={e => setAccountForm({...accountForm, balance: Number(e.target.value)})}
                   />
                </div>
             </div>
             <div className="flex gap-3">
               <button onClick={() => setShowAccountModal(false)} className="flex-1 py-4 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all">İptal</button>
               <button onClick={handleAddAccount} className="flex-1 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                 <Save size={20} /> Kaydet
               </button>
             </div>
          </div>
        </div>
      )}

      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[3rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
             <div className="flex justify-between items-center">
               <div>
                  <h2 className="text-2xl font-black text-white italic">FİNANSAL HAREKET EKLE</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Gelir veya Gider Kaydı Oluştur</p>
               </div>
               <button onClick={() => setShowTransactionModal(false)} className="p-3 hover:bg-white/5 rounded-2xl text-slate-500"><X size={24}/></button>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Kaynak Hesap</label>
                   <select 
                     className="w-full bg-black border border-slate-800 rounded-2xl px-4 py-3 text-white font-bold outline-none"
                     value={transactionForm.account_id}
                     onChange={e => setTransactionForm({...transactionForm, account_id: e.target.value})}
                   >
                     {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">İşlem Tipi</label>
                   <div className="grid grid-cols-2 gap-2 bg-black p-1 rounded-2xl border border-slate-800">
                      <button 
                        onClick={() => setTransactionForm({...transactionForm, t_type: 'Giriş'})}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-all ${transactionForm.t_type === 'Giriş' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-white'}`}
                      >
                         <ArrowDownLeft size={14}/> Giriş
                      </button>
                      <button 
                        onClick={() => setTransactionForm({...transactionForm, t_type: 'Çıkış'})}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-all ${transactionForm.t_type === 'Çıkış' ? 'bg-rose-500 text-white' : 'text-slate-500 hover:text-white'}`}
                      >
                         <ArrowUpRight size={14}/> Çıkış
                      </button>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nereye / Kimden</label>
                   <select 
                     className="w-full bg-black border border-slate-800 rounded-2xl px-4 py-3 text-white font-bold outline-none"
                     value={transactionForm.target}
                     onChange={e => setTransactionForm({...transactionForm, target: e.target.value})}
                   >
                     <option value="">Genel / Kategori Seçin</option>
                     {targets.map(t => (
                        <option key={t.id} value={t.name}>{t.type === 'Cari' ? '👤 ' : '📁 '} {t.name}</option>
                     ))}
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Tutar (₺)</label>
                   <input 
                     type="number"
                     className="w-full bg-black border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-emerald-500/50 outline-none"
                     placeholder="0.00"
                     value={transactionForm.amount}
                     onChange={e => setTransactionForm({...transactionForm, amount: e.target.value})}
                   />
                </div>
             </div>

             <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Kısa Açıklama</label>
                <textarea 
                  className="w-full bg-black border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-primary/50 outline-none min-h-[100px]"
                  placeholder="İşlem detayı..."
                  value={transactionForm.description}
                  onChange={e => setTransactionForm({...transactionForm, description: e.target.value})}
                />
             </div>

             <button 
               onClick={handleAddTransaction}
               className="w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3 active:scale-[0.98]"
             >
                <Save size={20} /> İŞLEMİ KAYDET
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
