import React, { useState, useEffect } from 'react';
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, 
  History, DollarSign, Calendar, Plus,
  CreditCard, Banknote, X, Save, Search,
  TrendingDown, TrendingUp, Scan, FileText, Cpu, CheckCircle
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' });

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [targets, setTargets] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  
  // Scan States
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  
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
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    phone: '',
    balance: 0
  });

  const fetchData = async () => {
    try {
      const [accRes, transRes, targetRes, ingRes, suppRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/dashboard/summary'),
        api.get('/accounts/targets'),
        api.get('/ingredients'),
        api.get('/suppliers')
      ]);
      
      let accData = accRes.data || [];
      if (accData.length === 0) {
        const nakit = await api.post('/accounts', { name: 'Nakit', balance: 0 });
        const kart = await api.post('/accounts', { name: 'Kart', balance: 0 });
        accData = [nakit.data, kart.data];
      }
      
      setAccounts(accData);
      setTransactions(transRes.data.recent_movements || []);
      setTargets(targetRes.data || []);
      setIngredients(ingRes.data || []);
      setSuppliers(suppRes.data || []);
      
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

  const handleScanInvoice = async (file) => {
    if (!file) return;
    setScanning(true);
    setScanResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/process-invoice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Auto-select supplier if found in suppliers list
      const foundSupplier = suppliers.find(s => s.name === res.data.supplier_name)?.id;
      setScanResult({
        ...res.data,
        supplier_id: foundSupplier || ''
      });
    } catch (err) {
      alert("Fatura okuma hatası. API anahtarını check edin.");
    } finally {
      setScanning(false);
    }
  };

  const handleSaveScannedInvoice = async () => {
    try {
      if (!scanResult) return;
      
      const invoiceData = {
        supplier_id: scanResult.supplier_id,
        invoice_date: scanResult.invoice_date || new Date().toISOString().split('T')[0],
        invoice_number: scanResult.invoice_number || '',
        total_amount_gross: Number(scanResult.total_amount_gross),
        items: scanResult.items.map(item => ({
          ingredient_id: item.matched_ingredient_id,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total_price: Number(item.total_price),
          tax_rate: Number(item.tax_rate || 10)
        })).filter(i => i.ingredient_id)
      };

      if (!invoiceData.supplier_id) return alert("Lütfen bir tedarikçi (Cari) seçin.");
      if (invoiceData.items.length === 0) return alert("En az bir ürünü sistemdeki bir kalemle eşleştirin.");

      await api.post('/invoices', invoiceData);
      setShowScanModal(false);
      setScanResult(null);
      await fetchData(); // Refresh targets and accounts
      alert("Fatura başarıyla işlendi ve Cari hesabına borç kaydedildi!");
    } catch (err) {
      console.error(err);
      alert("Kayıt sırasında hata oluştu. Detaylar konsolda.");
    }
  };

  const handleAddSupplier = async () => {
    try {
      if (!supplierForm.name) return alert("Lütfen isim girin");
      await api.post('/suppliers', supplierForm);
      setShowSupplierModal(false);
      setSupplierForm({ name: '', phone: '', balance: 0 });
      fetchData();
      alert("Cari başarıyla eklendi.");
    } catch (err) {
      alert("Cari eklenemedi.");
    }
  };

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
             onClick={() => setShowScanModal(true)}
             className="flex items-center gap-2 px-6 py-3 bg-indigo-600/10 text-indigo-400 font-black rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95 border border-indigo-500/20"
           >
              <Cpu size={20} /> Fatura Tara (AI)
           </button>
            <button 
              onClick={() => setShowSupplierModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all active:scale-95 border border-slate-700"
            >
               <Plus size={20} className="text-indigo-400" /> Cari Ekle
            </button>
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
                          <span>{t.created_at ? new Date(t.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
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

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[3rem] shadow-2xl p-8 space-y-8 animate-in zoom-in-95">
             <div>
               <h2 className="text-2xl font-black text-white italic">YENİ CARİ (TEDARİKÇİ) EKLE</h2>
               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Sistemine Yeni Bir Toptancı Tanımla</p>
             </div>
             <div className="space-y-4">
                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Cari Adı / Firma Ünvanı</label>
                   <input 
                     className="w-full bg-black border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500/50 outline-none"
                     placeholder="Örn: Öz Karadeniz Gıda"
                     value={supplierForm.name}
                     onChange={e => setSupplierForm({...supplierForm, name: e.target.value})}
                   />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Telefon (Opsiyonel)</label>
                   <input 
                     className="w-full bg-black border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500/50 outline-none"
                     placeholder="05xx..."
                     value={supplierForm.phone}
                     onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})}
                   />
                </div>
             </div>
             <div className="flex gap-3">
               <button onClick={() => setShowSupplierModal(false)} className="flex-1 py-4 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all">İptal</button>
               <button onClick={handleAddSupplier} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-2">
                 <Save size={20} /> Cariyi Kaydet
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

      {/* AI Scan Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-[3rem] shadow-2xl p-8 lg:p-12 space-y-8 animate-in zoom-in-95 max-h-[95vh] overflow-y-auto custom-scrollbar">
             <div className="flex justify-between items-start">
               <div>
                  <h2 className="text-3xl font-black text-white italic flex items-center gap-3">
                    <Cpu size={32} className="text-indigo-400" /> AKILLI FATURA TARAMA
                  </h2>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-2 px-1">Fatura Görselinden Otomatik Cari ve Stok İşleme</p>
               </div>
               <button onClick={() => {setShowScanModal(false); setScanResult(null);}} className="p-4 hover:bg-white/5 rounded-3xl text-slate-500"><X size={28}/></button>
             </div>

             {!scanResult ? (
                <div className="py-20 border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center justify-center space-y-6 bg-black/20 group hover:border-indigo-500/50 transition-all">
                   {scanning ? (
                      <div className="flex flex-col items-center space-y-6">
                        <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        <p className="text-indigo-400 font-black animate-pulse uppercase tracking-[0.2em]">Yapay Zeka Faturayı Analiz Ediyor...</p>
                      </div>
                   ) : (
                      <>
                        <div className="p-8 bg-indigo-500/10 rounded-full text-indigo-500 group-hover:scale-110 transition-transform">
                           <Scan size={64} />
                        </div>
                        <div className="text-center">
                           <p className="text-xl font-black text-white">Fatura Görselini Buraya Bırakın</p>
                           <p className="text-slate-500 font-bold mt-1 uppercase text-xs tracking-widest">veya dosyayı seçmek için tıklayın</p>
                        </div>
                        <input 
                           type="file" 
                           className="absolute inset-0 opacity-0 cursor-pointer" 
                           accept="image/*,application/pdf"
                           onChange={(e) => handleScanInvoice(e.target.files[0])}
                        />
                      </>
                   )}
                </div>
             ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   {/* Editable Meta Header */}
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-black/40 p-4 rounded-3xl border border-slate-800">
                         <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Tedarikçi (Cari)</label>
                            <button 
                              onClick={async () => {
                                 const name = prompt("Yeni Cari Adı:");
                                 if (name) {
                                    try {
                                       const res = await api.post('/suppliers', { name });
                                       await fetchData(); // Refresh targets list
                                       setScanResult({...scanResult, supplier_id: res.data.id});
                                       alert("Yeni Cari oluşturuldu ve seçildi.");
                                    } catch (err) { alert("Cari oluşturulamadı."); }
                                 }
                              }}
                              className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase underline"
                            >
                               + Yeni Ekle
                            </button>
                         </div>
                         <select 
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-white italic outline-none focus:border-indigo-500/50"
                            value={scanResult.supplier_id || ''}
                            onChange={(e) => setScanResult({...scanResult, supplier_id: e.target.value})}
                         >
                            <option value="">Cari Seçin...</option>
                            {suppliers.map(s => (
                               <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                         </select>
                      </div>
                      <div className="bg-black/40 p-4 rounded-3xl border border-slate-800">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Fatura Tarihi</label>
                         <input 
                            type="date"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-white italic outline-none focus:border-indigo-500/50"
                            value={scanResult.invoice_date || ''}
                            onChange={(e) => setScanResult({...scanResult, invoice_date: e.target.value})}
                         />
                      </div>
                      <div className="bg-black/40 p-4 rounded-3xl border border-slate-800">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Fatura No</label>
                         <input 
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-white italic outline-none focus:border-indigo-500/50"
                            value={scanResult.invoice_number || ''}
                            onChange={(e) => setScanResult({...scanResult, invoice_number: e.target.value})}
                         />
                      </div>
                      <div className="bg-black/40 p-4 rounded-3xl border border-slate-800">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Toplam Tutar</label>
                         <input 
                            type="number"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-emerald-400 italic outline-none focus:border-indigo-500/50"
                            value={scanResult.total_amount_gross || 0}
                            onChange={(e) => setScanResult({...scanResult, total_amount_gross: Number(e.target.value)})}
                         />
                      </div>
                   </div>

                   {/* Editable Table */}
                   <div className="overflow-hidden rounded-[2rem] border border-slate-800">
                      <table className="w-full text-left border-collapse bg-black/40">
                         <thead>
                           <tr className="bg-slate-800/50">
                             <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturadaki Ürün İsmi</th>
                             <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistemdeki Karşılığı</th>
                             <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Miktar</th>
                             <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Birim Fiyat</th>
                             <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Eşleşme</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800">
                           {scanResult.items?.map((item, i) => (
                             <tr key={i} className="hover:bg-white/5 transition-colors group">
                               <td className="p-4">
                                 <input 
                                   className="w-full bg-transparent border-none text-white font-black text-xs uppercase outline-none focus:text-indigo-400"
                                   value={item.description}
                                   onChange={(e) => {
                                      const newItems = [...scanResult.items];
                                      newItems[i].description = e.target.value;
                                      setScanResult({...scanResult, items: newItems});
                                   }}
                                 />
                               </td>
                               <td className="p-4">
                                 <select 
                                   className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-xs font-bold text-slate-300 outline-none"
                                   value={item.matched_ingredient_id || ''}
                                   onChange={(e) => {
                                      const newItems = [...scanResult.items];
                                      newItems[i].matched_ingredient_id = e.target.value;
                                      setScanResult({...scanResult, items: newItems});
                                   }}
                                 >
                                    <option value="">Seçiniz / Yeni Ürün</option>
                                    {ingredients.map(ing => (
                                       <option key={ing.id} value={ing.id}>{ing.name}</option>
                                    ))}
                                 </select>
                               </td>
                               <td className="p-4">
                                  <input 
                                    type="number"
                                    className="w-16 mx-auto bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-center text-white font-black text-xs outline-none"
                                    value={item.quantity}
                                    onChange={(e) => {
                                       const newItems = [...scanResult.items];
                                       newItems[i].quantity = Number(e.target.value);
                                       setScanResult({...scanResult, items: newItems});
                                    }}
                                  />
                               </td>
                               <td className="p-4">
                                  <input 
                                    type="number"
                                    className="w-20 mx-auto bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-center text-emerald-400 font-black text-xs outline-none"
                                    value={item.unit_price}
                                    onChange={(e) => {
                                       const newItems = [...scanResult.items];
                                       newItems[i].unit_price = Number(e.target.value);
                                       setScanResult({...scanResult, items: newItems});
                                    }}
                                  />
                               </td>
                               <td className="p-4 text-right">
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 rounded-lg">
                                     <div className={`w-1.5 h-1.5 rounded-full ${item.match_score >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                     <span className="text-[9px] font-black text-indigo-400">%{item.match_score || 0}</span>
                                  </div>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                      </table>
                   </div>

                   <div className="flex justify-end gap-3 pt-2">
                      <button 
                        onClick={() => setScanResult(null)}
                        className="px-6 py-4 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all text-xs"
                      >
                         VAZGEÇ / TEKRAR TARA
                      </button>
                      <button 
                        onClick={handleSaveScannedInvoice}
                        className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2 text-xs"
                      >
                         <CheckCircle size={20} /> ONAM VE CARİYE KAYDET
                      </button>
                   </div>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
