'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet, Building2, ClipboardList, CheckCircle2, UserPlus, ArrowRight, Loader2, Bell } from 'lucide-react';
import { DISBURSEMENT_TRACKER_ADDRESS, TREASURY_ADDRESS, TREASURY_ABI } from '../../utils/constants';

const DISBURSEMENT_ABI = [
  "function registerFieldWorker(address _worker) external",
  "function logTransfer(bytes32 _rootTxHash, bytes32 _parentHash, address _receiver, uint256 _amount, uint8 _stage, string calldata _ipfsCID) external returns (bytes32)",
  "function transferCount() view returns (uint256)"
];

export default function NgoDashboard() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [onChainDonations, setOnChainDonations] = useState<any[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null);

  // Notifications State 
  const [pendingWorkerRequests, setPendingWorkerRequests] = useState<string[]>([]);

  // Open inputs for manual typing
  const [workerAddress, setWorkerAddress] = useState('');
  const [isRegisteringWorker, setIsRegisteringWorker] = useState(false);

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [rootTxHash, setRootTxHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disburseTx, setDisburseTx] = useState<string | null>(null);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);
    }
  };

  const checkTargetedWorkerRequests = () => {
    if (!walletAddress) return;
    const ngoStorageKey = `d3tms_requests_${walletAddress.toLowerCase()}`;
    const requests = JSON.parse(localStorage.getItem(ngoStorageKey) || '[]');
    setPendingWorkerRequests(requests);
  };

  const fetchDonations = async () => {
    if (!window.ethereum || !walletAddress) return;
    try {
      setLoadingDonations(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const treasuryContract = new ethers.Contract(TREASURY_ADDRESS, TREASURY_ABI, provider);
      const count = await treasuryContract.donationCount();
      const fetched: any[] = [];

      for (let i = 0; i < Number(count); i++) {
        const item = await treasuryContract.donations(i);
        if (item.ngo.toLowerCase() === walletAddress.toLowerCase()) {
          fetched.push({
            id: item.id.toString(),
            donor: item.donor,
            amount: ethers.formatEther(item.amount)
          });
        }
      }
      setOnChainDonations(fetched.reverse()); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDonations(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchDonations();
      checkTargetedWorkerRequests();
      window.addEventListener('storage', checkTargetedWorkerRequests);
      return () => window.removeEventListener('storage', checkTargetedWorkerRequests);
    }
  }, [walletAddress]);

  const handleRegisterWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerAddress.startsWith('0x') || workerAddress.length !== 42) return alert("Invalid address formatting.");

    try {
      setIsRegisteringWorker(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const trackerContract = new ethers.Contract(DISBURSEMENT_TRACKER_ADDRESS, DISBURSEMENT_ABI, signer);

      const tx = await trackerContract.registerFieldWorker(workerAddress);
      await tx.wait();

      alert("Field Worker identity successfully approved on-chain!");
      
      const ngoStorageKey = `d3tms_requests_${walletAddress!.toLowerCase()}`;
      const filtered = pendingWorkerRequests.filter(addr => addr.toLowerCase() !== workerAddress.toLowerCase());
      localStorage.setItem(ngoStorageKey, JSON.stringify(filtered));
      setPendingWorkerRequests(filtered);
      setWorkerAddress('');
    } catch (error: any) {
      console.error(error);
      alert("Registration failed: " + (error.reason || error.message));
    } finally {
      setIsRegisteringWorker(false);
    }
  };

  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const trackerContract = new ethers.Contract(DISBURSEMENT_TRACKER_ADDRESS, DISBURSEMENT_ABI, signer);

      const tx = await trackerContract.logTransfer(rootTxHash, ethers.id(rootTxHash), recipient, ethers.parseEther(amount), 3, "Operational Manifest Logged");
      await tx.wait();

      setDisburseTx(tx.hash);
      alert("Downstream allocation executed smoothly!");

      // THE FIX: Remove the active donation item from list dynamically
      if (selectedDonationId) {
        setOnChainDonations((prev) => prev.filter((item) => item.id !== selectedDonationId));
        setSelectedDonationId(null);
      }

      // Reset transaction inputs safely
      setRootTxHash('');
      setAmount('');
      setRecipient('');
    } catch (error: any) {
      console.error(error);
      alert("Disbursement failed: " + (error.reason || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 selection:bg-slate-900 selection:text-white antialiased">
      {/* Premium Thin Border Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-900 rounded-md text-white">
            <Building2 size={16} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900">NGO Operations Hub</span>
        </div>
        <button 
          onClick={connectWallet} 
          className="bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-tight shadow-sm transition-all"
        >
          {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : 'Connect Workspace'}
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Hand: Live Assets Feed Panel */}
        <div className="bg-white rounded-xl border border-slate-200/70 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col h-[620px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList size={13} className="text-slate-400"/> Incoming Capital Pool
            </h3>
            <span className="text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
              {onChainDonations.length} available
            </span>
          </div>
          
          <div className="space-y-2 overflow-y-auto flex-1 pr-1 border-t border-slate-100 pt-3">
            {onChainDonations.map((d) => {
              const isSelected = selectedDonationId === d.id;
              return (
                <div 
                  key={d.id} 
                  onClick={() => { 
                    setRootTxHash(ethers.id(d.id)); 
                    setAmount(d.amount); 
                    setSelectedDonationId(d.id);
                  }}
                  className={`p-3.5 rounded-lg border text-left transition-all duration-200 cursor-pointer flex justify-between items-center ${
                    isSelected 
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900 shadow-sm' 
                      : 'border-slate-200/60 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-slate-800">Donation #{d.id}</span>
                    <span className="text-[10px] text-slate-400 font-mono block max-w-[140px] truncate">From: {d.donor}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 font-mono bg-slate-100/80 px-2 py-1 rounded">
                    {d.amount} ETH
                  </span>
                </div>
              );
            })}
            {onChainDonations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <p className="text-xs text-slate-400">No active pool assets requiring lineage mapping.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Hand / Main Control Blocks */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Real-time Storage Signals Banner */}
          {pendingWorkerRequests.length > 0 && (
            <div className="bg-white border-l-2 border-slate-900 p-4 rounded-r-xl border-y border-r border-slate-200/70 shadow-sm flex gap-3">
              <Bell className="text-slate-800 shrink-0 mt-0.5" size={15} />
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-slate-900">Pending Field Agent Queries</h4>
                <div className="mt-3 space-y-2">
                  {pendingWorkerRequests.map((addr, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200/40">
                      <span className="font-mono text-slate-600 truncate max-w-[280px]">{addr}</span>
                      <button 
                        onClick={() => { setWorkerAddress(addr); setRecipient(addr); }}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded text-[10px] font-medium transition-all"
                      >
                        Map Address
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Access Control Board */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <UserPlus size={13} className="text-slate-400"/> Core Access Control: Authorize Field Personnel
            </h3>
            <form onSubmit={handleRegisterWorker} className="flex gap-2.5">
              <input
                type="text"
                required
                value={workerAddress}
                onChange={(e) => setWorkerAddress(e.target.value)}
                placeholder="0x..."
                className="bg-slate-50 border border-slate-200/70 text-slate-800 text-xs font-mono rounded-lg block w-full p-2.5 outline-none focus:bg-white focus:border-slate-400 transition-all"
              />
              <button 
                type="submit" 
                disabled={isRegisteringWorker} 
                className="bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 text-white font-medium text-xs px-4 rounded-lg flex items-center justify-center min-w-[130px] transition-all"
              >
                {isRegisteringWorker ? <Loader2 className="animate-spin" size={14} /> : 'Approve Registry'}
              </button>
            </form>
          </div>

          {/* Disbursement Pipeline */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-5">Disbursement Engine</h3>
            <form onSubmit={handleDisburse} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5 tracking-wider">Asset Lineage Reference</label>
                <input
                  type="text"
                  required
                  value={rootTxHash}
                  onChange={(e) => setRootTxHash(e.target.value)}
                  placeholder="Select an asset from the history pool to automatically generate lineages"
                  className="bg-slate-50 border border-slate-200/70 text-slate-800 text-xs font-mono rounded-lg block w-full p-2.5 outline-none focus:bg-white focus:border-slate-400 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5 tracking-wider">Target Recipient Address</label>
                  <input
                    type="text"
                    required
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..."
                    className="bg-slate-50 border border-slate-200/70 text-slate-800 text-xs font-mono rounded-lg block w-full p-2.5 outline-none focus:bg-white focus:border-slate-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5 tracking-wider">Allocation Weight (ETH)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-50 border border-slate-200/70 text-slate-800 text-xs rounded-lg block w-full p-2.5 outline-none focus:bg-white focus:border-slate-400 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting || !rootTxHash} 
                  className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 text-white p-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <>Execute Pipeline Release <ArrowRight size={13} /></>}
                </button>
              </div>
            </form>

            {disburseTx && (
              <div className="mt-4 p-3 bg-slate-50 text-slate-800 rounded-lg text-[11px] font-mono border border-slate-200/60 transition-all animate-in fade-in duration-300">
                <div className="flex items-center gap-1.5 text-emerald-600 font-sans font-bold mb-1">
                  <CheckCircle2 size={13} />
                  <span>On-Chain Allocation Logged</span>
                </div>
                <span className="text-slate-500 break-all">{disburseTx}</span>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}