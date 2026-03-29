import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Utensils, Users, Wallet, ShoppingCart, Settings, Package, LogOut } from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Package size={20} />, label: 'Envanter', path: '/inventory' },
    { icon: <Receipt size={20} />, label: 'Faturalar', path: '/invoices' },
    { icon: <Utensils size={20} />, label: 'Reçeteler', path: '/recipes' },
    { icon: <Users size={20} />, label: 'Tedarikçiler', path: '/suppliers' },
    { icon: <Wallet size={20} />, label: 'Kasa', path: '/accounts' },
    { icon: <ShoppingCart size={20} />, label: 'Satışlar', path: '/sales' },
  ];

  return (
    <aside className="h-screen sticky top-0 w-16 hover:w-64 bg-[#050505] text-slate-300 border-r border-slate-900 shrink-0 transition-all duration-300 ease-in-out z-50 group overflow-hidden">
      {/* Logo Section */}
      <div className="p-3 mb-8 flex items-center gap-4 overflow-hidden whitespace-nowrap">
        <div className="min-w-[40px] h-10 bg-primary rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-primary/20 shrink-0">
          Uz
        </div>
        <span className="text-xl font-bold text-white tracking-tight opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Pos Web
        </span>
      </div>

      {/* Navigation */}
      <nav className="px-3 space-y-2 overflow-hidden">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 whitespace-nowrap overflow-hidden ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'hover:bg-slate-800 hover:text-white text-slate-400'
              }`
            }
          >
            <div className="min-w-[24px] flex justify-center scale-110 group-hover:scale-100 transition-transform">
              {item.icon}
            </div>
            <span className="font-bold text-sm tracking-tight opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0">
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="absolute bottom-6 left-3 right-3 space-y-2 overflow-hidden">
        <button className="flex items-center gap-4 px-3 py-3 w-full rounded-xl hover:bg-slate-800 transition-all text-slate-400 hover:text-white whitespace-nowrap overflow-hidden">
          <div className="min-w-[24px] flex justify-center"><Settings size={20} /></div>
          <span className="font-bold text-sm opacity-0 group-hover:opacity-100 transition-all duration-300">Ayarlar</span>
        </button>
        <button 
          onClick={() => {
            localStorage.removeItem('uzpos_auth');
            window.location.reload();
          }}
          className="flex items-center gap-4 px-3 py-3 w-full rounded-xl hover:bg-rose-500/10 text-rose-500 transition-all whitespace-nowrap overflow-hidden"
        >
          <div className="min-w-[24px] flex justify-center"><LogOut size={20} /></div>
          <span className="font-black italic uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300">Çıkış Yap</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
