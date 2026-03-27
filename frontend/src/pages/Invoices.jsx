import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, ShoppingCart, 
  Truck, Calendar, ChevronDown, Package,
  AlertCircle, CheckCircle2, RefreshCw, Calculator,
  Search, X, Edit, ArrowUpRight
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000' });

const Invoices = () => {
  const createEmptyRow = () => ({ 
    id: Math.random(), 
    ingredientId: '', 
    name: '', 
    qty: 0, 
    unit: 'Adet', 
    unitPrice: 0, 
    total: 0, 
    conversion: 1, 
    taxRate: 10,
    isTaxIncluded: false 
  });
  
  const [rows, setRows] = useState(Array.from({ length: 10 }, createEmptyRow));
  const [suppliers, setSuppliers] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [invoices, setInvoices] = useState([]);
  const [sortOrder, setSortOrder] = useState('byName'); // 'byName' or 'byDate'
  const [expandedSuppliers, setExpandedSuppliers] = useState(new Set());
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  
  // Ürün Ekleme/Düzenleme Modalı
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [modalData, setModalData] = useState({ 
    name: '', category: 'Genel', box_quantity: 1, tax_rate: 10, 
    supplier_id: '', purchase_unit: 'Adet', usage_unit: 'Adet' 
  });
  const [activeRowId, setActiveRowId] = useState(null);

  // 1. Tedarikçileri ve Ürünleri Getir
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [suppRes, ingRes] = await Promise.all([
          api.get('/suppliers'),
          api.get('/ingredients')
        ]);
        setSuppliers(suppRes.data || []);
        setAllIngredients(ingRes.data || []);
      } catch (err) {
        console.error("Veri yükleme hatası:", err);
        setError("Tedarikçiler veya ürünler yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  // 1.5 Faturaları Getir
  useEffect(() => {
    if (view === 'list') {
      const fetchInvoices = async () => {
        setLoading(true);
        try {
          const res = await api.get('/invoices');
          setInvoices(res.data || []);
        } catch (err) {
          console.error("Fatura yükleme hatası:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchInvoices();
    }
  }, [view, allIngredients]); // Refetch if ingredients change (optional, but keep it updated)

  const handleEditProduct = (ingredientId) => {
    const item = allIngredients.find(i => String(i.id) === String(ingredientId));
    if (item) {
      setEditingIngredientId(item.id);
      setModalData({
        name: item.name,
        category: item.category || 'Genel',
        box_quantity: item.box_quantity || 1,
        tax_rate: item.tax_rate || 10,
        supplier_id: item.supplier_id || '',
        purchase_unit: item.purchase_unit || 'Adet',
        usage_unit: item.usage_unit || 'Adet'
      });
      setShowProductModal(true);
    }
  };

  const updateRow = (id, field, value) => {
    try {
      setRows(prevRows => {
        const updatedRows = (prevRows || []).map(row => {
          if (row.id === id) {
            const newRow = { ...row, [field]: value };
            
            if (field === 'ingredientId') {
              const item = (allIngredients || []).find(i => String(i.id) === String(value));
              if (item) {
                newRow.name = item.name;
                newRow.conversion = item.box_quantity || 1;
                newRow.taxRate = item.tax_rate || 10;
                newRow.unit = item.purchase_unit || 'Adet';
                
                // Set default price from last cost
                if (newRow.unit === 'Koli' && item.last_unit_cost > 0) {
                  newRow.unitPrice = (item.last_unit_cost || 0) * (item.box_quantity || 1);
                } else {
                  newRow.unitPrice = item.last_unit_cost || 0;
                }
              }
            }
            if (field === 'unit') {
               const item = (allIngredients || []).find(i => String(i.id) === String(newRow.ingredientId));
               if (item) {
                 if (value === 'Koli') {
                    newRow.unitPrice = (item.last_unit_cost || 0) * (item.box_quantity || 1);
                 } else {
                    newRow.unitPrice = item.last_unit_cost || 0;
                 }
               }
            }

            // Calculation Central Logic
            const qty = Number(newRow.qty) || 0;
            const price = Number(newRow.unitPrice) || 0;
            const tax = Number(newRow.taxRate) || 0;
            
            if (newRow.isTaxIncluded) {
              newRow.total = Number((qty * price).toFixed(2));
            } else {
              newRow.total = Number(((qty * price) * (1 + tax / 100)).toFixed(2));
            }
            
            return newRow;
          }
          return row;
        });

        // 3 Boş Satır Mantığı
        let lastFilledIndex = -1;
        for (let i = updatedRows.length - 1; i >= 0; i--) {
          if (updatedRows[i].ingredientId !== '') {
            lastFilledIndex = i;
            break;
          }
        }
        const currentRowsCount = updatedRows.length;
        const requiredRowsCount = lastFilledIndex + 1 + 3;
        if (requiredRowsCount > currentRowsCount) {
          const diff = requiredRowsCount - currentRowsCount;
          for (let i = 0; i < diff; i++) {
            updatedRows.push(createEmptyRow());
          }
        }
        return updatedRows;
      });
    } catch (err) {
      console.error("Satır güncelleme hatası:", err);
    }
  };

  const addRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const removeRow = (id) => {
    if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
  };

  const handleSave = async () => {
    if (!selectedSupplier) return alert("Lütfen önce bir tedarikçi seçin!");
    
    setSaving(true);
    setError(null);
    try {
      const validRows = (rows || []).filter(r => r.ingredientId && r.ingredientId !== '' && String(r.ingredientId).toLowerCase() !== "none");
      if (validRows.length === 0) {
        setSaving(false);
        return alert("Lütfen en az bir geçerli ürün seçin!");
      }

      const totalAmount = validRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

      const payload = {
        supplier_id: String(selectedSupplier),
        invoice_date: invoiceDate,
        invoice_number: invoiceNumber || 'MANUEL-' + Date.now(),
        total_amount_gross: totalAmount,
        items: validRows.map(r => {
          const multiplier = r.unit === 'Koli' ? (Number(r.conversion) || 1) : 1;
          const tax = Number(r.taxRate) || 0;
          let basePrice = Number(r.unitPrice) || 0;
          
          // Adjust base price if KDV included
          if (r.isTaxIncluded) {
            basePrice = basePrice / (1 + tax / 100);
          }

          return {
            ingredient_id: String(r.ingredientId),
            quantity: (Number(r.qty) || 0) * multiplier,
            unit_price: basePrice / multiplier,
            total_price: (Number(r.qty) || 0) * basePrice,
            tax_rate: tax
          };
        })
      };

      if (editingInvoiceId) {
        await api.put(`/invoices/${editingInvoiceId}`, payload);
      } else {
        await api.post('/invoices', payload);
      }
      
      alert('Fatura başarıyla kaydedildi!');
      
      // Refresh local ingredients cache
      const ingRes = await api.get('/ingredients');
      setAllIngredients(ingRes.data || []);

      setRows(Array.from({ length: 10 }, createEmptyRow));
      setSelectedSupplier('');
      setInvoiceNumber('');
      setEditingInvoiceId(null);
      setView('list');
    } catch (err) {
      console.error("Kaydetme hatası:", err);
      setError("Fatura kaydedilirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditInvoice = async (inv) => {
    setLoading(true);
    try {
      const res = await api.get(`/invoices/${inv.id}`);
      const fullData = res.data;
      if (!fullData) return;

      setEditingInvoiceId(fullData.id);
      setSelectedSupplier(fullData.supplier_id);
      setInvoiceNumber(fullData.invoice_number);
      setInvoiceDate(fullData.invoice_date || new Date().toISOString().split('T')[0]);
      
      const mappedRows = (fullData.invoice_items || []).map(item => {
        const ing = item.ingredients || {};
        const isKoli = ing.purchase_unit === 'Koli';
        const conv = Number(ing.box_quantity) || 1;
        
        return {
          id: Math.random(),
          ingredientId: item.ingredient_id,
          name: ing.name || 'Ürün',
          qty: isKoli ? (item.quantity / conv) : item.quantity,
          unit: ing.purchase_unit || 'Adet',
          unitPrice: isKoli ? (item.unit_price * conv) : item.unit_price,
          total: item.total_price * (1 + (item.tax_rate || 10) / 100),
          conversion: conv,
          taxRate: item.tax_rate || 10,
          isTaxIncluded: false // We store base, we show base + calculated total
        };
      });
      
      while (mappedRows.length < 10) mappedRows.push(createEmptyRow());
      setRows(mappedRows);
      setView('create');
    } catch (err) {
      console.error("Fatura detay hatası:", err);
      alert("Fatura bilgileri yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm("Bu faturayı silmek istediğinize emin misiniz? (Stoklar geri çekilecektir)")) return;
    try {
      await api.delete(`/invoices/${id}`);
      setInvoices(invoices.filter(i => i.id !== id));
    } catch (err) {
      alert("Silme hatası!");
    }
  };

  const handleAddNewProduct = async () => {
    try {
      const payload = { ...modalData };
      let res;
      if (editingIngredientId) {
        res = await api.put(`/ingredients/${editingIngredientId}`, payload);
      } else {
        res = await api.post('/ingredients', payload);
      }
      
      if (res.data) {
        const product = res.data;
        // Refresh master list
        const allIngRes = await api.get('/ingredients');
        setAllIngredients(allIngRes.data || []);

        if (!editingIngredientId && activeRowId) {
          // Direct update to row without waiting for allIngredients refresh
          setRows(prev => prev.map(r => r.id === activeRowId ? {
            ...r,
            ingredientId: product.id,
            name: product.name,
            conversion: product.box_quantity || 1,
            taxRate: product.tax_rate || 10,
            unit: product.purchase_unit || 'Adet',
            unitPrice: product.last_unit_cost || 0,
            total: (Number(r.qty) || 0) * (product.last_unit_cost || 0)
          } : r));
        }
        
        setShowProductModal(false);
        setEditingIngredientId(null);
        setModalData({ name: '', category: 'Genel', box_quantity: 1, tax_rate: 10, supplier_id: '', purchase_unit: 'Adet', usage_unit: 'Adet' });
      }
    } catch (err) {
      console.error("Ürün kaydetme hatası:", err);
      alert("Ürün kaydedilirken bir hata oluştu!");
    }
  };

  const toggleSupplier = (suppName) => {
    setExpandedSuppliers(prev => {
      const next = new Set(prev);
      if (next.has(suppName)) next.delete(suppName);
      else next.add(suppName);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Package className="text-primary" size={32} />
            FATURA MERKEZİ
          </h1>
          <p className="text-slate-500 font-bold text-sm tracking-wide">
            {view === 'list' ? 'KAYITLI FATURALAR VE CARİ DURUM' : 'YENİ FATURA GİRİŞİ'}
          </p>
        </div>

        <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md">
          <button 
            onClick={() => setView('list')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'list' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
          >
            ARŞİV
          </button>
          <button 
            onClick={() => {
              setEditingInvoiceId(null);
              setRows(Array.from({ length: 10 }, createEmptyRow));
              setView('create');
            }}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'create' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
          >
            YENİ FATURA
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
           {/* Filters & Grid Header */}
           <div className="flex justify-between items-center mb-4">
             <div className="flex gap-2">
                <button 
                  onClick={() => setSortOrder('byName')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${sortOrder === 'byName' ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                >
                  İsme Göre
                </button>
                <button 
                  onClick={() => setSortOrder('byDate')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${sortOrder === 'byDate' ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                >
                  Tarihe Göre
                </button>
             </div>
           </div>

           {sortOrder === 'byName' ? (
             <div className="space-y-3">
               {/* Accordion List */}
               {suppliers.map(supp => {
                 const suppInvoices = invoices.filter(i => i.supplier_id === supp.id);
                 if (suppInvoices.length === 0) return null;
                 const isExpanded = expandedSuppliers.has(supp.name);

                 return (
                   <div key={supp.id} className="bg-slate-900/30 border border-slate-800/50 rounded-3xl overflow-hidden transition-all hover:border-slate-700">
                     <button 
                       onClick={() => toggleSupplier(supp.name)}
                       className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                     >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-primary border border-slate-800 shadow-xl">
                            <Truck size={24} />
                          </div>
                          <div className="text-left">
                            <h3 className="font-black text-white text-lg tracking-tight uppercase">{supp.name}</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{suppInvoices.length} FATURA</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Cari Bakiye</p>
                              <p className="text-xl font-black text-white tracking-tighter italic">{(supp.balance || 0).toLocaleString('tr-TR')} ₺</p>
                           </div>
                           <ChevronDown className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                     </button>

                     {isExpanded && (
                       <div className="px-8 pb-6 space-y-3 animate-in slide-in-from-top-2">
                         {suppInvoices.map(inv => (
                           <div key={inv.id} className="bg-black/40 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all">
                             <div className="flex gap-8">
                               <div>
                                 <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Tarih</p>
                                 <p className="text-sm font-bold text-slate-300">{new Date(inv.invoice_date).toLocaleDateString('tr-TR')}</p>
                               </div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Fatura No</p>
                                 <p className="text-sm font-bold text-slate-300 tracking-wider">#{inv.invoice_number}</p>
                               </div>
                               <div>
                                 <p className="text-[10px] font-black text-primary uppercase mb-1">Tutar</p>
                                 <p className="text-sm font-black text-emerald-400 italic">{(inv.total_amount_gross || 0).toLocaleString('tr-TR')} ₺</p>
                               </div>
                             </div>
                             <div className="flex gap-2">
                               <button onClick={() => handleEditInvoice(inv)} className="p-2 text-slate-500 hover:text-primary transition-colors hover:bg-primary/10 rounded-xl"><Edit size={16} /></button>
                               <button onClick={() => handleDeleteInvoice(inv.id)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors hover:bg-rose-500/10 rounded-xl"><Trash2 size={16} /></button>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="bg-slate-900/30 border border-slate-800 rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tarih</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tedarikçi</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fatura No</th>
                      <th className="px-6 py-5 text-[10px] font-black text-primary uppercase tracking-widest text-right">Tutar</th>
                      <th className="px-8 py-5 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {invoices.sort((a,b) => new Date(b.invoice_date) - new Date(a.invoice_date)).map(inv => (
                      <tr key={inv.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-8 py-4 font-bold text-slate-400 text-sm whitespace-nowrap">{new Date(inv.invoice_date).toLocaleDateString('tr-TR')}</td>
                        <td className="px-6 py-4 font-black text-white uppercase tracking-tight">{inv.supplier_name || 'Bilinmeyen'}</td>
                        <td className="px-6 py-4 font-bold text-slate-500 text-sm italic">#{inv.invoice_number}</td>
                        <td className="px-6 py-4 text-right font-black text-emerald-400 italic text-lg">{(inv.total_amount_gross || 0).toLocaleString('tr-TR')} ₺</td>
                        <td className="px-8 py-4 text-right flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditInvoice(inv)} className="p-2 text-slate-500 hover:text-primary transition-colors"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteInvoice(inv.id)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
           )}
        </div>
      ) : (
        <div className="animate-in slide-in-from-right-8 duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Header Form */}
            <div className="lg:col-span-3 space-y-6">
               <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[3rem] shadow-2xl backdrop-blur-sm">
                  <div className="flex flex-wrap items-end gap-8 mb-10">
                    <div className="flex-1 min-w-[300px]">
                      <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 ml-2 flex items-center gap-2">
                        <Truck size={12} className="text-primary" /> Tedarikçi Seçimi
                      </label>
                      <select 
                        value={selectedSupplier}
                        onChange={(e) => setSelectedSupplier(e.target.value)}
                        className="w-full bg-black border-2 border-slate-800 p-4 rounded-3xl text-sm font-black text-white hover:border-primary/50 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">İlgili firmayı seçin...</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (Bakiye: {s.balance} ₺)</option>)}
                      </select>
                    </div>
                    <div className="w-48">
                      <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 ml-2 flex items-center gap-2">
                        <Calendar size={12} className="text-primary" /> Fatura Tarihi
                      </label>
                      <input 
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full bg-black border-2 border-slate-800 p-4 rounded-3xl text-sm font-black text-white hover:border-primary/50 focus:border-primary transition-all cursor-pointer"
                      />
                    </div>
                    <div className="w-64">
                       <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 ml-2">Fatura Numarası</label>
                       <input 
                         type="text"
                         placeholder="Örn: ABC20240001"
                         className="w-full bg-black border-2 border-slate-800 p-4 rounded-3xl text-sm font-black text-white hover:border-primary/50 focus:border-primary transition-all uppercase placeholder:text-slate-800 tracking-wider"
                         value={invoiceNumber}
                         onChange={(e) => setInvoiceNumber(e.target.value)}
                       />
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="border-b-2 border-slate-800/50">
                          <th className="pb-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Stok Ürünü / Hizmet</th>
                          <th className="pb-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Birim</th>
                          <th className="pb-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center px-4">Miktar</th>
                          <th className="pb-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">B. Fiyat (₺)</th>
                          <th className="pb-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center px-4 w-48">Vergi (KDV)</th>
                          <th className="pb-5 text-[10px] font-black text-primary uppercase tracking-widest text-right pr-4">Satır Toplamı</th>
                          <th className="pb-5 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => (
                          <tr key={row.id} className="border-b border-slate-800/10 group">
                            <td className="py-2 pr-4 relative">
                              <div className="flex items-center gap-2 w-full">
                                <AutoCompleteInput 
                                  value={row.ingredientId}
                                  items={allIngredients}
                                  onSelect={(val) => updateRow(row.id, 'ingredientId', val)}
                                  onAddNew={(term) => {
                                    setActiveRowId(row.id);
                                    setEditingIngredientId(null);
                                    setModalData({ 
                                      name: term || '', 
                                      category: 'Genel', 
                                      box_quantity: 1, 
                                      tax_rate: 10, 
                                      supplier_id: selectedSupplier, 
                                      purchase_unit: 'Adet', 
                                      usage_unit: 'Adet' 
                                    });
                                    setShowProductModal(true);
                                  }}
                                  placeholder={idx + 1 + ". Satır Ürün Ara..."}
                                />
                                {row.ingredientId && (
                                  <button 
                                    onClick={() => handleEditProduct(row.ingredientId)}
                                    className="p-2 text-slate-600 hover:text-primary transition-colors bg-white/5 rounded-xl border border-slate-800"
                                    title="Ürün Kartını Düzenle"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-2 text-center">
                              <select 
                                value={row.unit}
                                onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                                className="bg-transparent border-none text-xs font-black text-white uppercase text-center cursor-pointer focus:ring-0"
                              >
                                <option value="Adet">Adet</option>
                                <option value="KG">Kilogram</option>
                                <option value="Litre">Litre</option>
                                <option value="Koli">Koli ({row.conversion || 24})</option>
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <input 
                                type="number"
                                className="w-20 bg-black/40 border-none rounded-xl py-2 px-1 text-center font-bold text-white focus:ring-1 focus:ring-primary h-[38px]"
                                value={row.qty === 0 ? '' : row.qty}
                                onChange={(e) => updateRow(row.id, 'qty', Number(e.target.value))}
                              />
                            </td>
                            <td className="py-2">
                              <input 
                                type="number"
                                className="w-full min-w-[100px] bg-black/40 border-none rounded-xl py-2 px-4 text-center font-bold text-white focus:ring-1 focus:ring-primary h-[38px] italic"
                                value={row.unitPrice === 0 ? '' : row.unitPrice}
                                placeholder="0.00"
                                onChange={(e) => updateRow(row.id, 'unitPrice', Number(e.target.value))}
                              />
                            </td>
                            <td className="py-2 px-4">
                              <div className="flex items-center gap-2 justify-center bg-black/40 rounded-xl px-2 h-[38px]">
                                <input 
                                  type="number"
                                  className="w-10 bg-transparent border-none p-0 text-center font-bold text-white focus:ring-0 text-sm"
                                  value={row.taxRate}
                                  onChange={(e) => updateRow(row.id, 'taxRate', Number(e.target.value))}
                                />
                                <span className="text-slate-700 font-bold text-xs">%</span>
                                <button 
                                  onClick={() => updateRow(row.id, 'isTaxIncluded', !row.isTaxIncluded)}
                                  className={`p-1.5 rounded-lg border transition-all ${
                                    row.isTaxIncluded ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-white'
                                  }`}
                                  title={row.isTaxIncluded ? "KDV Dahil (Ayırmak için tıkla)" : "KDV Hariç (Dahil etmek için tıkla)"}
                                >
                                  <Calculator size={12} />
                                </button>
                                {row.isTaxIncluded && <span className="text-[8px] font-black text-primary uppercase ml-1 opacity-60">DAHİL</span>}
                              </div>
                            </td>
                            <td className="py-2 text-right">
                               <div className="font-black text-white italic tracking-tighter text-lg pr-4 animate-in fade-in zoom-in duration-300">
                                 {(row.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                               </div>
                            </td>
                            <td className="py-2 text-right">
                               <button 
                                 onClick={() => removeRow(row.id)}
                                 className="p-2 text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                               >
                                 <X size={16} />
                               </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-10 flex justify-between items-start">
                    <button 
                      onClick={addRow}
                      className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black flex items-center gap-2 uppercase tracking-wide transition-all active:scale-95"
                    >
                      <Plus size={16} /> Yeni Satır Ekle
                    </button>

                    <div className="space-y-4 min-w-[320px] bg-slate-900/60 p-8 rounded-[3rem] border border-slate-800 shadow-3xl">
                       <div className="space-y-3 px-2">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ara Toplam</span>
                           <span className="font-bold text-slate-300 text-sm">
                             {rows.reduce((sum, r) => {
                               const rowTotal = Number(r.total) || 0;
                               const taxRate = Number(r.taxRate) || 10;
                               const sub = rowTotal / (1 + taxRate / 100);
                               return sum + sub;
                             }, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                           </span>
                         </div>
                         <div className="flex justify-between items-center pb-4 border-b border-slate-800/50">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">KDV Toplam</span>
                           <span className="font-bold text-primary text-sm">
                             {(rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0) - rows.reduce((sum, r) => {
                               const rowTotal = Number(r.total) || 0;
                               const taxRate = Number(r.taxRate) || 10;
                               return sum + (rowTotal / (1 + taxRate / 100));
                             }, 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                           </span>
                         </div>
                       </div>

                       <div className="flex justify-between items-center pt-2">
                          <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Genel Toplam</p>
                            <p className="text-4xl font-black text-white tracking-tighter italic">
                              {rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                            </p>
                          </div>
                          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                            <ShoppingCart size={28} />
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Save Sidebar */}
            <div className="lg:col-span-1">
               <div className="sticky top-8 space-y-4">
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl relative overflow-hidden group">
                    <Save className="absolute -right-4 -bottom-4 text-primary opacity-5 group-hover:opacity-10 transition-opacity" size={160} />
                    <h3 className="text-lg font-black text-white mb-2 italic">HAZIRSA KAYDET</h3>
                    <p className="text-xs text-slate-500 font-medium mb-8 leading-relaxed">Fatura işlendiği andan itibaren stoklar güncellenecek ve tedarikçi bakiyesine borç olarak yansıtılacaktır.</p>
                    
                    <button 
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-sm tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 relative z-10"
                    >
                      {saving ? (
                        <RefreshCw className="animate-spin" size={20} />
                      ) : (
                        <>
                          <CheckCircle2 size={20} />
                          {editingInvoiceId ? 'GÜNCELLE' : 'SİSTEME İŞLE'}
                        </>
                      )}
                    </button>

                    {error && (
                      <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2 text-rose-500 text-xs font-bold animate-pulse">
                        <AlertCircle size={14} /> {error}
                      </div>
                    )}
                  </div>

                  <div className="p-8 bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] backdrop-blur-sm">
                     <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Mutfak Önemli</h4>
                     <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic italic">Fatura düzenleme modundayken yaptığınız her değişiklik eskileri silecek ve stokları yeniye göre teraziye alacaktır.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Ürün Modal (Create/Edit) */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[3rem] p-10 shadow-3xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <h2 className="text-2xl font-black text-white italic tracking-tighter">{editingIngredientId ? 'ÜRÜNÜ DÜZENLE' : 'YENİ ÜRÜN OLUŞTUR'}</h2>
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Stok ve Birim Ayarları</p>
                </div>
                <button 
                  onClick={() => setShowProductModal(false)}
                  className="p-3 bg-black rounded-2xl text-slate-500 hover:text-white transition-colors"
                >
                   <X size={20} />
                </button>
             </div>

             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                     <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Ürün Adı</label>
                     <input 
                       type="text"
                       className="w-full bg-black border-2 border-slate-800 p-4 rounded-3xl text-sm font-black text-white focus:border-primary transition-all outline-none"
                       placeholder="Örn: Kola 330ml"
                       value={modalData.name}
                       onChange={(e) => setModalData({...modalData, name: e.target.value})}
                     />
                  </div>
                  <div className="col-span-1">
                     <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Kategori</label>
                     <input 
                       type="text"
                       className="w-full bg-black border-2 border-slate-800 p-4 rounded-3xl text-sm font-black text-white focus:border-primary transition-all outline-none"
                       placeholder="Örn: İçecek"
                       value={modalData.category}
                       onChange={(e) => setModalData({...modalData, category: e.target.value})}
                     />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Alım Birimi</label>
                    <select 
                      className="w-full bg-black border-2 border-slate-800 p-4 rounded-3xl text-sm font-black text-white focus:border-primary outline-none"
                      value={modalData.purchase_unit}
                      onChange={(e) => setModalData({...modalData, purchase_unit: e.target.value})}
                    >
                      <option value="Adet">Adet</option>
                      <option value="Koli">Koli</option>
                      <option value="KG">Kilogram</option>
                      <option value="Litre">Litre</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Koli İçi Adet</label>
                    <input 
                      type="number"
                      className="w-full bg-black border-2 border-slate-800 p-4 rounded-3xl text-sm font-black text-white focus:border-primary outline-none"
                      value={modalData.box_quantity}
                      onChange={(e) => setModalData({...modalData, box_quantity: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">KDV (%)</label>
                    <input 
                      type="number"
                      className="w-full bg-black border-2 border-slate-800 p-4 rounded-3xl text-sm font-black text-white focus:border-primary outline-none"
                      value={modalData.tax_rate}
                      onChange={(e) => setModalData({...modalData, tax_rate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest text-primary">Kullanım Birimi (Reçete)</label>
                    <select 
                      className="w-full bg-black border-2 border-slate-800 p-4 rounded-3xl text-sm font-black text-white focus:border-primary outline-none"
                      value={modalData.usage_unit}
                      onChange={(e) => setModalData({...modalData, usage_unit: e.target.value})}
                    >
                      <option value="Adet">Adet</option>
                      <option value="Gram">Gram</option>
                      <option value="ML">ML</option>
                      <option value="Dilim">Dilim</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleAddNewProduct}
                  className="w-full bg-primary text-white py-5 rounded-[2.2rem] font-black text-sm tracking-widest shadow-xl shadow-primary/20 mt-4 hover:scale-[1.02] active:scale-95 transition-all"
                >
                   {editingIngredientId ? 'BİLGİLERİ GÜNCELLE' : 'ÜRÜNÜ SİSTEME EKLE'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Alt Bileşenler ---

const AutoCompleteInput = ({ value, items, onSelect, onAddNew, placeholder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showList, setShowList] = useState(false);
  const containerRef = React.useRef(null);

  useEffect(() => {
    if (value) {
      const match = items.find(i => String(i.id) === String(value));
      if (match) setSearchTerm(match.name);
    } else {
      setSearchTerm('');
    }
  }, [value, items]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input 
          type="text"
          className="w-full bg-black/40 border-none rounded-2xl py-2 px-4 pr-10 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 h-[38px] placeholder:text-slate-700"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowList(true);
            if (!e.target.value) onSelect('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filtered.length > 0) {
              onSelect(filtered[0].id);
              setSearchTerm(filtered[0].name);
              setShowList(false);
            }
          }}
          onFocus={() => setShowList(true)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700">
           <Search size={14} />
        </div>
      </div>

      {showList && (searchTerm.length > 0 || filtered.length > 0) && (
        <div className="absolute z-[110] left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="max-h-64 overflow-y-auto">
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  setSearchTerm(item.name);
                  setShowList(false);
                }}
                className="w-full px-6 py-3.5 text-left hover:bg-white/5 transition-colors border-b border-slate-800/50 flex justify-between items-center group"
              >
                <div>
                  <p className="text-sm font-black text-white group-hover:text-primary transition-colors">{item.name}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.category} • {item.purchase_unit} • {item.tax_rate}% KDV</p>
                </div>
                <ArrowUpRight size={14} className="text-slate-700 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            ))}
            
            <button 
              onClick={() => {
                onAddNew(searchTerm);
                setShowList(false);
              }}
              className="w-full px-6 py-4 text-left bg-black/40 text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-3 font-black text-xs tracking-tight"
            >
              <Plus size={16} /> 
              "{searchTerm}" İLE YENİ ÜRÜN OLUŞTUR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
