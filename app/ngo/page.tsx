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

  // Poll for incoming alerts matching THIS specific logged-in NGO wallet address context
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
      
      // Clear out approved item from this NGO's unique request tracker
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
    } catch (error: any) {
      console.error(error);
      alert("Disbursement failed: " + (error.reason || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <Building2 className="text-slate-800" size={24} />
          <h1 className="text-lg font-bold tracking-tight text-slate-800">NGO Operations Hub</h1>
        </div>
        <button onClick={connectWallet} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all">
          {walletAddress ? `NGO Wallet: ${walletAddress.substring(0, 6)}...` : 'Connect Workspace'}
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Capital Feeder Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col h-[600px]">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ClipboardList size={14}/> Incoming Capital Pool
          </h3>
          
          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {onChainDonations.map((d) => (
              <div 
                key={d.id} 
                onClick={() => { setRootTxHash(ethers.id(d.id)); setAmount(d.amount); }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-all flex justify-between items-center"
              >
                <div><span className="text-xs font-bold text-slate-600">Donation #{d.id}</span></div>
                <span className="text-sm font-bold text-emerald-600">{d.amount} ETH</span>
              </div>
            ))}
            {onChainDonations.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No matching on-chain assets detected.</p>}
          </div>
        </div>

        {/* Workspace Panels */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Dynamic incoming request notification panel */}
          {pendingWorkerRequests.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
              <Bell className="text-amber-600 mt-0.5 shrink-0" size={16} />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-amber-900">Incoming Field Worker Authorization Queries</h4>
                <div className="mt-2 space-y-1.5">
                  {pendingWorkerRequests.map((addr, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-mono text-amber-800 bg-white/60 p-2 rounded border border-amber-200/40">
                      <span className="truncate max-w-[280px]">{addr}</span>
                      <button 
                        onClick={() => { setWorkerAddress(addr); setRecipient(addr); }}
                        className="bg-amber-600 text-white px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase tracking-wider"
                      >
                        Load Target Address
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Identity Authorization Box (Allows full input typing) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1">
              <UserPlus size={14}/> Core Access Control: Authorize Field Personnel
            </h3>
            <form onSubmit={handleRegisterWorker} className="flex gap-3">
              <input
                type="text"
                required
                value={workerAddress}
                onChange={(e) => setWorkerAddress(e.target.value)}
                placeholder="Type or paste field worker address manually (0x...)"
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono rounded-lg block w-full p-3 outline-none focus:border-slate-400"
              />
              <button type="submit" disabled={isRegisteringWorker} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-3 rounded-lg whitespace-nowrap transition-all">
                {isRegisteringWorker ? <Loader2 className="animate-spin" /> : 'Authorize Address'}
              </button>
            </form>
          </div>

          {/* Allocation Deployment Platform */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Disbursement Pipeline</h3>
            <form onSubmit={handleDisburse} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Asset Lineage Reference Link</label>
                <input
                  type="text"
                  required
                  value={rootTxHash}
                  onChange={(e) => setRootTxHash(e.target.value)}
                  placeholder="Select a record from the history pool to map variables automatically"
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono rounded-lg block w-full p-3 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Field Agent Wallet (Type manually or load from notification)</label>
                  <input
                    type="text"
                    required
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..."
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono rounded-lg block w-full p-3 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Disbursement Weight (ETH)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg block w-full p-3 outline-none"
                  />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <>Confirm Downstream Transfer <ArrowRight size={14} /></>}
              </button>
            </form>

            {disburseTx && (
              <div className="mt-4 p-3 bg-slate-900 text-white rounded-lg text-xs font-mono break-all border border-slate-800">
                <span className="font-bold text-emerald-400 block mb-1">✓ Transaction Dispatched Successfully</span>
                {disburseTx}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}