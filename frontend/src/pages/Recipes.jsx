import React, { useState, useEffect } from 'react';
import { 
  Utensils, Layers, Calculator, AlertCircle, 
  ChevronRight, Plus, Info, TrendingUp, Trash2
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000' });

const RecipeCard = ({ recipe, onSelect }) => (
  <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2.5rem] hover:border-primary/50 transition-all group cursor-pointer" onClick={() => onSelect(recipe)}>
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-black rounded-2xl text-primary relative">
        <Utensils size={24} />
        {recipe.price_changed && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white animate-pulse border-2 border-slate-900">
            !
          </span>
        )}
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Maliyet</span>
        <span className="text-xl font-black text-white italic">{(recipe.current_cost || recipe.cost || 0).toLocaleString('tr-TR')} ₺</span>
      </div>
    </div>
    <div className="flex items-center gap-2 mb-1">
      <h3 className="text-lg font-black text-white uppercase tracking-tight">{recipe.name}</h3>
      {recipe.price_changed && (
        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-tighter">
          ❗ Fiyat Değişti
        </span>
      )}
    </div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">{recipe.category || 'Kategori Yok'}</p>
    
    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
      <div className="flex -space-x-2">
         {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border border-black text-[8px] flex items-center justify-center font-bold text-slate-500">M</div>)}
         <div className="w-6 h-6 rounded-full bg-primary text-[8px] flex items-center justify-center font-black text-white border border-black">+{recipe.ingredients?.length || 0}</div>
      </div>
      <div className="flex items-center gap-3">
         <button 
           onClick={(e) => { e.stopPropagation(); recipe.onDelete(recipe.id); }}
           className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
         >
           <Trash2 size={18} />
         </button>
         <ChevronRight size={18} className="text-slate-600 group-hover:text-primary transition-colors" />
      </div>
    </div>
  </div>
);

const Recipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const res = await api.get('/recipes');
        setRecipes(res.data || []);
      } catch (err) {
        console.error("Reçete yükleme hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Bu reçeteyi silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/recipes/${id}`);
      setRecipes(recipes.filter(r => r.id !== id));
      if (selectedRecipe?.id === id) setSelectedRecipe(null);
    } catch (err) {
      alert("Silme hatası!");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Reçeteler & Operasyon</h1>
          <p className="text-slate-500 font-medium mt-1 italic italic">Fiyat dalgalanmalarını ve fire oranlarını kontrol edin.</p>
        </div>
        <button className="flex items-center gap-2 px-8 py-3 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5">
           <Plus size={20} /> Yeni Reçete Hazırla
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Side: Recipe List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {(recipes || []).map(r => (
              <RecipeCard key={r?.id || Math.random()} recipe={{...r, onDelete: handleDelete}} onSelect={setSelectedRecipe} />
            ))}
          </div>
        </div>

        {/* Right Side: Analysis Panel */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] sticky top-8">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              <Layers size={20} className="text-primary" /> Analiz Paneli
            </h2>
            
            {selectedRecipe ? (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Seçili Ürün</p>
                   <p className="text-2xl font-black text-white leading-tight">{selectedRecipe.name}</p>
                </div>
                                <div className="p-4 bg-black rounded-2xl space-y-3">
                   <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-500">Hammadde Maliyeti</span>
                      <span className="text-white">{((selectedRecipe?.current_cost || 0) * 0.8).toLocaleString('tr-TR')} ₺</span>
                   </div>
                   <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-500">Fire & Ek Gider</span>
                      <span className="text-primary">{((selectedRecipe?.current_cost || 0) * 0.2).toLocaleString('tr-TR')} ₺</span>
                   </div>
                   <div className="pt-3 border-t border-slate-800 flex justify-between items-center font-black">
                      <span className="text-slate-400">TOPLAM MALİYET</span>
                      <span className="text-xl text-white italic">{(selectedRecipe?.current_cost || 0).toLocaleString('tr-TR')} ₺</span>
                   </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <TrendingUp size={18} className="text-emerald-500" />
                      <span className="text-xs font-black text-emerald-500 uppercase">Kâr Marjı</span>
                   </div>
                   <span className="text-lg font-black text-emerald-400">%35</span>
                </div>

                <p className="text-[10px] text-slate-500 italic font-medium">
                   * Bu maliyet özyinelemeli (recursive) hesaplanmıştır. Alt reçeteler ve fire oranları dahildir.
                </p>
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
                 <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600">
                    <Info size={32} />
                 </div>
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed px-4">
                    Detaylı maliyet ve fire analizi için sol taraftan bir reçete seçin.
                 </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recipes;
