import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Utensils, Globe, X, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const api = axios.create({ baseURL: 'https://api.uzpos.site' });

const LANGS = [
  { id: 'TR', name: 'Türkçe', flag: '🇹🇷' },
  { id: 'EN', name: 'English', flag: '🇺🇸' },
  { id: 'RU', name: 'Pусский', flag: '🇷🇺' },
  { id: 'AR', name: 'العربية', flag: '🇸🇦' }
];

const CATEGORY_KEYS = [
  'Kebab çeşitleri', 'Dürüm çeşitleri', 'Pide çeşitleri', 
  'Tepsi yemekleri', 'Çorba çeşitleri', 'Extralar', 'İçecekler'
];

const TRANSLATIONS = {
  TR: { 
    loading: 'Lezzetler Hazırlanıyor...', notFound: 'Ürün bulunamadı', menu: 'MENÜ', system: 'Dijital Menü Sistemi', close: 'Kapat', info: 'Ürün Bilgisi',
    cats: {
      'Kebab çeşitleri': 'Kebab Çeşitleri', 'Dürüm çeşitleri': 'Dürüm Çeşitleri', 'Pide çeşitleri': 'Pide Çeşitleri',
      'Tepsi yemekleri': 'Tepsi Yemekleri', 'Çorba çeşitleri': 'Çorba Çeşitleri', 'Extralar': 'Ekstralar', 'İçecekler': 'İçecekler'
    }
  },
  EN: { 
    loading: 'Preparing Flavors...', notFound: 'Product not found', menu: 'MENU', system: 'Digital Menu System', close: 'Close', info: 'Product Info',
    cats: {
      'Kebab çeşitleri': 'Kebabs', 'Dürüm çeşitleri': 'Wraps', 'Pide çeşitleri': 'Turkish Pizzas',
      'Tepsi yemekleri': 'Tray Dishes', 'Çorba çeşitleri': 'Soups', 'Extralar': 'Sides', 'İçecekler': 'Beverages'
    }
  },
  RU: { 
    loading: 'Hazırlanıyor...', notFound: 'Продукт не найден', menu: 'МЕНЮ', system: 'Цифровая Меню Cистема', close: 'Закрыть', info: 'Информация',
    cats: {
      'Kebab çeşitleri': 'Кебабы', 'Dürüm çeşitleri': 'Дурумы', 'Pide çeşitleri': 'Пиде',
      'Tepsi yemekleri': 'Блюда на подносе', 'Çorba çeşitleri': 'Супы', 'Extralar': 'Дополнительно', 'İçecekler': 'Напитки'
    }
  },
  AR: { 
    loading: 'جار التحضير...', notFound: 'لم يتم العثور على المنتج', menu: 'قائمة الطعام', system: 'نظام القائمة الرقمية', close: 'إغلاق', info: 'معلومات المنتج',
    cats: {
      'Kebab çeşitleri': 'أنواع الكباب', 'Dürüm çeşitleri': 'أنواع الدوم', 'Pide çeşitleri': 'أنواع البيدا',
      'Tepsi yemekleri': 'أطباق الصواني', 'Çorba çeşitleri': 'أنواع الشوربة', 'Extralar': 'إضافات', 'İçecekler': 'مشروبات'
    }
  }
};

const App = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Kebab çeşitleri');
  const [selectedLang, setSelectedLang] = useState('TR');
  const [showLangModal, setShowLangModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    api.get('/qr-menu/items')
      .then(res => setItems(res.data))
      .catch(err => console.error("Menü yükleme hatası:", err))
      .finally(() => setLoading(false));
  }, []);

  const t = TRANSLATIONS[selectedLang];
  
  // Filter products by the INTERNAL category name
  const filteredItems = items.filter(item => item.category === activeCategory);

  const getLocalizedDesc = (product) => {
    if (!product) return '';
    if (selectedLang === 'EN') return product.description_en || product.description;
    if (selectedLang === 'RU') return product.description_ru || product.description;
    if (selectedLang === 'AR') return product.description_ar || product.description;
    return product.description;
  };

  return (
    <div className={`min-h-screen bg-black text-white ${selectedLang === 'AR' ? 'font-serif' : ''}`} dir={selectedLang === 'AR' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-xl font-black italic tracking-tighter">UZPOS<span className="text-blue-500">{t.menu}</span></h1>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{t.system}</p>
          </motion.div>
          <button 
            onClick={() => setShowLangModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all font-bold text-xs"
          >
             <Globe size={16} className="text-blue-400" />
             {selectedLang}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Categories (Specific List) */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
           {CATEGORY_KEYS.map(catKey => (
             <button
               key={catKey}
               onClick={() => setActiveCategory(catKey)}
               className={`px-5 py-2.5 rounded-xl whitespace-nowrap font-bold text-[10px] uppercase tracking-widest transition-all ${
                 activeCategory === catKey ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 text-slate-500 hover:bg-white/10'
               }`}
             >
               {t.cats[catKey]}
             </button>
           ))}
        </div>

        {/* Menu Grid with Page Transition Effect */}
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, scale: 0.98, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.98, x: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {loading ? (
                <div className="col-span-full py-20 text-center animate-pulse text-slate-600 font-black uppercase tracking-widest text-[10px]">{t.loading}</div>
              ) : filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <motion.div 
                    layout
                    key={item.id} 
                    onClick={() => setSelectedProduct(item)}
                    className="group bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-xl cursor-pointer active:scale-95 transition-all flex flex-col"
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-900 shrink-0">
                      {/* Skeleton Placeholder */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 animate-pulse flex items-center justify-center">
                        <Utensils size={32} className="text-white/5" />
                      </div>

                      {item.image_url ? (
                        <motion.img 
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          src={item.image_url} 
                          alt={item.name} 
                          className="w-full h-full object-cover relative z-10 transition-opacity duration-700" 
                          loading={item.category === 'Kebab çeşitleri' ? 'eager' : 'lazy'}
                          onLoad={(e) => { e.target.style.opacity = 1; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-800 relative z-10"><Utensils size={32}/></div>
                      )}
                      
                      <div className={`absolute bottom-2 ${selectedLang === 'AR' ? 'left-2' : 'right-2'} px-3 py-1 bg-black/70 backdrop-blur-md rounded-lg font-black text-[11px] text-blue-400 border border-white/5 z-20`}>
                          {item.price.toLocaleString('tr-TR')} ₺
                      </div>
                    </div>

                    <div className="p-4 flex justify-between items-start grow">
                      <div>
                        <h3 className="text-sm font-bold tracking-tight text-slate-100 line-clamp-1">{item.name}</h3>
                        <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-tighter">{t.cats[item.category] || item.category}</p>
                      </div>
                      <Info size={14} className="text-slate-700 mt-1 shrink-0" />
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-20 text-slate-600 font-bold italic uppercase tracking-widest text-[10px]">{t.notFound}</div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        <footer className="py-10 text-center border-t border-white/5">
           <p className="text-slate-700 text-[8px] font-black uppercase tracking-[0.4em]">Powered by UzPos</p>
        </footer>
      </main>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-xl bg-black border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
                <div className="relative aspect-video sm:aspect-square shrink-0 overflow-hidden bg-slate-900">
                  {selectedProduct.image_url ? (
                      <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-800"><Utensils size={64}/></div>
                  )}
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className={`absolute top-6 ${selectedLang === 'AR' ? 'left-6' : 'right-6'} p-3 bg-black/50 backdrop-blur-xl rounded-full border border-white/10 hover:bg-white/10`}
                  >
                      <X size={24}/>
                  </button>
                </div>
                
                <div className="p-8 space-y-6 overflow-y-auto no-scrollbar">
                  <div className="flex justify-between items-center gap-4">
                      <h2 className="text-3xl font-black tracking-tight">{selectedProduct.name}</h2>
                      <span className="text-2xl font-black text-blue-500">{selectedProduct.price.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  
                  <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-white/5 pb-2">{t.info}</h4>
                      <p className="text-slate-300 font-medium leading-relaxed text-lg">
                        {getLocalizedDesc(selectedProduct) || (selectedLang === 'TR' ? 'Bu ürün için henüz bir açıklama eklenmemiş.' : 'No description available for this product.')}
                      </p>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all mt-8"
                  >
                      {t.close}
                  </button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Language Modal */}
      <AnimatePresence>
        {showLangModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
            >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black italic">Select Language</h2>
                  <button onClick={() => setShowLangModal(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20}/></button>
                </div>
                <div className="space-y-3">
                  {LANGS.map(l => (
                      <button 
                        key={l.id}
                        onClick={() => {
                          setSelectedLang(l.id);
                          setShowLangModal(false);
                        }}
                        className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all font-bold ${selectedLang === l.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'}`}
                      >
                        <span className="flex items-center gap-4">
                            <span className="text-2xl">{l.flag}</span>
                            {l.name}
                        </span>
                        {selectedLang === l.id && <Check size={20} />}
                      </button>
                  ))}
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
