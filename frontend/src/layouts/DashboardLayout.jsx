import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, Dumbbell, Bell } from 'lucide-react';
import { clsx } from 'clsx';

export default function DashboardLayout() {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Members', path: '/members', icon: Users },
    { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#F4F6F9] text-slate-800 font-sans overflow-hidden">
      {/* Mobile Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#F4F6F9]/90 backdrop-blur-xl z-40 flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-indigo-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            GymPro
          </h1>
        </div>
        <button className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400">
          <Bell className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#F4F6F9] pt-20 pb-28 relative">
        <div className="px-5 mx-auto max-w-lg min-h-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-24 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.04)] z-40 px-6 pb-safe">
        <div className="flex items-center justify-between h-16 mt-2 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.includes(item.path);
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className="flex flex-col items-center justify-center w-20 h-full relative group"
              >
                <div className={clsx(
                  'flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300',
                  isActive ? 'bg-indigo-500 shadow-[0_8px_20px_rgba(99,102,241,0.3)] text-white scale-110 -translate-y-2' : 'bg-transparent text-slate-400'
                )}>
                  <Icon className={clsx('w-6 h-6 transition-transform duration-300')} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                {/* Dot indicator underneath active tab */}
                <span className={clsx(
                  'absolute bottom-0 text-[10px] font-bold tracking-wide transition-all duration-300 opacity-0 transform translate-y-2',
                  isActive && 'opacity-100 translate-y-0 text-indigo-600'
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
