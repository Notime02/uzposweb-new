import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="pl-72 pt-16 min-h-screen transition-all duration-300 ease-in-out">
        <div className="p-5 max-w-[1450px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
