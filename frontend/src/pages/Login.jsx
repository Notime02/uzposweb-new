import React, { useState } from 'react';
import { Lock, User, LogIn, UtensilsCrossed } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'kebabcıcelal') {
      localStorage.setItem('uzpos_auth', 'true');
      onLogin();
    } else {
      setError('Geçersiz kullanıcı adı veya şifre.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07090f] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-2xl">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-[2rem] flex items-center justify-center text-primary mb-6 shadow-xl shadow-primary/20 scale-110">
              <UtensilsCrossed size={40} />
            </div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter mb-2">UZPOS</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Restoran Yönetim Sistemi</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kullanıcı Adı</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-rose-500 text-xs font-black text-center animate-bounce">{error}</p>
            )}

            <button 
              type="submit"
              className="w-full bg-primary text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 text-sm tracking-widest uppercase"
            >
              Sisteme Giriş Yap <LogIn size={20} />
            </button>
          </form>

          <p className="mt-10 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest">
            © 2024 UzPos Intenational
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
