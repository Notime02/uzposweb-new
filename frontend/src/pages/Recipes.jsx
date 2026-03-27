import React, { useState, useEffect } from 'react';
import { 
  Utensils, Layers, Calculator, AlertCircle, 
  ChevronRight, Plus, Info, TrendingUp, Trash2, Edit, X, Save, Search
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000' });

const EditRecipeModal = ({ recipe, onClose, onSave, ingredients }) => {
  const [formData, setFormData] = useState({
    name: recipe?.name || '',
    category: recipe?.category || '',
    price: recipe?.price || 0,
    recipe_items: recipe?.recipes || []
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIngredients = ingredients.filter(ing => 
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = (ing) => {
    if (formData.recipe_items.find(item => item.ingredient_id === ing.id)) return;
    setFormData({
      ...formData,
      recipe_items: [...formData.recipe_items, { 
        ingredient_id: ing.id, 
        ingredients: ing, 
        quantity_used: 1, 
        yield_rate: 100,
        additional_cost: 0 
      }]
    });
  };

  const handleRemoveItem = (ingId) => {
     setFormData({
       ...formData,
       recipe_items: formData.recipe_items.filter(item => item.ingredient_id !== ingId)
     });
  };

  const updateItem = (ingId, field, value) => {
    setFormData({
      ...formData,
      recipe_items: formData.recipe_items.map(item => 
        item.ingredient_id === ingId ? { ...item, [field]: parseFloat(value) || 0 } : item
      )
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-white italic tracking-tight">REÇETE DÜZENLE</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Maliyet ve İçerik Yönetimi</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Basic Info & Search */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Ürün Adı</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-black border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-primary/50 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Kategori</label>
                  <input 
                    type="text" 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-black border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-primary/50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Satış Fiyatı (₺)</label>
                  <input 
                    type="number" 
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-black border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-primary/50 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
               <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                 <input 
                   placeholder="Hammadde ara..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full bg-slate-800/50 border border-slate-800 rounded-2xl pl-12 pr-5 py-3 text-white font-bold focus:border-primary/50 outline-none transition-all"
                 />
               </div>
               <div className="bg-black rounded-3xl p-2 max-h-[300px] overflow-y-auto space-y-1">
                  {filteredIngredients.map(ing => (
                    <button 
                      key={ing.id}
                      onClick={() => handleAddItem(ing)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-900 text-left group transition-all"
                    >
                      <div>
                        <p className="text-sm font-black text-white group-hover:text-primary transition-colors">{ing.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 italic">{ing.usage_unit} | {ing.last_unit_cost} ₺</p>
                      </div>
                      <Plus size={16} className="text-slate-700 group-hover:text-primary" />
                    </button>
                  ))}
               </div>
            </div>
          </div>

          {/* Right: Recipe Items */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Utensils size={14} /> Reçete İçeriği
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {formData.recipe_items.map((item) => (
                <div key={item.ingredient_id} className="bg-black border border-slate-800 p-4 rounded-3xl space-y-3 group relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-black text-white">{item.ingredients?.name}</p>
                      <p className="text-[10px] font-bold text-slate-500 italic">Maliyet: {item.ingredients?.last_unit_cost || 0} ₺ / {item.ingredients?.usage_unit}</p>
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(item.ingredient_id)}
                      className="p-1 text-slate-600 hover:text-rose-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-600 uppercase mb-1 block">Miktar ({item.ingredients?.usage_unit})</label>
                      <input 
                        type="number"
                        value={item.quantity_used}
                        onChange={(e) => updateItem(item.ingredient_id, 'quantity_used', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs font-black focus:border-primary/50 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-600 uppercase mb-1 block">Verim %</label>
                      <input 
                        type="number"
                        value={item.yield_rate}
                        onChange={(e) => updateItem(item.ingredient_id, 'yield_rate', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs font-black focus:border-primary/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {formData.recipe_items.length === 0 && (
                <div className="py-12 border-2 border-dashed border-slate-800 rounded-[3rem] text-center text-slate-600 font-bold">
                  Henüz malzeme eklenmedi.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all active:scale-95"
          >
            Vazgeç
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="px-10 py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <Save size={20} /> Değişiklikleri Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

const RecipeCard = ({ recipe, onSelect, onEdit }) => (
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
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Maliyet</span>
          <span className="text-xl font-black text-white italic">{(recipe.current_cost || recipe.cost || 0).toLocaleString('tr-TR')} ₺</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest text-right">Satış</span>
          <span className="text-md font-black text-emerald-400">{(recipe.price || 0).toLocaleString('tr-TR')} ₺</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 mb-1">
      <h3 className="text-lg font-black text-white uppercase tracking-tight line-clamp-1">{recipe.name}</h3>
      {recipe.price_changed && (
        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-tighter shrink-0">
          ❗ Değişti
        </span>
      )}
    </div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 italic">{recipe.category || 'Kategori Yok'}</p>
    
    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
      <div className="flex -space-x-2">
         <div className="w-6 h-6 rounded-full bg-primary text-[8px] flex items-center justify-center font-black text-white border border-black">{recipe.recipes?.length || 0}</div>
         <span className="ml-8 text-[8px] font-black text-slate-600 uppercase items-center flex">Malzeme</span>
      </div>
      <div className="flex items-center gap-2">
         <button 
           onClick={(e) => { e.stopPropagation(); onEdit(recipe); }}
           className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
           title="Düzenle"
         >
           <Edit size={16} />
         </button>
         <button 
           onClick={(e) => { e.stopPropagation(); recipe.onDelete(recipe.id); }}
           className="p-2 bg-slate-800 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
           title="Sil"
         >
           <Trash2 size={16} />
         </button>
      </div>
    </div>
  </div>
);

const Recipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = async () => {
    try {
      const res = await api.get('/recipes');
      setRecipes(res.data || []);
    } catch (err) {
      console.error("Reçete yükleme hatası:", err);
    }
  };

  const fetchIngredients = async () => {
    try {
      const res = await api.get('/ingredients');
      setIngredients(res.data || []);
    } catch (err) {
      console.error("Hammadde yükleme hatası:", err);
    }
  };

  useEffect(() => {
    Promise.all([fetchRecipes(), fetchIngredients()]).finally(() => setLoading(false));
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

  const handleUpdateRecipe = async (id, data) => {
    try {
      const payload = {
        menu_data: { 
          name: data.name, 
          price: parseFloat(data.price) || 0,
          category: data.category 
        },
        recipe_items: data.recipe_items.map(ri => ({
          ingredient_id: ri.ingredient_id,
          quantity_used: ri.quantity_used,
          yield_rate: ri.yield_rate || 100,
          additional_cost: ri.additional_cost || 0
        }))
      };

      await api.put(`/recipes/${id}`, payload);
      setEditingRecipe(null);
      fetchRecipes(); // Refresh list
    } catch (err) {
      console.error("Güncelleme hatası:", err);
      alert("Reçete güncellenemedi.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {editingRecipe && (
        <EditRecipeModal 
          recipe={editingRecipe} 
          ingredients={ingredients}
          onClose={() => setEditingRecipe(null)}
          onSave={(data) => handleUpdateRecipe(editingRecipe.id, data)}
        />
      )}

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
          {loading ? (
             <div className="py-20 text-center text-slate-500 font-black animate-pulse uppercase tracking-[0.3em]">Yükleniyor...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {(recipes || []).map(r => (
                <RecipeCard 
                  key={r?.id} 
                  recipe={{...r, onDelete: handleDelete}} 
                  onSelect={setSelectedRecipe}
                  onEdit={(recipe) => setEditingRecipe(recipe)}
                />
              ))}
            </div>
          )}
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
                   <span className="text-lg font-black text-emerald-400">
                     %{selectedRecipe.price > 0 ? Math.round(((selectedRecipe.price - selectedRecipe.current_cost) / selectedRecipe.price) * 100) : 0}
                   </span>
                </div>

                <div className="space-y-2">
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Ürün İçerikleri</p>
                   <div className="space-y-1.5">
                      {selectedRecipe.recipes?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-white/5 rounded-xl text-[10px] font-bold">
                           <span className="text-slate-300 italic uppercase">{item.ingredients?.name}</span>
                           <span className="text-white">{item.quantity_used} {item.ingredients?.usage_unit}</span>
                        </div>
                      ))}
                   </div>
                </div>
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
