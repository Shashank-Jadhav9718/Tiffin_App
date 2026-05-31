import React, { useState, useEffect } from 'react';
import { Home, Users, Receipt, Shield, Lock, Trash2, KeyRound, Check, RefreshCw, X, ShieldAlert } from 'lucide-react';
import Dashboard from './screens/Dashboard';
import Customers from './screens/Customers';
import Billing from './screens/Billing';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');

  // Security Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState(() => {
    return localStorage.getItem('tiffin_app_pin') || '1234';
  });

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [oldPinChange, setOldPinChange] = useState('');
  const [newPinChange, setNewPinChange] = useState('');

  // Global Loading State
  const [globalLoading, setGlobalLoading] = useState(false);

  // Global Toast State
  const [toast, setToast] = useState(null); // { message, type }

  // Custom Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle keypad taps for security screen
  const handleKeypadPress = (val) => {
    if (val === 'C') {
      setPin('');
      return;
    }

    if (pin.length < 4) {
      const updatedPin = pin + val;
      setPin(updatedPin);

      // Verify once 4 digits are completed
      if (updatedPin.length === 4) {
        if (updatedPin === savedPin) {
          setTimeout(() => {
            setIsAuthenticated(true);
            showToast('Access Granted! 🍱', 'success');
          }, 200);
        } else {
          setTimeout(() => {
            showToast('Invalid Security PIN. Try again!', 'error');
            setPin('');
          }, 200);
        }
      }
    }
  };

  // Change PIN Submission
  const handleChangePin = (e) => {
    e.preventDefault();
    if (oldPinChange !== savedPin) {
      showToast('Old PIN is incorrect!', 'error');
      return;
    }
    if (newPinChange.length !== 4 || isNaN(newPinChange)) {
      showToast('New PIN must be exactly 4 digits!', 'error');
      return;
    }

    localStorage.setItem('tiffin_app_pin', newPinChange);
    setSavedPin(newPinChange);
    setOldPinChange('');
    setNewPinChange('');
    setIsSettingsOpen(false);
    showToast('Security PIN changed successfully!', 'success');
  };

  // Render auth screen if not logged in
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-slate-900 text-white flex flex-col justify-between p-6 z-[9999] overflow-hidden select-none">
        
        {/* Auth Header */}
        <div className="flex flex-col items-center mt-12 space-y-3">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border border-emerald-400/20">
            <Lock size={30} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Tiffin Manager PWA</h1>
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Security Lockscreen</p>
        </div>

        {/* PIN Indicators */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-6">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 border-2 ${
                  pin.length > idx
                    ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-emerald-500/30'
                    : 'border-slate-600 bg-transparent'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400 font-medium">Enter 4-digit code (Default: 1234)</p>
        </div>

        {/* Numeric Keypad (Circular, thumb-friendly tap targets) */}
        <div className="w-full max-w-xs mx-auto mb-10 grid grid-cols-3 gap-4 justify-items-center">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0'].map((key) => (
            <button
              key={key}
              onClick={() => handleKeypadPress(key)}
              className={`tap-target w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold transition active:scale-95 duration-100 ${
                key === 'C'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700/50'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Global Toast inside Lock Screen */}
        {toast && (
          <div className={`fixed top-5 left-4 right-4 p-4 rounded-2xl flex items-center space-x-2 text-xs font-bold shadow-lg border animate-slide-up z-50 ${
            toast.type === 'success' 
              ? 'bg-emerald-500 text-white border-emerald-400' 
              : 'bg-rose-500 text-white border-rose-400'
          }`}>
            <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background relative pb-20">
      
      {/* Dynamic Screen Mounting */}
      <main className="flex-1 w-full max-w-md mx-auto">
        {activeTab === 'dashboard' && (
          <Dashboard
            onOpenSettings={() => setIsSettingsOpen(true)}
            showToast={showToast}
            showLoading={setGlobalLoading}
          />
        )}
        {activeTab === 'customers' && (
          <Customers
            showToast={showToast}
            showLoading={setGlobalLoading}
          />
        )}
        {activeTab === 'billing' && (
          <Billing
            showToast={showToast}
            showLoading={setGlobalLoading}
          />
        )}
      </main>

      {/* Navigation (Sticky bottom navigation bar with 3 tabs) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 py-2.5 z-40 shadow-lg">
        <div className="max-w-md mx-auto flex justify-around items-center px-4">
          
          {/* Dashboard Tab */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`tap-target flex flex-col items-center space-y-1 transition duration-150 ${
              activeTab === 'dashboard' ? 'text-emerald-500 font-bold scale-105' : 'text-slate-400'
            }`}
          >
            <Home size={20} className={activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] tracking-wide">Dashboard</span>
          </button>

          {/* Customers Tab */}
          <button
            onClick={() => setActiveTab('customers')}
            className={`tap-target flex flex-col items-center space-y-1 transition duration-150 ${
              activeTab === 'customers' ? 'text-emerald-500 font-bold scale-105' : 'text-slate-400'
            }`}
          >
            <Users size={20} className={activeTab === 'customers' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] tracking-wide">Customers</span>
          </button>

          {/* Billing Tab */}
          <button
            onClick={() => setActiveTab('billing')}
            className={`tap-target flex flex-col items-center space-y-1 transition duration-150 ${
              activeTab === 'billing' ? 'text-emerald-500 font-bold scale-105' : 'text-slate-400'
            }`}
          >
            <Receipt size={20} className={activeTab === 'billing' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] tracking-wide">Billing</span>
          </button>

        </div>
      </nav>

      {/* Global Settings Modal (Manage PIN, overlay shell) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-5 animate-slide-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Shield className="text-emerald-500" size={20} />
                <h3 className="font-bold text-slate-800 text-sm tracking-tight">Security & Settings</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Change PIN Form */}
            <form onSubmit={handleChangePin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current 4-digit PIN</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="Enter current PIN"
                  value={oldPinChange}
                  onChange={(e) => setOldPinChange(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition tap-target font-mono text-center tracking-widest"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">New 4-digit PIN</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="Enter new PIN"
                  value={newPinChange}
                  onChange={(e) => setNewPinChange(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition tap-target font-mono text-center tracking-widest"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition tap-target shadow-md active:scale-[0.98]"
              >
                Update PIN Code
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global Translucent Loader Overlay */}
      {globalLoading && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex justify-center items-center z-[999]">
          <div className="bg-white/90 shadow-xl rounded-2xl p-6 flex flex-col items-center space-y-3.5 border border-slate-100">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
            </div>
            <span className="text-xs font-bold text-slate-600 tracking-wide uppercase">Connecting...</span>
          </div>
        </div>
      )}

      {/* Global Toast Alert Queue */}
      {toast && (
        <div className={`fixed top-4 left-4 right-4 p-4 rounded-2xl flex items-center space-x-2 text-xs font-bold shadow-lg border animate-slide-up z-[9999] ${
          toast.type === 'success' 
            ? 'bg-emerald-500 text-white border-emerald-400' 
            : 'bg-rose-500 text-white border-rose-400'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
