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
      <header className="px-6 py-4 border-b-2 border-[#0f172a] sticky top-0 z-10 bg-[#fdfbf7] space-y-3">
        <h1 className="text-xl font-bold text-[#0f172a] tracking-tight inline-block border-b-2 border-[#0f172a] mb-1">Active Khata</h1>
        
        {/* Search Bar Input */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0f172a]" />
          <input
            type="text"
            placeholder="Search names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border-2 border-[#0f172a] font-hand text-sm focus:outline-none focus:bg-[#bae6fd]/10 shadow-[2px_2px_0px_#0f172a]"
          />
        </div>
      </header>

      {/* Customer List */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-2 space-y-0">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border-2 border-[#0f172a] text-center mt-4 shadow-[4px_4px_0px_#0f172a]">
            <span className="text-4xl mb-3">📝</span>
            <h3 className="text-base font-bold text-[#0f172a] border-b-2 border-[#0f172a]">No Khata Found</h3>
            <p className="text-xs text-[#0f172a] max-w-[240px] mt-2 font-hand">
              {searchQuery ? "Try searching for another name." : "Add a new customer to the register."}
            </p>
          </div>
        ) : (
          <div className="grid gap-0">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onMouseDown={() => startPress(customer)}
                onMouseUp={endPress}
                onMouseLeave={endPress}
                onTouchStart={() => startPress(customer)}
                onTouchEnd={endPress}
                className="ruled-row py-4 flex justify-between items-center select-none active:bg-[#bae6fd]/20 transition duration-150 cursor-pointer"
                title="Long-press to deactivate"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-[#0f172a] text-sm tracking-tight">{customer.name}</h3>
                    <span className="flex items-center text-[10px] font-bold border border-[#0f172a] px-1 font-hand uppercase">
                      [Active]
                    </span>
                  </div>
                  <p className="text-[11px] font-hand text-[#0f172a] flex items-center">
                    {customer.phone || 'No phone number'}
                  </p>
                  <p className="text-[11px] font-hand text-[#0f172a]">
                    Plan: <strong className="ml-1 uppercase">{customer.plan_type}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#0f172a] uppercase font-sans">Per Meal</p>
                  <p className="text-base font-extrabold text-[#0f172a] font-hand mt-0.5">
                    ₹{customer.per_meal_rate.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-center text-[#0f172a] font-bold pt-4 font-hand">
              [💡] Press & hold any row to Delete.
            </p>
          </div>
        )}
      </div>

      {/* FAB (Floating Action Button) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-5 drawn-btn w-14 h-14 bg-white flex items-center justify-center z-20"
        aria-label="Add Customer"
      >
        <UserPlus size={24} className="stroke-[2.5]" />
      </button>

      {/* Add Customer Bottom Sheet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/80 flex justify-center items-end z-50">
          <div className="bg-[#fdfbf7] w-full max-w-lg border-t-4 border-[#0f172a] p-6 space-y-5 max-h-[85vh] overflow-y-auto relative">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b-2 border-[#0f172a]">
              <h2 className="text-lg font-bold text-[#0f172a]">New Entry</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-[#0f172a] border-2 border-[#0f172a] bg-white tap-target shadow-[2px_2px_0px_#0f172a]"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase font-sans">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Rajesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-[#0f172a] font-hand text-sm focus:outline-none focus:bg-[#bae6fd]/10 shadow-[2px_2px_0px_#0f172a]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase font-sans">Phone</label>
                <div className="flex border-2 border-[#0f172a] bg-white shadow-[2px_2px_0px_#0f172a]">
                  <span className="flex items-center px-3 font-bold font-hand border-r-2 border-[#0f172a] bg-slate-100">+91</span>
                  <input
                    type="tel"
                    pattern="[0-9]{10}"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-3 py-2 bg-transparent font-hand text-sm focus:outline-none focus:bg-[#bae6fd]/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase font-sans">Plan *</label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-[#0f172a] font-hand text-sm focus:outline-none shadow-[2px_2px_0px_#0f172a]"
                  >
                    <option value="Lunch">Lunch Only</option>
                    <option value="Dinner">Dinner Only</option>
                    <option value="Both">Both (L & D)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase font-sans">Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="80"
                    value={perMealRate}
                    onChange={(e) => setPerMealRate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-[#0f172a] font-hand text-sm focus:outline-none shadow-[2px_2px_0px_#0f172a]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="drawn-btn w-full bg-white font-bold py-3.5 text-center mt-2 font-sans"
              >
                Save Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {isDeactivateOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-[#0f172a]/80 flex justify-center items-center p-4 z-50">
          <div className="bg-[#fdfbf7] w-full max-w-sm border-2 border-[#0f172a] p-5 shadow-[4px_4px_0px_#0f172a] space-y-4 text-center">
            <div className="w-12 h-12 border-2 border-[#0f172a] bg-white flex items-center justify-center text-[#0f172a] mx-auto shadow-[2px_2px_0px_#0f172a]">
              <Trash2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[#0f172a] text-base border-b-2 border-[#0f172a] inline-block mb-1">Strike Out?</h3>
              <p className="text-xs text-[#0f172a] px-2 font-hand font-bold">
                Are you sure you want to remove <strong>{selectedCustomer.name}</strong> from the active khata?
              </p>
            </div>
            <div className="flex space-x-3 pt-4 border-t-2 border-[#0f172a] mt-4 pt-4">
              <button
                onClick={() => setIsDeactivateOpen(false)}
                className="drawn-btn flex-1 bg-white font-bold py-3 font-sans"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="drawn-btn flex-1 bg-[#0f172a] text-white font-bold py-3 font-sans border-[#0f172a]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
