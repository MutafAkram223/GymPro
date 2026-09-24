import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMembers, createMember } from '../api';
import { format, subDays, startOfDay } from 'date-fns';
import { Search, UserPlus, ChevronRight, X, Filter } from 'lucide-react';
import { clsx } from 'clsx';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All'); // 'All', 'Active', 'Pending', 'Overdue'
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', phone: '', join_date: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = () => {
    getMembers().then(res => setMembers(res.data)).catch(console.error);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await createMember(newMember);
      setShowAddModal(false);
      setNewMember({ name: '', phone: '', join_date: format(new Date(), 'yyyy-MM-dd') });
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  const getMemberStatus = (member) => {
    if (!member.subscriptions || member.subscriptions.length === 0) return { label: 'No Package', color: 'bg-slate-50 text-slate-500 border-slate-200' };
    
    const latestSub = [...member.subscriptions].sort((a, b) => {
      const [ay, am, ad] = a.end_date.split('-');
      const [by, bm, bd] = b.end_date.split('-');
      return new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad);
    })[0];
    
    const [ey, em, ed] = latestSub.end_date.split('-');
    const endDate = new Date(ey, em - 1, ed);
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 7);
    
    if (endDate >= today) {
      return { label: 'Active', color: 'bg-emerald-50 text-emerald-500 border-emerald-200' };
    } else if (endDate >= sevenDaysAgo) {
      return { label: 'Pending', color: 'bg-amber-50 text-amber-500 border-amber-200' };
    } else {
      return { label: 'Overdue', color: 'bg-rose-50 text-rose-500 border-rose-200' };
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
    if (!matchesSearch) return false;
    
    if (filter === 'All') return true;
    
    const status = getMemberStatus(m).label;
    return status === filter;
  });

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-indigo-500 mb-1">Directory</h2>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Members</h1>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-12 h-12 flex items-center justify-center bg-indigo-500 text-white rounded-full shadow-[0_8px_20px_rgba(99,102,241,0.3)] active:scale-95 transition-all"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </header>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search members..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white shadow-sm rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-sm"
          />
        </div>
        
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {['All', 'Active', 'Pending', 'Overdue'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm border',
                filter === f 
                  ? 'bg-indigo-500 text-white border-indigo-500' 
                  : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredMembers.map(member => {
          const mStatus = getMemberStatus(member);

          return (
            <Link 
              key={member.id}
              to={`/members/${member.id}`} 
              className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={clsx(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0",
                  mStatus.label === 'Active'  ? 'bg-indigo-50 text-indigo-500' :
                  mStatus.label === 'Pending' ? 'bg-amber-50  text-amber-500'  :
                  mStatus.label === 'Overdue' ? 'bg-rose-50   text-rose-500'   :
                  'bg-slate-50 text-slate-400'
                )}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 text-base tracking-tight truncate">{member.name}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{member.phone}</p>
                  <div className="mt-1.5">
                    <span className={clsx("px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-bold border", mStatus.color)}>
                      {mStatus.label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-active:bg-indigo-50 transition-colors shrink-0">
                <ChevronRight className="w-4 h-4 text-slate-400 group-active:text-indigo-500" />
              </div>
            </Link>
          );
        })}
        {filteredMembers.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            No members found in this category.
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet Modal for Adding Member */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-white rounded-t-[32px] p-6 w-full relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Add Member</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 active:scale-95 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-4 pb-safe">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newMember.name}
                  onChange={e => setNewMember({...newMember, name: e.target.value})}
                  className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-base"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Phone</label>
                <input 
                  type="tel" 
                  required
                  value={newMember.phone}
                  onChange={e => setNewMember({...newMember, phone: e.target.value})}
                  className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-base"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Join Date</label>
                <input 
                  type="date" 
                  required
                  value={newMember.join_date}
                  onChange={e => setNewMember({...newMember, join_date: e.target.value})}
                  className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-base"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 mt-6 bg-indigo-500 active:bg-indigo-600 text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(99,102,241,0.3)] transition-all text-base"
              >
                Save Member
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
