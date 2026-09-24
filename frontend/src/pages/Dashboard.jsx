import { useState, useEffect } from 'react';
import { getDashboardStats } from '../api';
import { Users, Activity, DollarSign, CalendarCheck, ChevronRight, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_members: 0,
    active_members: 0,
    today_attendance: 0,
    pending_fees: 0,
    revenue_by_month: [],
    customers_by_month: [],
    pending_clients: []
  });

  const fetchStats = () => {
    getDashboardStats()
      .then(res => setStats(res.data))
      .catch(err => console.error('Error fetching stats', err));
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 30000);
    return () => clearInterval(timer);
  }, []);

  // Use authoritative backend value
  const totalPending = stats.pending_fees || 0;

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-700">
      <header>
        <h2 className="text-sm font-semibold text-indigo-500 mb-1">Overview 👋</h2>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-indigo-50 shadow-[0_8px_30px_rgba(99,102,241,0.1)] relative overflow-hidden">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm text-indigo-500">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total_members}</p>
          <p className="text-xs font-semibold text-indigo-400 mt-1 uppercase tracking-wider">Total Members</p>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
            <Users className="w-24 h-24 text-indigo-500" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-emerald-50 shadow-[0_8px_30px_rgba(16,185,129,0.1)] relative overflow-hidden">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm text-emerald-500">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.today_attendance}</p>
          <p className="text-xs font-semibold text-emerald-500 mt-1 uppercase tracking-wider">Attendance</p>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
            <CalendarCheck className="w-24 h-24 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="p-6 rounded-3xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              Revenue Flow <TrendingUp className="w-4 h-4 text-emerald-500" />
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Last 6 Months</p>
          </div>
        </div>
        <div className="h-40 w-full focus:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.revenue_by_month} style={{ outline: 'none' }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                cursor={false}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', outline: 'none' }}
                itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                labelStyle={{ color: '#64748b', fontWeight: 'bold' }}
                formatter={(value) => [`Rs. ${value}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" activeDot={{ stroke: 'none', outline: 'none' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between mt-2 px-2">
          {stats.revenue_by_month.map((item, i) => (
            <span key={i} className="text-[10px] font-bold text-slate-400 uppercase">{item.month}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Active Customers Trend */}
        <div className="p-5 rounded-3xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">New Joins</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Monthly</p>
          </div>
          <div className="h-24 w-full mt-4 focus:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.customers_by_month} style={{ outline: 'none' }}>
                <Tooltip cursor={false} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', outline: 'none' }} />
                <Bar dataKey="count" radius={[4, 4, 4, 4]} activeBar={false}>
                  {stats.customers_by_month.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === stats.customers_by_month.length - 1 ? '#6366f1' : '#cbd5e1'} style={{ outline: 'none' }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-2">
            {stats.customers_by_month.map((item, i) => (
              <span key={i} className="text-[8px] font-bold text-slate-400 uppercase">{item.month.substring(0, 1)}</span>
            ))}
          </div>
        </div>

        {/* Pending Card */}
        <div className="p-5 rounded-3xl bg-rose-50 shadow-[0_8px_30px_rgba(244,63,94,0.1)] flex flex-col justify-between relative overflow-hidden">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center mb-2 shadow-sm text-rose-500">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="relative z-10 mt-2">
            <p className="text-2xl font-bold text-slate-800">Rs. {totalPending}</p>
            <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mt-1">Total Pending</p>
          </div>
        </div>
      </div>

      {/* Pending Clients List */}
      <div className="p-6 rounded-3xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-slate-800">Pending Dues</h3>
          <Link to="/members" className="text-xs font-bold text-indigo-500">See All</Link>
        </div>
        <div className="space-y-4">
          {stats.pending_clients.length > 0 ? (
            stats.pending_clients.map(client => (
              <Link to={`/members/${client.id}`} key={client.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{client.name}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{client.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 shadow-sm">
                    <p className="font-bold text-rose-500 text-xs">Rs. {client.pending_amount}</p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-6 text-sm font-medium text-slate-400">
              No pending payments.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
