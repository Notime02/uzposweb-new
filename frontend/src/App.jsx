import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Inventory from './pages/Inventory';
import Recipes from './pages/Recipes';
import Suppliers from './pages/Suppliers';
import Accounts from './pages/Accounts';
import Sales from './pages/Sales';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <Router>
      <div className="flex bg-black min-h-screen text-slate-200">
        <Sidebar />
        <main className="flex-1 p-8 transition-all duration-300">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/sales" element={<Sales />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
