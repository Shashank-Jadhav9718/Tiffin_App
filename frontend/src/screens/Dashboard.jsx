import React, { useEffect, useState, useMemo } from 'react';
import { Settings, Check, X, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { getDailyCount, getCustomers, postAttendance, calculateBilling } from '../api';

export default function Dashboard({ onOpenSettings, showToast, showLoading }) {
  const [customers, setCustomers] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Split Card Detail Modal States
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [customerBillInfo, setCustomerBillInfo] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);

  // Get today's formatted date string (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Display date e.g. "Sunday, 1 June"
  const formattedDisplayDate = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, []);

  // Fetch all necessary data and auto-seed if needed
  const loadDashboardData = async (shouldSeed = true) => {
    setIsLoading(true);
    showLoading(true);
    try {
      // 1. Fetch active customers
      const activeCusts = await getCustomers();
      setCustomers(activeCusts);

      // 2. Fetch today's count & breakdown
      const countRes = await getDailyCount(todayStr);
      setBreakdown(countRes.breakdown || []);

      // 3. Auto-seeding logic
      if (shouldSeed && activeCusts.length > 0) {
        const existingLogs = countRes.breakdown || [];
        const seedQueue = [];

        activeCusts.forEach(customer => {
          const plan = customer.plan_type.toLowerCase();
          
          // Determine which meals need to be active
          const mealsToSeed = [];
          if (plan.includes('lunch-only') || plan === 'lunch') {
            mealsToSeed.push('Lunch');
          } else if (plan.includes('dinner-only') || plan === 'dinner') {
            mealsToSeed.push('Dinner');
          } else {
            // 'Both' or any other plan defaults to seeding both
            mealsToSeed.push('Lunch');
            mealsToSeed.push('Dinner');
          }

          mealsToSeed.forEach(meal => {
            // Check if there is already a log for this customer and meal today
            const hasLog = existingLogs.some(
              log => log.customer_name === customer.name && log.meal_type === meal
            );
            
            if (!hasLog) {
              seedQueue.push({
                customer_id: customer.id,
                customer_name: customer.name,
                date: todayStr,
                meal_type: meal,
                status: 'Delivered'
              });
            }
          });
        });

        // If there are logs to auto-seed, POST them
        if (seedQueue.length > 0) {
          console.log(`Auto-seeding ${seedQueue.length} attendance logs for today`);
          await Promise.all(
            seedQueue.map(item => 
              postAttendance({
                customer_id: item.customer_id,
                date: item.date,
                meal_type: item.meal_type,
                status: item.status
              })
            )
          );
          
          // Re-fetch today's count to reflect newly seeded records
          const updatedCountRes = await getDailyCount(todayStr);
          setBreakdown(updatedCountRes.breakdown || []);
          showToast(`Automatically checked in ${seedQueue.length} meals! 🍱`, 'success');
        }
      }
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Failed to load dashboard', 'error');
    } finally {
      setIsLoading(false);
      showLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(true);
  }, [todayStr]);

  // Compute stats based on the active breakdown
  const stats = useMemo(() => {
    let lunch = 0;
    let dinner = 0;
    breakdown.forEach(log => {
      if (log.status === 'Delivered' || log.status === 'Extra') {
        if (log.meal_type === 'Lunch') lunch++;
        if (log.meal_type === 'Dinner') dinner++;
      }
    });
    return { lunch, dinner };
  }, [breakdown]);

  // Get status cycling value
  const getNextStatus = (currentStatus) => {
    if (currentStatus === 'Delivered') return 'Canceled';
    if (currentStatus === 'Canceled') return 'Extra';
    return 'Delivered';
  };

  // Toggle meal status
  const handleToggleStatus = async (customer, mealType, currentStatus) => {
    const nextStatus = getNextStatus(currentStatus);
    showLoading(true);
    try {
      await postAttendance({
        customer_id: customer.id,
        date: todayStr,
        meal_type: mealType,
        status: nextStatus
      });

      // Update local state breakdown to avoid full re-fetch and keep UI snappy
      setBreakdown(prev => {
        const index = prev.findIndex(
          log => log.customer_name === customer.name && log.meal_type === mealType
        );

        if (index > -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], status: nextStatus };
          return updated;
        } else {
          // If for some reason it didn't exist in local state breakdown, append it
          return [...prev, { customer_name: customer.name, meal_type: mealType, status: nextStatus }];
        }
      });

      showToast(`Updated ${customer.name}'s ${mealType} to ${nextStatus}!`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update attendance status', 'error');
    } finally {
      showLoading(false);
    }
  };

  // Click handler for card left-side click (launches details Bottom Sheet)
  const handleCardClick = async (customer) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
    setBillingLoading(true);
    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      
      // Calculate/fetch fresh monthly bills from backend
      const billingData = await calculateBilling(month, year);
      const bill = billingData.find(b => b.customer_id === customer.id);
      
      if (bill) {
        const perMealRate = parseFloat(customer.per_meal_rate) || 1.0;
        const mealCount = perMealRate > 0 ? Math.round(bill.total_amount / perMealRate) : 0;
        setCustomerBillInfo({
          total_amount: bill.total_amount,
          meal_count: mealCount,
          status: bill.status
        });
      } else {
        setCustomerBillInfo({
          total_amount: 0.0,
          meal_count: 0,
          status: 'Unpaid'
        });
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to load customer billing data.', 'error');
      setCustomerBillInfo({
        total_amount: 0.0,
        meal_count: 0,
        status: 'Unpaid'
      });
    } finally {
      setBillingLoading(false);
    }
  };

  // Build the list of active daily meal rows to show
  const activeMealRows = useMemo(() => {
    const rows = [];
    customers.forEach(customer => {
      const plan = customer.plan_type.toLowerCase();
      const name = customer.name;

      // Check for Lunch row
      if (plan.includes('lunch-only') || plan === 'lunch' || plan.includes('both')) {
        const log = breakdown.find(l => l.customer_name === name && l.meal_type === 'Lunch');
        rows.push({
          customer,
          mealType: 'Lunch',
          status: log ? log.status : 'Delivered',
          planLabel: 'Lunch'
        });
      }

      // Check for Dinner row
      if (plan.includes('dinner-only') || plan === 'dinner' || plan.includes('both')) {
        const log = breakdown.find(l => l.customer_name === name && l.meal_type === 'Dinner');
        rows.push({
          customer,
          mealType: 'Dinner',
          status: log ? log.status : 'Delivered',
          planLabel: 'Dinner'
        });
      }
    });

    // Sort by customer name alphabetically
    return rows.sort((a, b) => a.customer.name.localeCompare(b.customer.name));
  }, [customers, breakdown]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b-2 border-[#0f172a] sticky top-0 z-10 bg-[#fdfbf7]">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight border-b-2 border-[#0f172a] inline-block mb-1">Today's Khata</h1>
          <p className="text-sm font-bold font-hand text-slate-600">{formattedDisplayDate}</p>
        </div>
        <button
          onClick={onOpenSettings}
          className="drawn-btn w-10 h-10 flex items-center justify-center rounded-none"
          aria-label="Settings"
        >
          <Settings size={22} className="stroke-[2] text-[#0f172a]" />
        </button>
      </header>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 space-y-5">
        
        {/* Flat Summary Box */}
        <div className="border-2 border-[#0f172a] p-4 shadow-[4px_4px_0px_#0f172a] flex flex-col md:flex-row justify-between items-center bg-white">
          <div className="flex items-center space-x-3 mb-3 md:mb-0">
            <span className="text-2xl border-2 border-[#0f172a] p-1">🍱</span>
            <div className="text-center md:text-left">
              <p className="text-xs uppercase font-bold text-slate-500 font-hand">Delivery Count</p>
              <h2 className="text-lg font-bold">Active Boxes</h2>
            </div>
          </div>
          <div className="flex items-center space-x-4 border-2 border-[#0f172a] px-4 py-2 font-bold text-sm bg-[#fdfbf7] font-hand">
            <span className="flex items-center">☀️ L: <strong className="ml-1">{stats.lunch}</strong></span>
            <span className="text-[#0f172a]">|</span>
            <span className="flex items-center">🌙 D: <strong className="ml-1">{stats.dinner}</strong></span>
          </div>
        </div>

        {/* Refresh button */}
        <div className="flex justify-between items-center px-1 border-b-2 border-[#0f172a] pb-1">
          <span className="text-xs font-bold uppercase text-[#0f172a] font-hand">
            List ({activeMealRows.length})
          </span>
          <button
            onClick={() => loadDashboardData(false)}
            className="text-xs font-bold text-[#0f172a] flex items-center space-x-1 border border-[#0f172a] px-2 py-1 active:bg-slate-200"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            <span className="font-hand">Reload</span>
          </button>
        </div>

        {/* Scrollable Customer List */}
        {activeMealRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-[#0f172a] bg-white text-center shadow-[4px_4px_0px_#0f172a]">
            <span className="text-4xl mb-3">🍱</span>
            <h3 className="text-base font-bold text-[#0f172a] border-b-2 border-[#0f172a]">No Meals Today</h3>
            <p className="text-xs text-[#0f172a] max-w-[240px] mt-2 font-hand">
              Add customers in the Khata tab.
            </p>
          </div>
        ) : (
          <div className="grid gap-0">
            {activeMealRows.map(({ customer, mealType, status, planLabel }) => {
              // Status Styling Variables
              let statusText = "Delivered";
              let statusBoxClass = "border-[#0f172a]";
              let IconStr = "✅";

              if (status === 'Canceled') {
                statusText = "Canceled";
                statusBoxClass = "border-[#ef4444]";
                IconStr = "❌";
              } else if (status === 'Extra') {
                statusText = "Extra";
                statusBoxClass = "border-[#0f172a]";
                IconStr = "➕";
              }

              return (
                <div
                  key={`${customer.id}-${mealType}`}
                  className="ruled-row flex justify-between items-center transition hover:bg-[#bae6fd]/20"
                >
                  {/* Left Side: Clickable */}
                  <button
                    onClick={() => handleCardClick(customer)}
                    className="flex-1 text-left py-3 focus:outline-none"
                  >
                    <h3 className="font-bold text-[#0f172a] text-sm tracking-tight leading-tight">{customer.name}</h3>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[10px] font-bold font-hand border border-[#0f172a] px-1">
                        {mealType === 'Lunch' ? 'L' : 'D'}
                      </span>
                      <span className="text-[11px] font-hand">
                        {customer.phone || 'No phone'}
                      </span>
                    </div>
                  </button>

                  {/* Right Side: Toggle */}
                  <div className="py-2 pr-2 pl-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(customer, mealType, status);
                      }}
                      className={`tap-target flex flex-col items-center justify-center border-2 w-16 py-1 bg-white font-hand font-bold text-xs ${statusBoxClass} active:bg-slate-200 transition-colors shadow-[2px_2px_0px_#0f172a]`}
                    >
                      <span className="text-base leading-none mb-0.5">{IconStr}</span>
                      <span className="text-[9px] uppercase">{statusText}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Flat Bottom Sheet Modal Detail View */}
      {isDetailOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-[#0f172a]/80 flex justify-center items-end z-50">
          <div className="absolute inset-0" onClick={() => setIsDetailOpen(false)}></div>
          
          <div className="bg-[#fdfbf7] w-full max-w-lg border-t-4 border-[#0f172a] p-6 space-y-6 max-h-[85vh] overflow-y-auto relative z-10">
            
            <div className="w-12 h-1 bg-[#0f172a] mx-auto -mt-2 mb-4"></div>
            
            <div className="flex justify-between items-start border-b-2 border-[#0f172a] pb-2">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#0f172a] tracking-tight">{selectedCustomer.name}</h2>
                <p className="text-sm font-bold font-hand text-slate-600 flex items-center">
                  📞 {selectedCustomer.phone || 'No phone number'}
                </p>
                <span className="inline-block text-xs font-bold border border-[#0f172a] px-2 mt-1 font-hand">
                  Plan: {selectedCustomer.plan_type}
                </span>
              </div>
              
              <button
                onClick={() => setIsDetailOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-[#0f172a] border-2 border-[#0f172a] tap-target bg-white shadow-[2px_2px_0px_#0f172a]"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            <div className="border-2 border-[#0f172a] bg-white p-5 space-y-4 shadow-[4px_4px_0px_#0f172a]">
              <h3 className="text-xs font-bold uppercase border-b border-[#bae6fd] pb-1 font-sans">Month Overview</h3>
              
              {billingLoading ? (
                <div className="flex flex-col items-center justify-center py-6 font-hand font-bold">
                  Calculating...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-[#0f172a] p-3">
                    <p className="text-[10px] font-bold uppercase font-sans">Total Meals</p>
                    <p className="text-xl font-extrabold font-hand mt-1">
                      {customerBillInfo?.meal_count || 0}
                    </p>
                    <p className="text-[10px] font-bold font-hand border-t border-[#bae6fd] mt-1 pt-1">₹{selectedCustomer.per_meal_rate}/meal</p>
                  </div>

                  <div className="border border-[#0f172a] p-3">
                    <p className="text-[10px] font-bold uppercase font-sans">Amount Due</p>
                    <p className="text-xl font-extrabold font-hand mt-1">
                      ₹{(customerBillInfo?.total_amount || 0).toLocaleString('en-IN')}
                    </p>
                    <span className={`inline-block text-[9px] font-bold uppercase border mt-1 px-1 font-hand ${
                      customerBillInfo?.status === 'Paid'
                        ? 'border-[#0f172a] bg-[#bae6fd]'
                        : 'border-[#ef4444]'
                    }`}>
                      {customerBillInfo?.status || 'Unpaid'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              {selectedCustomer.phone ? (
                <a
                  href={`https://wa.me/${selectedCustomer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Namaste ${selectedCustomer.name} ji 🙏, aapka is mahine ka tiffin bill ₹${(customerBillInfo?.total_amount || 0).toLocaleString('en-IN')} hai (${customerBillInfo?.meal_count || 0} meals). Please UPI se pay kar dijiye. Shukriya! 🍱`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="drawn-btn w-full bg-white font-bold py-3 text-center block text-sm"
                >
                  [💬] WhatsApp Reminder
                </a>
              ) : (
                <button
                  disabled
                  className="w-full border-2 border-slate-300 text-slate-400 font-bold font-hand py-3 cursor-not-allowed text-sm bg-slate-100"
                >
                  [💬] No Phone Number
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
