import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Utensils, Users, Wallet, ShoppingCart, Settings, Package } from 'lucide-react';

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
    <aside className="h-screen w-64 bg-[#050505] text-slate-300 border-r border-slate-900 shrink-0 transition-all duration-300">
      <div className="p-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-bold text-white text-xl">
          Uz
        </div>
        <span className="text-xl font-bold text-white tracking-tight">Pos Web</span>
      </div>

      <nav className="px-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-6 left-4 right-4">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-slate-800 transition-colors">
          <Settings size={20} />
          <span className="font-medium">Ayarlar</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
