import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Inventory from './pages/Inventory';
import Recipes from './pages/Recipes';
import Suppliers from './pages/Suppliers';
import Accounts from './pages/Accounts';
import Sales from './pages/Sales';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('uzpos_auth') === 'true'
  );

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <Router>
      <div className="flex bg-[#07090f] min-h-screen text-slate-200">
        <Sidebar className="shrink-0" />
        <main className="flex-1 p-8 transition-all duration-300 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
