import React, { useState } from 'react';
import { X, Phone, MessageCircle } from 'lucide-react';

export default function CustomerProfileModal({ customer, onClose }) {
  const [lunchDelivered, setLunchDelivered] = useState(true);
  const [dinnerDelivered, setDinnerDelivered] = useState(false);

  // Mock data for the ledger
  const ledgerDates = ['01/06', '02/06', '03/06', '04/06', '05/06', '06/06'];
  const todayDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Example due calculation
  const totalMeals = 11;
  const baseRate = 80;
  const currentDue = totalMeals * baseRate;

  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
      {/* Modal Container */}
      <div className="w-full max-w-lg bg-[#f8fafc] rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up relative">
        
        {/* Close Button (Floating) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 z-10"
        >
          <X size={18} />
        </button>

        {/* Scrollable Inner Content */}
        <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-5">
          
          {/* 1. Profile Header & Preferences */}
          <div className="pt-2">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{customer.name || 'Rahul Sharma'}</h2>
            <p className="text-slate-500 font-medium text-sm mt-0.5">{customer.phone || '+91 98765 43210'}</p>
            
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                Plan: Lunch & Dinner
              </span>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                Diet: Pure Veg
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                Base Rate: ₹{baseRate}/meal
              </span>
            </div>
          </div>

          {/* 2. Active Meal Plan Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Active Meal Plan</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700">Veg Thali</span>
                <span className="text-sm font-bold text-slate-900">₹80/meal</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-sm font-semibold text-slate-500">Chicken/Non-Veg Upgrade</span>
                <span className="text-sm font-bold text-slate-500">₹120/meal</span>
              </div>
            </div>
          </div>

          {/* 3. Today's Delivery (STRICT TOGGLES) */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Today's Delivery</h3>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{todayDate}</span>
            </div>
            
            <div className="space-y-4">
              {/* Lunch Toggle Row */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">☀️</span>
                  <span className="text-sm font-bold text-slate-700">Lunch</span>
                </div>
                {/* iOS Style Toggle */}
                <button 
                  onClick={() => setLunchDelivered(!lunchDelivered)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ease-in-out ${lunchDelivered ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${lunchDelivered ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Dinner Toggle Row */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🌙</span>
                  <span className="text-sm font-bold text-slate-700">Dinner</span>
                </div>
                {/* iOS Style Toggle */}
                <button 
                  onClick={() => setDinnerDelivered(!dinnerDelivered)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ease-in-out ${dinnerDelivered ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${dinnerDelivered ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* 4. Monthly Ledger (Clean Data Grid) */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 overflow-hidden">
            <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Monthly Ledger (June)</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200">
                    <th className="pb-2 font-semibold">DATE</th>
                    <th className="pb-2 font-semibold text-center">SUN</th>
                    <th className="pb-2 font-semibold text-center">MON</th>
                    <th className="pb-2 font-semibold text-center">TUE</th>
                    <th className="pb-2 font-semibold text-center">WED</th>
                    <th className="pb-2 font-semibold text-center">THU</th>
                    <th className="pb-2 font-semibold text-center">FRI</th>
                    <th className="pb-2 font-semibold text-center">SAT</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {ledgerDates.map((date, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 font-medium">{date}</td>
                      <td className="py-2.5 text-center">{idx % 7 === 0 ? '❌' : '✅'}</td>
                      <td className="py-2.5 text-center">{idx % 7 === 1 ? '❌' : '✅'}</td>
                      <td className="py-2.5 text-center">{idx % 7 === 2 ? '❌' : '✅'}</td>
                      <td className="py-2.5 text-center">{idx % 7 === 3 ? '❌' : '✅'}</td>
                      <td className="py-2.5 text-center">{idx % 7 === 4 ? '❌' : '✅'}</td>
                      <td className="py-2.5 text-center">{idx % 7 === 5 ? '❌' : '✅'}</td>
                      <td className="py-2.5 text-center">{idx % 7 === 6 ? '❌' : '✅'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Billing Section */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600">Current Due</span>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-medium">{totalMeals} Meals × ₹{baseRate}</p>
              <p className="text-lg font-black text-slate-800">₹{currentDue}</p>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-6 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-b-3xl">
          <a
            href={`tel:${customer.phone?.replace(/\D/g, '') || ''}`}
            className="flex items-center justify-center space-x-2 px-6 py-3.5 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition active:scale-[0.98]"
          >
            <Phone size={18} />
            <span>Call</span>
          </a>
          <a
            href={`https://wa.me/${customer.phone?.replace(/\D/g, '')}?text=Hi%20${customer.name},%20your%20tiffin%20bill%20due%20is%20%E2%82%B9${currentDue}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3.5 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20b858] shadow-lg shadow-[#25D366]/30 transition active:scale-[0.98]"
          >
            <MessageCircle size={18} />
            <span>Request ₹{currentDue}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
