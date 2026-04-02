import React, { useState, useEffect } from 'react';
import { 
  Users, Wallet, TrendingDown, ArrowUpRight, 
  Search, Plus, Receipt, UserPlus, Edit, Trash2, Check, X
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' });

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', balance: 0 });

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await api.get('/suppliers');
        setSuppliers(res.data || []);
      } catch (err) {
        console.error("Cari yükleme hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, []);

  const filteredSuppliers = (suppliers || []).filter(s => 
    (s.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setForm({ ...supplier });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu tedarikçiyi silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      setSuppliers(suppliers.filter(s => s.id !== id));
    } catch (err) {
      alert("Silme hatası!");
    }
  };

  const handleSave = async () => {
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, form);
        setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? { ...s, ...form } : s));
        setEditingSupplier(null);
      } else {
        const res = await api.post('/suppliers', form);
        if (res.data) setSuppliers([...suppliers, res.data]);
      }
      setForm({ name: '', phone: '', balance: 0 });
    } catch (err) {
      alert("Kaydetme hatası!");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Tedarikçi & Cari Yönetimi</h1>
          <p className="text-slate-500 font-medium mt-1 italic italic">Toptancı borç takibi ve ödeme süreçleri.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Cari ara..." 
              className="pl-10 pr-4 py-3 bg-slate-900 border-none rounded-2xl text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setEditingSupplier({ name: '', phone: '', balance: 0 })} className="flex items-center gap-2 px-8 py-3 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5">
             <UserPlus size={20} /> Yeni Cari
          </button>
        </div>
      </div>

      {editingSupplier && (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] max-w-2xl animate-in slide-in-from-top-4">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-white uppercase italic">Cari Bilgilerini Güncelle</h2>
              <button onClick={() => setEditingSupplier(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                 <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Cari Adı / Ünvan</label>
                 <input 
                    className="w-full bg-black border-none rounded-2xl py-3 px-4 text-white font-bold mt-1"
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                 />
              </div>
               <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Telefon / İletişim</label>
                  <input 
                     className="w-full bg-black border-none rounded-2xl py-3 px-4 text-white font-bold mt-1"
                     value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})}
                  />
               </div>
           </div>
           <button 
              onClick={handleSave}
              className="px-12 py-4 bg-primary text-white font-black rounded-3xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
           >
              <Check size={20} /> Değişiklikleri Kaydet
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredSuppliers.map(supplier => (
          <div key={supplier.id} className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] hover:border-primary/40 transition-all group">
            <div className="flex justify-between items-start mb-6">
               <div className="p-3 bg-black rounded-2xl text-primary flex items-center justify-center font-black text-xl">
                 {supplier.name.charAt(0)}
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">GÜNCEL BORÇ</span>
                  <span className="text-xl font-black text-white italic">{(supplier.balance || 0).toLocaleString('tr-TR')} ₺</span>
               </div>
            </div>
            
            <h3 className="text-lg font-black text-white mb-1 line-clamp-1">{supplier.name}</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8 italic">Aktif Tedarikçi</p>
            
            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-800/50">
               <button onClick={() => handleEdit(supplier)} className="px-4 py-2 bg-black text-white font-black text-xs rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                  <Edit size={14} /> Düzenle
               </button>
               <button onClick={() => handleDelete(supplier.id)} className="px-4 py-2 bg-rose-500/10 text-rose-500 font-black text-xs rounded-xl hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2">
                  <Trash2 size={14} /> Sil
               </button>
            </div>
          </div>
        ))}
      </div>

      {suppliers.length === 0 && !loading && (
        <div className="py-24 text-center">
           <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-700 mb-4 border-4 border-slate-900 shadow-inner">
              <Users size={32} />
           </div>
           <p className="text-slate-500 font-bold uppercase tracking-widest italic">Henüz bir tedarikçi eklenmemiş.</p>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
