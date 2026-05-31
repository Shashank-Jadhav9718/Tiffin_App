import React, { useEffect, useState, useMemo } from 'react';
import { Settings, Check, X, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { getDailyCount, getCustomers, postAttendance } from '../api';

export default function Dashboard({ onOpenSettings, showToast, showLoading }) {
  const [customers, setCustomers] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
      <header className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Today's Attendance</h1>
          <p className="text-sm font-medium text-slate-500">{formattedDisplayDate}</p>
        </div>
        <button
          onClick={onOpenSettings}
          className="tap-target flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
          aria-label="Settings"
        >
          <Settings size={22} className="stroke-[2]" />
        </button>
      </header>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 space-y-5">
        
        {/* Emerald Summary Card */}
        <div className="bg-emerald-500 text-white rounded-2xl p-5 shadow-premium flex flex-col md:flex-row justify-between items-center transition-card hover:shadow-premium-hover">
          <div className="flex items-center space-x-3 mb-2 md:mb-0">
            <span className="text-2xl">🍱</span>
            <div className="text-center md:text-left">
              <p className="text-xs uppercase tracking-wider font-semibold text-emerald-100">Live Delivery Count</p>
              <h2 className="text-lg font-bold">Today's Active Boxes</h2>
            </div>
          </div>
          <div className="flex items-center space-x-4 bg-emerald-600/30 px-4 py-2 rounded-xl border border-emerald-400/20 font-bold text-sm tracking-wide">
            <span className="flex items-center">☀️ Lunch: <strong className="ml-1 text-emerald-50">{stats.lunch}</strong></span>
            <span className="text-emerald-300">|</span>
            <span className="flex items-center">🌙 Dinner: <strong className="ml-1 text-emerald-50">{stats.dinner}</strong></span>
          </div>
        </div>

        {/* Refresh button */}
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Meal List ({activeMealRows.length})
          </span>
          <button
            onClick={() => loadDashboardData(false)}
            className="text-xs font-semibold text-emerald-600 flex items-center space-x-1 hover:text-emerald-700 active:scale-95 transition py-1 px-2 rounded-md hover:bg-emerald-50"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            <span>Reload</span>
          </button>
        </div>

        {/* Scrollable Customer List */}
        {activeMealRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl shadow-premium border border-slate-100 text-center">
            <span className="text-4xl mb-3">🍱</span>
            <h3 className="text-base font-bold text-slate-800">No Meals Seeding Today</h3>
            <p className="text-xs text-slate-500 max-w-[240px] mt-1">
              Add active customers in the Customers tab to start tracking deliveries.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {activeMealRows.map(({ customer, mealType, status, planLabel }) => {
              // Status Styling Variables
              let statusText = "Delivered";
              let statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
              let StatusIcon = Check;

              if (status === 'Canceled') {
                statusText = "Canceled";
                statusColor = "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100";
                StatusIcon = X;
              } else if (status === 'Extra') {
                statusText = "Extra Meal";
                statusColor = "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100";
                StatusIcon = Plus;
              }

              return (
                <div
                  key={`${customer.id}-${mealType}`}
                  className="bg-white border border-slate-100 rounded-2xl p-4 flex justify-between items-center shadow-sm transition hover:shadow-md"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-sm tracking-tight">{customer.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        mealType === 'Lunch' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {mealType === 'Lunch' ? '☀️ Lunch' : '🌙 Dinner'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {customer.phone || 'No phone'}
                      </span>
                    </div>
                  </div>

                  {/* Status Toggle Button (Large, thumb-friendly tap target) */}
                  <button
                    onClick={() => handleToggleStatus(customer, mealType, status)}
                    className={`tap-target flex items-center justify-between space-x-2 border px-4 py-2 rounded-xl text-xs font-bold transition duration-200 ${statusColor}`}
                  >
                    <StatusIcon size={14} className="stroke-[3]" />
                    <span>{statusText}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
