import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Receipt, MessageCircle, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { calculateBilling, markPaid } from '../api';

export default function Billing({ showToast, showLoading }) {
  // Current month & year as defaults
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [year, setYear] = useState(today.getFullYear());
  const [bills, setBills] = useState([]);
  const [hasCalculated, setHasCalculated] = useState(false);

  // Month names for dropdown & messages
  const monthsList = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];

  // Year list: last year, current year, next 2 years
  const yearsList = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1, current + 2];
  }, []);

  // Fetch or calculate bills for selected period
  const handleGenerateBills = async () => {
    showLoading(true);
    try {
      const data = await calculateBilling(month, year);
      setBills(data || []);
      setHasCalculated(true);
      showToast(`Billing generated for ${monthsList.find(m => m.value === month).name} ${year}! 🍱`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to generate bills', 'error');
    } finally {
      showLoading(false);
    }
  };

  // Trigger billing load silently on startup
  useEffect(() => {
    const loadSilent = async () => {
      try {
        const data = await calculateBilling(month, year);
        setBills(data || []);
        setHasCalculated(data && data.length > 0);
      } catch (err) {
        console.log("Silent bill check skipped or database empty");
      }
    };
    loadSilent();
  }, [month, year]);

  // Aggregate stats: Unpaid count and Total outstanding amount
  const stats = useMemo(() => {
    const unpaidBills = bills.filter(b => b.status === 'Unpaid');
    const totalDue = unpaidBills.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
    return {
      totalDue,
      unpaidCount: unpaidBills.length
    };
  }, [bills]);

  // Mark an individual bill as Paid
  const handleMarkAsPaid = async (customerId) => {
    showLoading(true);
    try {
      await markPaid(customerId, month, year);
      
      // Update local state directly for responsive UI transitions
      setBills(prev =>
        prev.map(b =>
          b.customer_id === customerId ? { ...b, status: 'Paid' } : b
        )
      );

      const customer = bills.find(b => b.customer_id === customerId);
      showToast(`Bill marked as Paid for ${customer ? customer.name : 'Customer'}!`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to mark bill as paid', 'error');
    } finally {
      showLoading(false);
    }
  };

  // Format WhatsApp request text and link
  const getWhatsAppLink = (bill) => {
    if (!bill.phone) return null;
    
    // Stripping formatting for WhatsApp link
    const cleanPhone = bill.phone.replace(/\D/g, '');
    const monthName = monthsList.find(m => m.value === month)?.name || '';
    
    const messageText = `Namaste ${bill.name} ji 🙏, aapka ${monthName} ka tiffin bill ₹${bill.total_amount.toLocaleString('en-IN')} hai. Please UPI se pay kar dijiye. Shukriya! 🍱`;
    
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header & Controls */}
      <header className="px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm space-y-4">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Monthly Billing</h1>
        
        {/* Month & Year Dropdown Selectors (Thumb Friendly Large Targets) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition tap-target appearance-none text-slate-700"
            >
              {monthsList.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
            <Calendar size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition tap-target appearance-none text-slate-700"
            >
              {yearsList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Calendar size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Generate Bills Trigger Button */}
        <button
          onClick={handleGenerateBills}
          className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 hover:shadow-emerald-500/10 transition tap-target active:scale-[0.98] shadow-md flex items-center justify-center space-x-2 text-sm"
        >
          <Receipt size={16} />
          <span>Generate & Recalculate Bills</span>
        </button>
      </header>

      {/* Bill List Container */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4 space-y-4">
        
        {/* Billing aggregates banner */}
        {bills.length > 0 && (
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-premium flex items-center justify-between transition-card">
            <div className="flex items-center space-x-3">
              <span className="text-xl">💰</span>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total Outstanding Due</p>
                <h2 className="text-sm font-bold text-slate-200">
                  {stats.unpaidCount} Pending Customers
                </h2>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-emerald-400">
                ₹{stats.totalDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}

        {/* Customer Bills list */}
        {bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl shadow-premium border border-slate-100 text-center">
            <span className="text-4xl mb-3">🧾</span>
            <h3 className="text-base font-bold text-slate-800">No Bills Prepared</h3>
            <p className="text-xs text-slate-500 max-w-[240px] mt-1">
              Click the green button above to calculate bills for the selected period.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {bills.map((bill) => {
              const waLink = getWhatsAppLink(bill);

              return (
                <div
                  key={bill.customer_id}
                  className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col space-y-3.5 shadow-sm transition hover:shadow-md"
                >
                  {/* Bill Row Title */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm tracking-tight">{bill.name}</h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">
                        {bill.phone || 'No phone number'}
                      </p>
                    </div>
                    
                    {/* Amount & Status Badge */}
                    <div className="text-right flex flex-col items-end">
                      <p className="text-sm font-extrabold text-slate-800">
                        ₹{bill.total_amount.toLocaleString('en-IN')}
                      </p>
                      <span className={`text-[9px] font-extrabold tracking-wider px-2.5 py-0.5 rounded-full uppercase mt-1 border ${
                        bill.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions Area (Large Tap Targets) */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-50">
                    {/* WhatsApp notification CTA */}
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tap-target flex items-center justify-center space-x-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 rounded-xl text-xs font-bold transition active:scale-[0.97]"
                      >
                        <MessageCircle size={15} className="fill-emerald-700" />
                        <span>Send Bill</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="tap-target flex items-center justify-center space-x-1.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl text-xs font-bold opacity-60 cursor-not-allowed"
                      >
                        <MessageCircle size={15} />
                        <span>No Phone</span>
                      </button>
                    )}

                    {/* Mark Paid CTA */}
                    {bill.status === 'Unpaid' ? (
                      <button
                        onClick={() => handleMarkAsPaid(bill.customer_id)}
                        className="tap-target flex items-center justify-center space-x-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition active:scale-[0.97] shadow-sm"
                      >
                        <CheckCircle size={15} className="text-emerald-400" />
                        <span>Mark Paid</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="tap-target flex items-center justify-center space-x-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-bold cursor-default opacity-80"
                      >
                        <CheckCircle size={15} className="text-emerald-500" />
                        <span>All Clear</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
