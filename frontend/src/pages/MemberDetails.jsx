import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMembers, createSubscription, updateMember, deleteMember, updateSubscription } from '../api';
import { ArrowLeft, CreditCard, Calendar, X, Edit, Trash2 } from 'lucide-react';
import { format, addMonths, subDays, startOfDay, parseISO } from 'date-fns';
import { clsx } from 'clsx';

// Safe local-date parser — never shifts timezone
const parseDate = (str) => {
  if (!str) return new Date();
  const [y, m, d] = str.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
};

const fmtCurrency = (n) => {
  const num = parseFloat(n) || 0;
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
};

// Derive real month count from start_date → end_date
const computeMonthsSpanned = (startStr, endStr) => {
  const [sy, sm] = startStr.split('-').map(Number);
  const [ey, em] = endStr.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm);
};

const getMemberStatus = (m) => {
  if (!m.subscriptions || m.subscriptions.length === 0)
    return { label: 'No Package', color: 'text-slate-500 bg-slate-50 border-slate-200' };

  const latestSub = [...m.subscriptions].sort((a, b) => parseDate(b.end_date) - parseDate(a.end_date))[0];
  const endDate = parseDate(latestSub.end_date);
  const today = startOfDay(new Date());
  const sevenDaysAgo = subDays(today, 7);

  if (endDate >= today)        return { label: 'Active',  color: 'text-emerald-500 bg-emerald-50 border-emerald-200' };
  if (endDate >= sevenDaysAgo) return { label: 'Pending', color: 'text-amber-500  bg-amber-50  border-amber-200'  };
  return                              { label: 'Overdue', color: 'text-rose-500   bg-rose-50   border-rose-200'   };
};

// Build full monthly history from join_date through last sub month
const generateHistory = (joinDateStr, subscriptions) => {
  if (!joinDateStr) return [];

  const monthStatuses = {};
  const priority = { Paid: 3, Partial: 2, Unpaid: 1 };

  // Oldest first so newer subs override stale ones
  const sorted = [...subscriptions].sort(
    (a, b) => parseDate(a.start_date) - parseDate(b.start_date)
  );

  sorted.forEach(sub => {
    const monthsSpanned = computeMonthsSpanned(sub.start_date, sub.end_date);
    if (monthsSpanned <= 0) return;

    const [sy, sm] = sub.start_date.split('-').map(Number);
    const monthlyFee = (sub.total_fee - sub.discount) / monthsSpanned;
    let amountLeft = parseFloat(sub.paid_amount) || 0;

    for (let i = 0; i < monthsSpanned; i++) {
      const d = new Date(sy, sm - 1 + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;

      let status = 'Unpaid';
      if (monthlyFee <= 0) {
        status = 'Paid';
      } else if (amountLeft >= monthlyFee - 0.01) {
        status = 'Paid';
        amountLeft -= monthlyFee;
      } else if (amountLeft > 0.01) {
        status = 'Partial';
        amountLeft = 0;
      }

      const existing = monthStatuses[key];
      if (!existing || priority[status] > priority[existing.status]) {
        monthStatuses[key] = { status, parentSub: sub };
      }
    }
  });

  // Determine range: joinDate → max(today, last sub month)
  const [jy, jm] = joinDateStr.split('-').map(Number);
  const startM = new Date(jy, jm - 1, 1);

  const today = new Date();
  let maxYear = today.getFullYear();
  let maxMon  = today.getMonth();

  for (const key in monthStatuses) {
    const [y, m] = key.split('-').map(Number);
    if (y > maxYear || (y === maxYear && m > maxMon)) { maxYear = y; maxMon = m; }
  }

  const history = [];
  let cur = new Date(startM);
  const end = new Date(maxYear, maxMon, 1);

  while (cur <= end) {
    const key = `${cur.getFullYear()}-${cur.getMonth()}`;
    const mapped = monthStatuses[key];
    history.push({
      id: `hist-${key}`,
      monthStr: format(cur, 'MMMM yyyy'),
      dateObj:  new Date(cur),
      status:   mapped ? mapped.status : 'Unpaid',
      parentSub: mapped ? mapped.parentSub : null,
    });
    cur = addMonths(cur, 1);
  }

  return history.sort((a, b) => b.dateObj - a.dateObj);
};

export default function MemberDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [showSubModal, setShowSubModal]   = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [subForm,  setSubForm]  = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', join_date: '', active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchMember(); }, [id]);

  const fetchMember = () => {
    getMembers().then(res => {
      const found = res.data.find(m => m.id === parseInt(id));
      if (found) {
        setMember(found);
        setEditForm({ name: found.name, phone: found.phone, join_date: found.join_date, active: found.active });
      }
    });
  };

  const openNewSubscription = () => {
    setSubForm({ id: null, start_date: format(new Date(), 'yyyy-MM-dd'), months: 1, total_fee: 2000, discount: 0, paid_amount: 2000 });
    setShowSubModal(true);
  };

  const openEditSubscription = (sub) => {
    const spanned = computeMonthsSpanned(sub.start_date, sub.end_date);
    setSubForm({
      id: sub.id,
      start_date:   sub.start_date,
      months:       spanned > 0 ? spanned : sub.months, // use real computed value
      total_fee:    sub.total_fee,
      discount:     sub.discount,
      paid_amount:  sub.paid_amount,
    });
    setShowSubModal(true);
  };

  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const [y, m, d] = subForm.start_date.split('-').map(Number);
      const startObj  = new Date(y, m - 1, d);
      const endObj    = addMonths(startObj, parseInt(subForm.months));
      const end_date  = format(endObj, 'yyyy-MM-dd');
      const payload   = { ...subForm, end_date, months: parseInt(subForm.months) };

      if (subForm.id) {
        await updateSubscription(subForm.id, payload);
      } else {
        await createSubscription(id, payload);
      }
      setShowSubModal(false);
      fetchMember();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMember(id, editForm);
      setShowEditModal(false);
      fetchMember();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async () => {
    if (window.confirm('Are you sure you want to delete this member? All their data will be lost.')) {
      try {
        await deleteMember(id);
        navigate('/members');
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!member) return (
    <div className="flex justify-center items-center h-full pt-32">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const mStatus = getMemberStatus(member);

  // Duration — use parseDate to avoid timezone shift
  let membershipDuration = 'New Member';
  try {
    const joinD = parseDate(member.join_date);
    const now   = new Date();
    const diffMs = now - joinD;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 30)       membershipDuration = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    else if (diffDays < 365) membershipDuration = `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''}`;
    else                     membershipDuration = `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? 's' : ''}`;
  } catch (e) {}

  const history = generateHistory(member.join_date, member.subscriptions);

  // Live summary box in form
  const netPayable  = (subForm?.total_fee || 0) - (subForm?.discount || 0);
  const balanceDue  = Math.max(0, netPayable - (subForm?.paid_amount || 0));

  // --- Pending Amount: derived from history, not just subscription records ---
  // This captures both partially-paid subscriptions AND gap months with no subscription
  const todayStart = startOfDay(new Date());

  // Monthly rate from most recent subscription (used to price gap months)
  const latestSubForRate = member.subscriptions.length > 0
    ? [...member.subscriptions].sort((a, b) => parseDate(b.end_date) - parseDate(a.end_date))[0]
    : null;
  const defaultMonthlyRate = latestSubForRate
    ? (latestSubForRate.total_fee - latestSubForRate.discount) /
      Math.max(1, computeMonthsSpanned(latestSubForRate.start_date, latestSubForRate.end_date))
    : 0;

  const totalPending = history
    .filter(item => item.dateObj < todayStart && (item.status === 'Unpaid' || item.status === 'Partial'))
    .reduce((sum, item) => {
      if (item.status === 'Partial' && item.parentSub) {
        // For partial months, add the remaining balance from the subscription
        const ms = computeMonthsSpanned(item.parentSub.start_date, item.parentSub.end_date);
        const monthlyFee = ms > 0 ? (item.parentSub.total_fee - item.parentSub.discount) / ms : 0;
        // Approximate: parentSub pending / months in that sub
        return sum + (item.parentSub.total_fee - item.parentSub.discount - item.parentSub.paid_amount) / ms;
      }
      if (item.status === 'Unpaid' && item.parentSub) {
        const ms = computeMonthsSpanned(item.parentSub.start_date, item.parentSub.end_date);
        return sum + (ms > 0 ? (item.parentSub.total_fee - item.parentSub.discount) / ms : 0);
      }
      // Gap month — use default monthly rate
      return sum + defaultMonthlyRate;
    }, 0);

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm active:scale-95 transition-all text-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-800">Profile</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEditModal(true)} className="p-2 bg-white rounded-full shadow-sm active:scale-95 text-indigo-500">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={handleDeleteMember} className="p-2 bg-white rounded-full shadow-sm active:scale-95 text-rose-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 text-center relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="absolute top-0 left-0 w-full h-24 bg-indigo-50 rounded-t-3xl" />
        <div className="relative w-24 h-24 mx-auto rounded-full bg-white flex items-center justify-center text-indigo-500 text-3xl font-bold shadow-[0_8px_20px_rgba(99,102,241,0.15)] border-4 border-white mb-3 z-10">
          {member.name.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-2xl font-bold text-slate-800 z-10 relative">{member.name}</h2>
        <p className="text-slate-400 font-medium mt-0.5 z-10 relative">{member.phone}</p>
        <p className="text-[11px] font-bold text-slate-300 mt-1.5 uppercase tracking-widest z-10 relative">
          Member for {membershipDuration} · Joined {member.join_date}
        </p>

        {/* Show pending dues OR renewal reminder for Pending/Overdue members */}
        {(mStatus.label === 'Pending' || mStatus.label === 'Overdue') && (
          <div className="mt-3 z-10 relative">
            {totalPending > 0 ? (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Amount</p>
                <p className={`text-xl font-bold mt-0.5 ${mStatus.label === 'Overdue' ? 'text-rose-500' : 'text-amber-500'}`}>
                  Rs. {Math.round(totalPending).toLocaleString()}
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Amount</p>
                <p className={`text-base font-bold mt-0.5 ${mStatus.label === 'Overdue' ? 'text-rose-500' : 'text-amber-500'}`}>
                  Rs. 0 — Renewal Due
                </p>
              </>
            )}
          </div>
        )}

        <div className="flex justify-center mt-4 z-10 relative">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${mStatus.color}`}>
            {mStatus.label}
          </span>
        </div>
      </div>

      {/* Packages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-800">Packages</h3>
          <button onClick={openNewSubscription} className="text-indigo-500 text-sm font-bold active:scale-95 transition-transform">
            + Add New
          </button>
        </div>

        {member.subscriptions && member.subscriptions.length > 0 ? (
          [...member.subscriptions]
            .sort((a, b) => parseDate(b.end_date) - parseDate(a.end_date))
            .map(sub => {
              const isPending = (sub.total_fee - sub.discount - sub.paid_amount) > 0.01;
              const realMonths = computeMonthsSpanned(sub.start_date, sub.end_date);
              return (
                <div
                  key={sub.id}
                  onClick={() => openEditSubscription(sub)}
                  className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{realMonths} Month{realMonths !== 1 ? 's' : ''}</h4>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          {sub.start_date} → {sub.end_date}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${isPending ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {isPending ? 'Dues Pending' : 'Fully Paid'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fee</p>
                      <p className="font-bold text-slate-800 text-sm">Rs. {fmtCurrency(sub.total_fee)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Discount</p>
                      <p className="font-bold text-emerald-500 text-sm">Rs. {fmtCurrency(sub.discount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Paid</p>
                      <p className="font-bold text-indigo-500 text-sm">Rs. {fmtCurrency(sub.paid_amount)}</p>
                    </div>
                  </div>

                  {isPending && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-medium">Still owed</span>
                      <span className="text-sm font-bold text-rose-500">
                        Rs. {fmtCurrency(sub.total_fee - sub.discount - sub.paid_amount)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
        ) : (
          <div className="text-center py-8 bg-white rounded-3xl border border-slate-100 border-dashed shadow-sm">
            <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400 text-sm font-medium">No packages yet. Tap "+ Add New" above.</p>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-800">Payment History</h3>
          <span className="text-[10px] text-slate-400 font-medium">Tap a month to edit</span>
        </div>
        <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
          {history.length > 0 ? history.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.parentSub) {
                  openEditSubscription(item.parentSub);
                } else {
                  setSubForm({
                    id: null,
                    start_date: format(item.dateObj, 'yyyy-MM-dd'),
                    months: 1,
                    total_fee: 2000,
                    discount: 0,
                    paid_amount: 0,
                  });
                  setShowSubModal(true);
                }
              }}
              className={clsx(
                'flex justify-between items-center px-5 py-3.5 cursor-pointer active:opacity-60 transition-opacity',
                idx !== history.length - 1 && 'border-b border-slate-50'
              )}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="text-slate-800 font-semibold text-sm">{item.monthStr}</span>
              </div>
              <span className={clsx(
                'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg',
                item.status === 'Paid'    ? 'text-emerald-600 bg-emerald-50' :
                item.status === 'Partial' ? 'text-amber-600 bg-amber-50' :
                                            'text-rose-600 bg-rose-50'
              )}>
                {item.status}
              </span>
            </div>
          )) : (
            <p className="text-center text-slate-400 text-sm py-8">No history yet.</p>
          )}
        </div>
      </div>

      {/* Edit Member Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="bg-white rounded-t-[32px] p-6 w-full relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                <input type="text" required value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-base" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Phone</label>
                <input type="tel" required value={editForm.phone}
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-base" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Join Date</label>
                <input type="date" required value={editForm.join_date}
                  onChange={e => setEditForm({...editForm, join_date: e.target.value})}
                  className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-base" />
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-4 mt-2 bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(99,102,241,0.3)] text-base">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubModal && subForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSubModal(false)} />
          <div className="bg-white rounded-t-[32px] p-6 w-full relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">{subForm.id ? 'Edit Package' : 'Add Package'}</h2>
              <button onClick={() => setShowSubModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveSubscription} className="space-y-4 max-h-[70vh] overflow-y-auto hide-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Start Date</label>
                <input type="date" required value={subForm.start_date}
                  onChange={e => setSubForm({...subForm, start_date: e.target.value})}
                  className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-base" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Duration (Months)</label>
                  <input type="number" min="1" required value={subForm.months}
                    onChange={e => setSubForm({...subForm, months: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-base" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Total Fee (Rs.)</label>
                  <input type="number" min="0" required value={subForm.total_fee}
                    onChange={e => setSubForm({...subForm, total_fee: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-base" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Discount (Rs.)</label>
                  <input type="number" min="0" value={subForm.discount}
                    onChange={e => setSubForm({...subForm, discount: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-base" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Cash Paid (Rs.)</label>
                  <input type="number" min="0" required value={subForm.paid_amount}
                    onChange={e => setSubForm({...subForm, paid_amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-base" />
                </div>
              </div>

              {/* Live Summary */}
              <div className="bg-indigo-50 p-4 rounded-2xl space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Net Payable</span>
                  <span className="text-slate-800 font-bold">Rs. {fmtCurrency(netPayable)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Balance Due</span>
                  <span className={`font-bold ${balanceDue > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    Rs. {fmtCurrency(balanceDue)}
                  </span>
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-4 bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(99,102,241,0.3)] text-base">
                {saving ? 'Saving…' : subForm.id ? 'Save Package' : 'Confirm Package'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
