import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6">
          <Outlet />
        </main>
        
        <footer className="bg-surface border-t border-border px-6 py-4 text-center text-sm text-text-light">
          © 2025 SIM Sekolah. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;