'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet, Package, Camera, CheckCircle2, Loader2, Send, Building2 } from 'lucide-react';
import { DISBURSEMENT_TRACKER_ADDRESS } from '../../utils/constants';

const FIELD_WORKER_ABI = [
  "function transferCount() view returns (uint256)",
  "function transfers(uint256) view returns (uint256 id, bytes32 rootTxHash, bytes32 parentHash, bytes32 currentTxHash, address sender, address receiver, uint256 amount, uint8 stage, uint256 timestamp, bool verified, string ipfsCID)",
  "function confirmDelivery(uint256 _transferId, string calldata _ipfsCID) external"
];

export default function FieldWorkerDashboard() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom Target NGO Input states
  const [targetNgoAddress, setTargetNgoAddress] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Delivery Execution State
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [ipfsCid, setIpfsCid] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);
    }
  };

  // Submit request explicitly routed to the typed NGO address
  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return alert("Please connect your wallet first!");
    if (!targetNgoAddress.startsWith('0x') || targetNgoAddress.length !== 42) {
      return alert("Please enter a valid 42-character NGO wallet address!");
    }

    setIsSendingRequest(true);

    // Dynamic clean key unique to the typed NGO address
    const ngoStorageKey = `d3tms_requests_${targetNgoAddress.toLowerCase()}`;
    const existingRequests = JSON.parse(localStorage.getItem(ngoStorageKey) || '[]');
    
    if (!existingRequests.includes(walletAddress)) {
      existingRequests.push(walletAddress);
      localStorage.setItem(ngoStorageKey, JSON.stringify(existingRequests));
    }

    setTimeout(() => {
      setIsSendingRequest(false);
      alert(`Request safely sent! NGO (${targetNgoAddress.substring(0,6)}...) has been notified.`);
      setTargetNgoAddress('');
    }, 800);
  };

  const fetchAssignments = async () => {
    if (!window.ethereum || !walletAddress) return;
    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(DISBURSEMENT_TRACKER_ADDRESS, FIELD_WORKER_ABI, provider);
      const count = await contract.transferCount();
      const fetched: any[] = [];

      for (let i = 1; i <= Number(count); i++) {
        const item = await contract.transfers(i);
        if (item.receiver.toLowerCase() === walletAddress.toLowerCase()) {
          fetched.push({
            id: item.id.toString(),
            senderNgo: item.sender,
            amount: ethers.formatEther(item.amount),
            verified: item.verified,
            date: new Date(Number(item.timestamp) * 1000).toLocaleDateString()
          });
        }
      }
      setAssignments(fetched.reverse());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) fetchAssignments();
  }, [walletAddress]);

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !ipfsCid) return;

    try {
      setIsConfirming(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DISBURSEMENT_TRACKER_ADDRESS, FIELD_WORKER_ABI, signer);

      const tx = await contract.confirmDelivery(selectedTask.id, ipfsCid);
      await tx.wait();

      alert("Delivery cryptographically secured!");
      setSelectedTask(null);
      setIpfsCid('');
      fetchAssignments();
    } catch (error: any) {
      console.error(error);
      alert("Verification failed: " + (error.reason || "Make sure this NGO has authorized your wallet."));
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-12">
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Package className="text-amber-500" size={24} />
          <h1 className="text-lg font-bold">D3TMS Field Console</h1>
        </div>
        <button onClick={connectWallet} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-1.5 rounded-md text-sm font-semibold transition-all">
          {walletAddress ? `Active: ${walletAddress.substring(0, 6)}...` : 'Connect Wallet'}
        </button>
      </nav>

      <main className="max-w-md mx-auto mt-8 px-4 space-y-6">
        
        {/* Customized Dynamic NGO Authorization Input Box */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Request NGO Verification</h3>
          <p className="text-xs text-slate-400 mb-4">Type the address of the target NGO to request assignment clearance.</p>
          
          <form onSubmit={handleSendRequest} className="space-y-3">
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1 focus-within:border-amber-500 transition-all">
              <Building2 className="text-slate-500 ml-3" size={16} />
              <input
                type="text"
                required
                value={targetNgoAddress}
                onChange={(e) => setTargetNgoAddress(e.target.value)}
                placeholder="Paste destination NGO address (0x...)"
                className="bg-transparent text-white text-xs block w-full p-2.5 outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isSendingRequest || !walletAddress}
              className="w-full bg-slate-900 border border-slate-700 hover:border-amber-500 text-amber-500 p-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              {isSendingRequest ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              Transmit Access Request
            </button>
          </form>
        </div>

        {selectedTask && (
          <div className="bg-slate-800 p-5 rounded-xl border border-amber-500/40 shadow-xl">
            <h3 className="text-sm font-bold mb-4 text-white">Upload Distribution Manifest #{selectedTask.id}</h3>
            <form onSubmit={handleConfirmDelivery} className="space-y-4">
              <input
                type="text"
                required
                value={ipfsCid}
                onChange={(e) => setIpfsCid(e.target.value)}
                placeholder="Paste IPFS Proof Hash (Qm...)"
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg w-full p-3 font-mono focus:border-amber-500 outline-none"
              />
              <button type="submit" disabled={isConfirming} className="w-full bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-lg text-xs font-bold flex items-center justify-center">
                {isConfirming ? <Loader2 className="animate-spin" /> : 'Commit Delivery Sign-off'}
              </button>
            </form>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Your Clearing Manifest Assignments</h4>
          {isLoading ? (
            <div className="text-center py-4"><Loader2 className="animate-spin text-amber-500 mx-auto" /></div>
          ) : (
            assignments.map((task) => (
              <div 
                key={task.id} 
                className={`p-4 rounded-xl border ${task.verified ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-slate-800 border-slate-700 cursor-pointer'}`}
                onClick={() => !task.verified && setSelectedTask(task)}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-mono text-slate-400">Assignment Reference #{task.id}</span>
                  <span className="text-sm font-bold text-white">{task.amount} ETH</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate font-mono">NGO Principal: {task.senderNgo}</p>
                {task.verified && <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-semibold"><CheckCircle2 size={12}/> Confirmed On-Chain</div>}
              </div>
            ))
          )}
          {assignments.length === 0 && !isLoading && (
            <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl">No active assignments parsed.</p>
          )}
        </div>
      </main>
    </div>
  );
}