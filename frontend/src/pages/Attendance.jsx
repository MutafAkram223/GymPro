import { useState, useEffect } from 'react';
import { getMembers, markAttendance } from '../api';
import { format } from 'date-fns';
import { CalendarCheck, Search, Check, X, Users } from 'lucide-react';

export default function Attendance() {
  const [members, setMembers]   = useState([]);
  const [search, setSearch]     = useState('');
  const [date, setDate]         = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading]   = useState(false);

  useEffect(() => { fetchMembers(); }, []);

  const fetchMembers = () => {
    getMembers().then(res => setMembers(res.data)).catch(console.error);
  };

  const handleMarkAttendance = async (memberId, status) => {
    setLoading(true);
    try {
      await markAttendance({ member_id: memberId, date, status });
      fetchMembers();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeMembers = members.filter(m => m.active);
  const filteredMembers = activeMembers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  // Count stats for the selected date
  const presentCount = filteredMembers.filter(m => m.attendances?.find(a => a.date === date && a.status === 'present')).length;
  const absentCount  = filteredMembers.filter(m => m.attendances?.find(a => a.date === date && a.status === 'absent')).length;
  const unmarkedCount = filteredMembers.length - presentCount - absentCount;

  // Detect if selected date is in the past (no time zone — compare date strings)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isPastDate = date < todayStr;

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-sm font-semibold text-emerald-500 mb-1">Check-in</h2>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Attendance</h1>
      </header>

      {/* Date Picker */}
      <div className="flex items-center gap-3 bg-white shadow-sm border border-slate-100 p-3.5 rounded-2xl">
        <CalendarCheck className="w-5 h-5 text-emerald-500 ml-1 shrink-0" />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full bg-transparent border-none text-slate-800 font-semibold focus:outline-none text-base"
        />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">Present</p>
        </div>
        <div className="bg-rose-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-rose-600">{absentCount}</p>
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mt-0.5">Absent</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-500">{unmarkedCount}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Unmarked</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search members…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white shadow-sm rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 font-medium text-sm"
        />
      </div>

      {/* Member List */}
      <div className="space-y-2.5">
        {filteredMembers.map(member => {
          const att = member.attendances?.find(a => a.date === date);

          let statusLabel   = isPastDate ? 'Absent (Auto)' : 'Unmarked';
          let statusColor   = isPastDate ? 'text-rose-400' : 'text-slate-400';

          if (att?.status === 'present') { statusLabel = 'Present'; statusColor = 'text-emerald-500'; }
          if (att?.status === 'absent')  { statusLabel = 'Absent';  statusColor = 'text-rose-500';   }

          return (
            <div key={member.id} className="p-4 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${
                  att?.status === 'present' ? 'bg-emerald-50 text-emerald-500' :
                  att?.status === 'absent'  ? 'bg-rose-50 text-rose-400'      :
                  'bg-slate-50 text-slate-400'
                }`}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{member.name}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={loading}
                  onClick={() => handleMarkAttendance(member.id, 'present')}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
                    att?.status === 'present'
                      ? 'bg-emerald-500 text-white shadow-[0_6px_16px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'
                  }`}
                >
                  <Check className="w-6 h-6" strokeWidth={att?.status === 'present' ? 3 : 2} />
                </button>
                <button
                  disabled={loading}
                  onClick={() => handleMarkAttendance(member.id, 'absent')}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
                    att?.status === 'absent'
                      ? 'bg-rose-500 text-white shadow-[0_6px_16px_rgba(244,63,94,0.3)]'
                      : 'bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500'
                  }`}
                >
                  <X className="w-6 h-6" strokeWidth={att?.status === 'absent' ? 3 : 2} />
                </button>
              </div>
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            No active members found.
          </div>
        )}
      </div>
    </div>
  );
}
