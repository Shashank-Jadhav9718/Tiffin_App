import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Phone, CreditCard, Layers, X, Trash2, CheckCircle2 } from 'lucide-react';
import { getCustomers, postCustomer, deactivateCustomer } from '../api';

export default function Customers({ showToast, showLoading }) {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Add Customer Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [planType, setPlanType] = useState('Both');
  const [perMealRate, setPerMealRate] = useState('');

  // Long press timer ref
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);

  // Fetch active customers
  const loadCustomers = async () => {
    showLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data || []);
    } catch (error) {
      showToast(error.message || 'Failed to fetch customers', 'error');
    } finally {
      showLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter customers by search input
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle Add Customer Submission
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!name.trim() || !perMealRate) {
      showToast('Name and Meal Rate are required!', 'error');
      return;
    }

    showLoading(true);
    try {
      const formattedPhone = phone.trim() ? (phone.startsWith('+91') ? phone.trim() : `+91${phone.trim()}`) : '';
      
      await postCustomer({
        name: name.trim(),
        phone: formattedPhone,
        plan_type: planType,
        per_meal_rate: parseFloat(perMealRate)
      });

      showToast('Customer added successfully! 🍱', 'success');
      
      // Reset form & close modal
      setName('');
      setPhone('');
      setPlanType('Both');
      setPerMealRate('');
      setIsModalOpen(false);
      
      // Refresh list
      await loadCustomers();
    } catch (error) {
      showToast(error.message || 'Failed to add customer', 'error');
    } finally {
      showLoading(false);
    }
  };

  // Triggered when a long press is successful
  const handleLongPress = (customer) => {
    setSelectedCustomer(customer);
    setIsDeactivateOpen(true);
  };

  // Touch handlers for Long Press on cards
  const startPress = (customer) => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      handleLongPress(customer);
    }, 600); // 600ms threshold for long press
  };

  const endPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  // Perform customer deactivation
  const handleDeactivate = async () => {
    if (!selectedCustomer) return;
    showLoading(true);
    try {
      await deactivateCustomer(selectedCustomer.id);
      showToast(`${selectedCustomer.name} deactivated successfully.`, 'success');
      setIsDeactivateOpen(false);
      setSelectedCustomer(null);
      await loadCustomers();
    } catch (error) {
      showToast(error.message || 'Failed to deactivate customer', 'error');
    } finally {
      showLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header & Search */}
      <header className="px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm space-y-3">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Active Customers</h1>
        
        {/* Search Bar Input */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition tap-target"
          />
        </div>
      </header>

      {/* Customer List */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4 space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl shadow-premium border border-slate-100 text-center">
            <span className="text-4xl mb-3">🍱</span>
            <h3 className="text-base font-bold text-slate-800">No Customers Found</h3>
            <p className="text-xs text-slate-500 max-w-[240px] mt-1">
              {searchQuery ? "Try searching for another name or check spelling." : "No active customers yet. Add your first one! 🍱"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onMouseDown={() => startPress(customer)}
                onMouseUp={endPress}
                onMouseLeave={endPress}
                onTouchStart={() => startPress(customer)}
                onTouchEnd={endPress}
                className="bg-white border border-slate-100 rounded-2xl p-4 flex justify-between items-center shadow-sm select-none active:scale-[0.99] transition duration-150 cursor-pointer"
                title="Long-press to deactivate"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-800 text-sm tracking-tight">{customer.name}</h3>
                    <span className="flex items-center text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                      <CheckCircle2 size={10} className="mr-0.5" /> Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center">
                    <Phone size={12} className="mr-1 text-slate-400" />
                    {customer.phone || 'No phone number'}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center">
                    <Layers size={12} className="mr-1 text-slate-400" />
                    Plan: <strong className="ml-1 text-slate-700 font-semibold">{customer.plan_type}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Per Meal</p>
                  <p className="text-base font-extrabold text-emerald-600">
                    ₹{customer.per_meal_rate.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-center text-slate-400 font-medium pt-2">
              💡 Tip: Press & hold any customer card to Deactivate.
            </p>
          </div>
        )}
      </div>

      {/* FAB (Floating Action Button) - Large Tap Target */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-5 tap-target w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-600 hover:shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all duration-200 z-20"
        aria-label="Add Customer"
      >
        <UserPlus size={24} className="stroke-[2.5]" />
      </button>

      {/* Add Customer Bottom Sheet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end z-50 transition-opacity">
          <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-2xl p-6 space-y-5 animate-slide-up max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Add New Customer</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Rajesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition tap-target"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">+91</span>
                  <input
                    type="tel"
                    pattern="[0-9]{10}"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition tap-target"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Provide a 10-digit number. We'll automatically add the +91 prefix.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Subscription Plan *</label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition tap-target"
                  >
                    <option value="Lunch">Lunch Only</option>
                    <option value="Dinner">Dinner Only</option>
                    <option value="Both">Both (Lunch & Dinner)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Meal Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="E.g. 80"
                    value={perMealRate}
                    onChange={(e) => setPerMealRate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition tap-target"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition tap-target shadow-md hover:shadow-emerald-500/10 active:scale-[0.98]"
              >
                Create Customer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {isDeactivateOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-base">Deactivate Customer?</h3>
              <p className="text-xs text-slate-500 px-2">
                Are you sure you want to deactivate <strong>{selectedCustomer.name}</strong>? They will no longer appear in today's attendance sheets or billing cycles.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setIsDeactivateOpen(false)}
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-100 transition tap-target"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="flex-1 bg-rose-500 text-white font-bold py-3 rounded-xl hover:bg-rose-600 transition tap-target shadow-md"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
