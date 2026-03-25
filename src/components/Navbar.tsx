import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChartSpline, LayoutDashboard, GitCompare, Home } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/analysis', label: 'Analysis', icon: LayoutDashboard },
    { path: '/compare', label: 'Compare', icon: GitCompare },
  ];

  return (
    <nav className="glass-nav">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
            <ChartSpline className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <span className="font-bold text-lg tracking-tight">ETL PREDICTION</span>
        </Link>
        
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-zinc-100 text-zinc-900' 
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

