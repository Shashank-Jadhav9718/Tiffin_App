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
      <header className="px-6 py-4 border-b-2 border-[#0f172a] sticky top-0 z-10 bg-[#fdfbf7] space-y-4">
        <h1 className="text-xl font-bold text-[#0f172a] tracking-tight border-b-2 border-[#0f172a] inline-block mb-1">Monthly Ledger</h1>
        
        {/* Month & Year Dropdown Selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-white border-2 border-[#0f172a] text-sm font-bold focus:outline-none shadow-[2px_2px_0px_#0f172a] font-hand text-[#0f172a] appearance-none"
            >
              {monthsList.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
            <Calendar size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#0f172a] pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-white border-2 border-[#0f172a] text-sm font-bold focus:outline-none shadow-[2px_2px_0px_#0f172a] font-hand text-[#0f172a] appearance-none"
            >
              {yearsList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Calendar size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#0f172a] pointer-events-none" />
          </div>
        </div>

        {/* Generate Bills Trigger Button */}
        <button
          onClick={handleGenerateBills}
          className="drawn-btn w-full bg-[#0f172a] text-white font-bold py-3 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center space-x-2 text-sm font-sans"
        >
          <Receipt size={16} />
          <span>Calculate Totals</span>
        </button>
      </header>

      {/* Bill List Container */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4 space-y-4">
        
        {/* Billing aggregates banner */}
        {bills.length > 0 && (
          <div className="border-2 border-[#0f172a] p-4 shadow-[4px_4px_0px_#0f172a] bg-white flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-xl border-2 border-[#0f172a] p-1 bg-[#fdfbf7]">💰</span>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 font-sans">Total Due</p>
                <h2 className="text-sm font-bold text-[#0f172a] font-hand mt-0.5">
                  {stats.unpaidCount} Pending
                </h2>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-[#0f172a] font-hand bg-[#bae6fd]/30 px-2 py-1">
                ₹{stats.totalDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}

        {/* Customer Bills list */}
        {bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border-2 border-[#0f172a] text-center mt-4 shadow-[4px_4px_0px_#0f172a]">
            <span className="text-4xl mb-3">🧾</span>
            <h3 className="text-base font-bold text-[#0f172a] border-b-2 border-[#0f172a]">No Khata Records</h3>
            <p className="text-xs text-[#0f172a] max-w-[240px] mt-2 font-hand">
              Click the button above to calculate bills.
            </p>
          </div>
        ) : (
          <div className="grid gap-0">
            {bills.map((bill) => {
              const waLink = getWhatsAppLink(bill);

              return (
                <div
                  key={bill.customer_id}
                  className="ruled-row py-4 flex flex-col space-y-3"
                >
                  {/* Bill Row Title */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-[#0f172a] text-sm tracking-tight">{bill.name}</h3>
                      <p className="text-[10px] text-[#0f172a] font-bold font-hand mt-0.5">
                        {bill.phone || 'No phone number'}
                      </p>
                    </div>
                    
                    {/* Amount & Status Badge */}
                    <div className="text-right flex flex-col items-end">
                      <p className="text-base font-extrabold text-[#0f172a] font-hand">
                        ₹{bill.total_amount.toLocaleString('en-IN')}
                      </p>
                      <span className={`text-[9px] font-bold uppercase border px-1 mt-0.5 font-hand ${
                        bill.status === 'Paid'
                          ? 'border-[#0f172a] bg-[#bae6fd] text-[#0f172a]'
                          : 'border-[#ef4444] text-[#ef4444]'
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center space-x-3 pt-1">
                    {/* WhatsApp notification CTA */}
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="drawn-btn flex-1 flex items-center justify-center space-x-1.5 bg-white py-2 text-[10px] font-bold font-sans uppercase active:bg-slate-200 transition"
                      >
                        <MessageCircle size={14} />
                        <span>WhatsApp</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="drawn-btn flex-1 flex items-center justify-center space-x-1.5 bg-slate-100 text-slate-400 py-2 text-[10px] font-bold font-sans uppercase opacity-60 cursor-not-allowed border-slate-300 shadow-none"
                      >
                        <MessageCircle size={14} />
                        <span>No Phone</span>
                      </button>
                    )}

                    {/* Mark Paid CTA */}
                    {bill.status === 'Unpaid' ? (
                      <button
                         onClick={() => handleMarkAsPaid(bill.customer_id)}
                         className="drawn-btn flex-1 flex items-center justify-center space-x-1.5 bg-white py-2 text-[10px] font-bold font-sans uppercase active:bg-slate-200 transition"
                      >
                        <CheckCircle size={14} />
                        <span>Mark Paid</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="drawn-btn flex-1 flex items-center justify-center space-x-1.5 bg-[#bae6fd] text-[#0f172a] border-[#0f172a] py-2 text-[10px] font-bold font-sans uppercase cursor-default shadow-none translate-x-[2px] translate-y-[2px]"
                      >
                        <CheckCircle size={14} />
                        <span>Cleared</span>
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
