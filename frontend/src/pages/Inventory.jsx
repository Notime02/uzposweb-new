import React, { useState, useEffect } from 'react';
import { 
  Package, TrendingUp, AlertTriangle, Search, 
  Grid, List, Filter, ShoppingCart, 
  ArrowUpRight, Calculator, Plus, Edit, Trash2, Check, X
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' });

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [margin, setMargin] = useState(20);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ 
    stock_quantity: 0, 
    is_menu: false, is_saleable: false,
    purchase_unit: 'Adet', usage_unit: 'Adet', 
    sales_price: 0,
    supplier_id: '', box_quantity: 1,
    name: '', category: 'Kebab çeşitleri',
    tax_rate: 10,
    last_unit_cost: 0,
    unit_conversion_factor: 1
  });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await api.get('/ingredients');
        setItems(res.data || []);
      } catch (err) {
        console.error("Envanter yükleme hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    const fetchSuppliers = async () => {
      try {
        const res = await api.get('/suppliers');
        setSuppliers(res.data || []);
      } catch (err) {
        console.error("Tedarikçi yükleme hatası:", err);
      }
    };
    fetchItems();
    fetchSuppliers();
  }, []);

  const filteredItems = (items || []).filter(i => 
    (i.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateSuggestedPrice = (cost, taxPercent = 10) => {
    const costWithTax = (Number(cost) || 0) * (1 + taxPercent / 100);
    return costWithTax * (1 + margin / 100);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({ 
      ...item, 
      purchase_unit: item.purchase_unit || 'Adet',
      usage_unit: item.usage_unit || 'Adet',
      sales_price: item.sales_price || 0,
      supplier_id: item.supplier_id || '',
      box_quantity: item.box_quantity || 1,
      tax_rate: item.tax_rate || 10,
      last_unit_cost: item.last_unit_cost || 0,
      unit_conversion_factor: item.unit_conversion_factor || 1
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/ingredients/${id}`);
      setItems(items.filter(i => i.id !== id));
    } catch (err) {
      alert("Silme hatası!");
    }
  };

  const handleSave = async () => {
    try {
      if (editingItem && editingItem.id) {
        const { id, last_unit_cost, ...updatePayload } = { ...form };
        
        // Ensure numbers are numbers
        updatePayload.stock_quantity = Number(updatePayload.stock_quantity);
        updatePayload.sales_price = Number(updatePayload.sales_price);
        updatePayload.box_quantity = Number(updatePayload.box_quantity);
        updatePayload.tax_rate = Number(updatePayload.tax_rate);
        updatePayload.last_unit_cost = Number(updatePayload.last_unit_cost);
        updatePayload.unit_conversion_factor = Number(updatePayload.unit_conversion_factor);
        
        // Sanitize IDs
        if (!updatePayload.supplier_id || updatePayload.supplier_id === 'undefined') {
          updatePayload.supplier_id = null;
        }
        
        await api.put(`/ingredients/${editingItem.id}`, updatePayload);
        setItems(items.map(i => i.id === editingItem.id ? { ...i, ...form, id: editingItem.id } : i));
        setEditingItem(null);
      } else {
        const createPayload = {
          name: form.name,
          category: form.category || 'Genel',
          stock_quantity: Number(form.stock_quantity) || 0,
          sales_price: Number(form.sales_price) || 0,
          is_menu: Boolean(form.is_menu),
          is_saleable: Boolean(form.is_saleable),
          purchase_unit: form.purchase_unit || 'Adet',
          usage_unit: form.usage_unit || 'Adet',
          supplier_id: (form.supplier_id && form.supplier_id !== 'undefined') ? String(form.supplier_id) : null,
          box_quantity: Number(form.box_quantity) || 1,
          tax_rate: Number(form.tax_rate) || 10,
          last_unit_cost: Number(form.last_unit_cost) || 0,
          unit_conversion_factor: Number(form.unit_conversion_factor) || 1
        };
        const res = await api.post('/ingredients', createPayload);
        if (res.data) setItems([...items, res.data]);
      }
      setForm({ 
        name: '', category: 'Kebab çeşitleri', sales_price: 0, 
        stock_quantity: 0,
        is_menu: false, is_saleable: false,
        purchase_unit: 'Adet', usage_unit: 'Adet', box_quantity: 1, supplier_id: '',
        tax_rate: 10, last_unit_cost: 0, unit_conversion_factor: 1
      });
    } catch (err) {
      console.error("Envanter kaydetme hatası:", err);
      const msg = err.response?.data?.detail || err.message || "Bilinmeyen hata";
      alert(`Kaydetme hatası: ${msg}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Envanter & Stok</h1>
          <p className="text-slate-500 font-medium mt-1 italic">Depo ürünleri, maliyetler ve akıllı fiyatlandırma.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Ürün ara..." 
              className="pl-10 pr-4 py-2 bg-black border-none rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 w-48 md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex border-l border-slate-800 ml-2 pl-2 gap-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-800'}`}
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-800'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 opacity-50">
              {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-900 rounded-3xl animate-pulse"></div>)}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] hover:border-primary/30 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(item)} className="p-2 bg-black/60 rounded-xl text-slate-400 hover:text-primary transition-all backdrop-blur-sm shadow-xl">
                       <Edit size={16} />
                    </button>
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-black rounded-2xl text-primary"><Package size={24} /></div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      item.stock_quantity < 10 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {item.stock_quantity} {item.purchase_unit || 'Adet'}
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-white mb-1 group-hover:text-primary transition-colors">{item.name}</h3>
                  <div className="flex gap-2 mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">{item.category}</p>
                    {item.is_saleable && <span className="bg-rose-500/20 text-rose-400 text-[8px] px-2 py-0.5 rounded font-black border border-rose-500/30">SATIŞTA</span>}
                    {item.is_menu && <span className="bg-blue-500/20 text-blue-400 text-[8px] px-2 py-0.5 rounded font-black border border-blue-500/30">MENÜ</span>}
                  </div>
                  
                  <div className="pt-4 border-t border-slate-800 grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] font-black text-slate-600 uppercase">Maliyet</p>
                      <p className="text-sm font-bold text-white">{item.last_unit_cost?.toLocaleString('tr-TR')} ₺</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-rose-400 uppercase">Satış</p>
                      <p className="text-sm font-black text-white italic">{item.sales_price?.toLocaleString('tr-TR')} ₺</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-primary uppercase">Önerilen</p>
                      <p className="text-sm font-black text-emerald-400 italic">
                        {calculateSuggestedPrice(item.last_unit_cost, item.tax_rate).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ₺
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                     <button onClick={() => handleEdit(item)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"><Edit size={14} /></button>
                     <button onClick={() => handleDelete(item.id)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900/30 rounded-[2rem] border border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-800">
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Ürün Adı</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Kategori</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Stok</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Maliyet</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-rose-500 tracking-widest text-right">S. Fiyatı</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-emerald-500 tracking-widest text-right">Önerilen</th>
                    <th className="px-4 py-5 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(filteredItems || []).map(item => (
                    <tr key={item.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-8 py-4 font-bold text-white flex items-center gap-3">
                        {item.name || 'İsimsiz'}
                        <div className="flex gap-1">
                          {item.is_saleable && <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" title="Satışta"></span>}
                          {item.is_menu && <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" title="Menüde"></span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{item.category || 'Kategori Yok'}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-300">{item.stock_quantity || 0} {item.purchase_unit || 'Adet'}</td>
                      <td className="px-6 py-4 text-right font-bold text-white">{item.last_unit_cost || 0} ₺</td>
                      <td className="px-6 py-4 text-right font-black text-white italic">{item.sales_price || 0} ₺</td>
                      <td className="px-8 py-4 text-right font-black text-emerald-400 italic">
                        {calculateSuggestedPrice(item.last_unit_cost || 0, item.tax_rate).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-4 py-4 text-right flex gap-2 justify-end">
                         <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-500 hover:text-white transition-colors"><Edit size={16} /></button>
                         <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar Tools */}
        <div className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 p-8 rounded-[2.5rem] relative overflow-hidden">
            <Calculator className="absolute -right-4 -bottom-4 text-primary opacity-10" size={120} />
            <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
              <TrendingUp size={20} /> Akıllı Fiyatçı
            </h2>
            <p className="text-xs font-bold text-primary uppercase mb-6 tracking-widest">Kâr Marjı % Hesabı</p>
            
            <div className="space-y-4 relative z-10">
              <div className="bg-black/40 p-4 rounded-2xl">
                <input 
                  type="range" min="1" max="100" 
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                />
                <div className="flex justify-between mt-3 px-1">
                  <span className="text-xs font-black text-white tracking-widest">HEDEF KÂR:</span>
                  <span className="text-xl font-black text-primary italic">%{margin}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-medium italic leading-relaxed">
                Maliyet ve ürünün kendi KDV oranı üzerine yukarıdaki kâr marjını ekleyerek önerilen fiyatları anlık günceller.
              </p>
            </div>
          </div>

          {editingItem && (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] space-y-4 animate-in slide-in-from-right-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-white uppercase tracking-tight italic">Ürün Düzenle</h2>
                <button onClick={() => setEditingItem(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Ürün Adı</label>
                  <input 
                    className="w-full bg-black border-none rounded-xl py-2 px-4 text-sm font-bold text-white mt-1"
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Kategori Seçimi</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      'Kebab çeşitleri', 'Dürüm çeşitleri', 'Pide çeşitleri', 
                      'Tepsi yemekleri', 'Çorba çeşitleri', 'Extralar', 'İçecekler'
                    ].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setForm({...form, category: cat})}
                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                          form.category === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-black text-slate-500 border border-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Satın Alma Birimi</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['Adet', 'KG', 'Koli', 'Litre', 'Paket'].map(u => (
                      <button 
                        key={u}
                        onClick={() => setForm({...form, purchase_unit: u})}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                          form.purchase_unit === u ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-black text-slate-500 border border-slate-800'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest text-primary">Kullanım Birimi (Reçete)</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['Adet', 'Gram', 'ML', 'Dilim'].map(u => (
                      <button 
                        key={u}
                        onClick={() => setForm({...form, usage_unit: u})}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                          form.usage_unit === u ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-black text-slate-500 border border-slate-800'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Koli İçi Miktar</label>
                    <div className="relative mt-1">
                      <input 
                        type="number"
                        className="w-full bg-black border-none rounded-xl py-2 px-4 text-sm font-bold text-white pr-10"
                        value={form.box_quantity} onChange={e => setForm({...form, box_quantity: Number(e.target.value)})}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 uppercase">Birim</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest text-primary">Bağlı Firma</label>
                    <select 
                      className="w-full bg-black border-none rounded-xl py-2 px-4 text-xs font-bold text-white mt-1 h-[38px] appearance-none cursor-pointer"
                      value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})}
                    >
                      <option value="">Seçilmedi</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Alış KDV (%)</label>
                    <input 
                      type="number"
                      className="w-full bg-black border-none rounded-xl py-2 px-4 text-sm font-bold text-white mt-1"
                      value={form.tax_rate} onChange={e => setForm({...form, tax_rate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest text-emerald-500">Satış Fiyatı (₺)</label>
                    <input 
                      type="number"
                      className="w-full bg-black border-none rounded-xl py-2 px-4 text-sm font-bold text-white mt-1"
                      value={form.sales_price} onChange={e => setForm({...form, sales_price: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest text-primary">Birim Alış Maliyeti (₺)</label>
                    <input 
                      type="number"
                      className="w-full bg-black border-none rounded-xl py-2 px-4 text-sm font-bold text-white mt-1 border border-primary/20"
                      value={form.last_unit_cost} onChange={e => setForm({...form, last_unit_cost: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest text-primary">Birim Dönüştürme Katsayısı</label>
                    <input 
                      type="number"
                      className="w-full bg-black border-none rounded-xl py-2 px-4 text-sm font-bold text-white mt-1 border border-primary/20"
                      value={form.unit_conversion_factor} onChange={e => setForm({...form, unit_conversion_factor: Number(e.target.value)})}
                      placeholder="Örn: Gram için 1000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setForm({...form, is_saleable: !form.is_saleable})}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                      form.is_saleable ? 'bg-rose-500/10 border-rose-500/50 text-rose-500' : 'bg-black border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                      form.is_saleable ? 'bg-rose-500 border-rose-500' : 'border-slate-800'
                    }`}>
                      {form.is_saleable && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Satışta mı?</span>
                  </div>
                  <div 
                    onClick={() => setForm({...form, is_menu: !form.is_menu})}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                      form.is_menu ? 'bg-blue-500/10 border-blue-500/50 text-blue-500' : 'bg-black border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                      form.is_menu ? 'bg-blue-500 border-blue-500' : 'border-slate-800'
                    }`}>
                      {form.is_menu && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Menü Ürünü</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleSave}
                className="w-full bg-primary text-white font-black py-4 rounded-3xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/10"
              >
                 <Check size={20} /> Güncelle
              </button>
            </div>
          )}

          {!editingItem && (
            <button 
              onClick={() => {
                setEditingItem({});
                setForm({ 
                  name: '', category: 'Kebab çeşitleri', sales_price: 0, 
                  stock_quantity: 0,
                  is_menu: false, is_saleable: false,
                  purchase_unit: 'Adet', usage_unit: 'Adet', box_quantity: 1, supplier_id: '',
                  tax_rate: 10
                });
              }}
              className="w-full bg-white text-black font-black py-4 rounded-3xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-xl shadow-white/5 active:scale-95"
            >
               <Plus size={20} /> Yeni Ürün Ekle
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;
