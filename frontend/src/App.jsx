import React, { useState, useEffect } from 'react';
import { Home, Users, Receipt, Shield, Lock, Trash2, KeyRound, Check, RefreshCw, X, ShieldAlert, Book } from 'lucide-react';
import Dashboard from './screens/Dashboard';
import Customers from './screens/Customers';
import Billing from './screens/Billing';
import MonthlyLedger from './components/MonthlyLedger';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');

  // Security Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(true);

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
      <div className="fixed inset-0 bg-[#fdfbf7] text-[#0f172a] flex flex-col justify-between p-6 z-[9999] overflow-hidden select-none font-sans">
        
        {/* Auth Header */}
        <div className="flex flex-col items-center mt-12 space-y-3">
          <div className="w-16 h-16 border-2 border-[#0f172a] flex items-center justify-center">
            <Lock size={30} className="text-[#0f172a]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight border-b-2 border-[#0f172a] pb-1">Tiffin Bahi Khata</h1>
          <p className="text-xs font-bold tracking-wider uppercase font-hand">Security Lock</p>
        </div>

        {/* PIN Indicators */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-6">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 border-2 border-[#0f172a] ${
                  pin.length > idx ? 'bg-[#0f172a]' : 'bg-transparent'
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-bold font-hand">Enter 4-digit code (1234)</p>
        </div>

        {/* Numeric Keypad */}
        <div className="w-full max-w-xs mx-auto mb-10 grid grid-cols-3 gap-4 justify-items-center">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0'].map((key) => (
            <button
              key={key}
              onClick={() => handleKeypadPress(key)}
              className="drawn-btn w-16 h-16 flex items-center justify-center text-xl font-bold font-hand"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Global Toast inside Lock Screen */}
        {toast && (
          <div className={`fixed top-5 left-4 right-4 p-4 border-2 border-[#0f172a] font-bold z-50 ${
            toast.type === 'success' ? 'bg-[#bae6fd]' : 'bg-[#ef4444] text-white'
          }`}>
            <span className="font-hand">{toast.type === 'success' ? '[✓]' : '[!]'} {toast.message}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="notebook-container flex flex-col min-h-screen relative pb-20">
      <div className="notebook-margin"></div>
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
        {activeTab === 'ledger' && (
          <div className="pt-4 h-screen">
            <MonthlyLedger />
          </div>
        )}
      </main>

      {/* Navigation (Sticky bottom navigation bar with 4 tabs) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#fdfbf7] border-t-2 border-[#0f172a] py-2 z-40">
        <div className="max-w-md mx-auto flex justify-around items-center px-4 pl-12">
          
          {/* Dashboard Tab */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`tap-target flex flex-col items-center space-y-1 ${
              activeTab === 'dashboard' ? 'text-[#0f172a] font-bold' : 'text-slate-400 font-semibold'
            }`}
          >
            <Home size={20} className={activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] tracking-wide uppercase">Today</span>
          </button>

          {/* Customers Tab */}
          <button
            onClick={() => setActiveTab('customers')}
            className={`tap-target flex flex-col items-center space-y-1 ${
              activeTab === 'customers' ? 'text-[#0f172a] font-bold' : 'text-slate-400 font-semibold'
            }`}
          >
            <Users size={20} className={activeTab === 'customers' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] tracking-wide uppercase">Khata</span>
          </button>

          {/* Billing Tab */}
          <button
            onClick={() => setActiveTab('billing')}
            className={`tap-target flex flex-col items-center space-y-1 ${
              activeTab === 'billing' ? 'text-[#0f172a] font-bold' : 'text-slate-400 font-semibold'
            }`}
          >
            <Receipt size={20} className={activeTab === 'billing' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] tracking-wide uppercase">Bill</span>
          </button>

          {/* Ledger Tab */}
          <button
            onClick={() => setActiveTab('ledger')}
            className={`tap-target flex flex-col items-center space-y-1 ${
              activeTab === 'ledger' ? 'text-[#0f172a] font-bold' : 'text-slate-400 font-semibold'
            }`}
          >
            <Book size={20} className={activeTab === 'ledger' ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="text-[10px] tracking-wide uppercase">Month</span>
          </button>

        </div>
      </nav>

      {/* Global Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/80 flex justify-center items-center p-4 z-50">
          <div className="bg-[#fdfbf7] w-full max-w-sm border-2 border-[#0f172a] p-5 space-y-5 shadow-[4px_4px_0px_#0f172a]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b-2 border-[#0f172a]">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-[#0f172a] text-lg">System Status</h3>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-[#0f172a]">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 font-hand">
              <div className="p-3 border-2 border-[#0f172a] flex items-center space-x-3 bg-white">
                <div className="font-bold text-xl">[ OK ]</div>
                <div>
                  <p className="font-bold">Connected</p>
                  <p className="text-xs">FastAPI Backend Active</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="ruled-row pb-1">
                  <label className="text-xs font-bold font-sans">API Endpoint</label>
                  <p className="text-sm">http://127.0.0.1:8000</p>
                </div>
                <div className="ruled-row pb-1">
                  <label className="text-xs font-bold font-sans">Database</label>
                  <p className="text-sm">Supabase Storage</p>
                </div>
                <div className="ruled-row pb-1">
                  <label className="text-xs font-bold font-sans">Version</label>
                  <p className="text-sm">v1.0.0 (Bahi Khata)</p>
                </div>
              </div>

              <button
                onClick={() => setIsSettingsOpen(false)}
                className="drawn-btn w-full py-3 font-bold text-lg font-sans mt-4"
              >
                Close
              </button>
            </div>
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
        <div className={`fixed top-4 left-10 right-4 p-4 border-2 border-[#0f172a] font-bold z-[9999] shadow-[4px_4px_0px_#0f172a] ${
          toast.type === 'success' 
            ? 'bg-[#bae6fd] text-[#0f172a]' 
            : 'bg-[#ef4444] text-white'
        }`}>
          <span className="font-hand">{toast.type === 'success' ? '[✓]' : '[!]'} {toast.message}</span>
        </div>
      )}

    </div>
  );
}
