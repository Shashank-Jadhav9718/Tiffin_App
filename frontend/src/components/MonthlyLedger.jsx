import React, { useState, useMemo } from 'react';

// Helper to get days in current month
const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

const getDayName = (year, month, day) => {
  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

// Toggle states
const STATES = {
  DELIVERED: 'DELIVERED',
  CANCELED: 'CANCELED',
  NA: 'NA'
};

const NEXT_STATE = {
  [STATES.DELIVERED]: STATES.CANCELED,
  [STATES.CANCELED]: STATES.NA,
  [STATES.NA]: STATES.DELIVERED,
};

const STATE_ICONS = {
  [STATES.DELIVERED]: '✅',
  [STATES.CANCELED]: '❌',
  [STATES.NA]: ''
};

const MonthlyLedger = ({ 
  customerName = "John Doe", 
  phoneNumber = "+1 234 567 8900",
  year = new Date().getFullYear(),
  month = new Date().getMonth()
}) => {
  const numDays = getDaysInMonth(year, month);
  
  // Initialize state for each day (lunch and dinner defaults to DELIVERED)
  const initialState = Array.from({ length: numDays }, (_, i) => ({
    day: i + 1,
    lunch: STATES.DELIVERED,
    dinner: STATES.DELIVERED
  }));

  const [ledgerData, setLedgerData] = useState(initialState);

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });

  const totalMeals = useMemo(() => {
    let count = 0;
    ledgerData.forEach(day => {
      if (day.lunch === STATES.DELIVERED) count++;
      if (day.dinner === STATES.DELIVERED) count++;
    });
    return count;
  }, [ledgerData]);

  const toggleMeal = (dayIndex, mealType) => {
    setLedgerData(prevData => {
      const newData = [...prevData];
      const currentState = newData[dayIndex][mealType];
      newData[dayIndex] = {
        ...newData[dayIndex],
        [mealType]: NEXT_STATE[currentState]
      };
      return newData;
    });
  };

  const getButtonStyle = (state) => {
    const baseStyle = "w-10 h-10 flex items-center justify-center transition-colors text-base cursor-pointer select-none border-2 border-[#0f172a] shadow-[2px_2px_0px_#0f172a] bg-white";
    if (state === STATES.NA) {
      return `${baseStyle} opacity-50 shadow-none`;
    }
    return `${baseStyle} active:bg-slate-200 active:shadow-none translate-y-[2px] translate-x-[2px] transition`;
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto text-[#0f172a] relative">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-[#fdfbf7] border-b-2 border-[#0f172a] pb-3 pt-5 px-5 shadow-sm">
        <div className="flex justify-between items-start mt-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase font-sans border-b-2 border-[#0f172a] inline-block mb-1">
              {monthName} {year}
            </h1>
          </div>
          <div className="text-right">
            <div className="bg-white px-3 py-1 font-bold text-xs border-2 border-[#0f172a] shadow-[2px_2px_0px_#0f172a] font-hand uppercase">
              Meals: {totalMeals}
            </div>
          </div>
        </div>
        <div className="mt-1 flex items-baseline justify-between border-b-2 border-[#0f172a] pb-2 mt-2">
          <h2 className="text-sm font-bold font-sans uppercase">{customerName}</h2>
          <p className="text-xs font-hand font-bold">{phoneNumber}</p>
        </div>
      </div>

      {/* Ledger Grid */}
      <div className="flex-1 overflow-y-auto">
        {/* Table Header */}
        <div className="flex justify-between items-center px-5 py-2 text-[10px] font-bold text-[#0f172a] uppercase tracking-wider sticky top-0 bg-[#fdfbf7] z-0 border-b-2 border-[#0f172a] font-sans">
           <div className="w-16">Date</div>
           <div className="flex gap-4 pr-1">
             <div className="w-10 text-center">Lunch</div>
             <div className="w-10 text-center">Dinner</div>
           </div>
        </div>

        {/* Days List */}
        <div className="pb-8">
          {ledgerData.map((data, index) => {
            const dayName = getDayName(year, month, data.day);
            const isWeekend = dayName === 'Sat' || dayName === 'Sun';
            
            return (
              <div 
                key={data.day} 
                className="ruled-row flex justify-between items-center px-5 py-3 hover:bg-[#bae6fd]/20 transition-colors group"
              >
                <div className="flex items-baseline w-16">
                  <span className={`font-hand text-sm ${isWeekend ? 'font-bold' : 'font-bold'} w-5`}>
                    {String(data.day).padStart(2, '0')}
                  </span>
                  <span className={`font-hand text-[10px] ml-1 uppercase font-bold ${isWeekend ? 'text-[#ef4444]' : 'text-[#0f172a]'}`}>
                    {dayName}
                  </span>
                </div>

                {/* Right Side: Toggle Buttons */}
                <div className="flex gap-4">
                  <button 
                    onClick={() => toggleMeal(index, 'lunch')}
                    className={getButtonStyle(data.lunch)}
                    aria-label={`Toggle lunch for day ${data.day}`}
                  >
                    {STATE_ICONS[data.lunch]}
                  </button>
                  <button 
                    onClick={() => toggleMeal(index, 'dinner')}
                    className={getButtonStyle(data.dinner)}
                    aria-label={`Toggle dinner for day ${data.day}`}
                  >
                    {STATE_ICONS[data.dinner]}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MonthlyLedger;
