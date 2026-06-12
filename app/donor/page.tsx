'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { Wallet, ShieldCheck, ArrowRight, Loader2, CheckCircle2, Circle, Building2 } from 'lucide-react';
import { TREASURY_ADDRESS, TREASURY_ABI } from '../../utils/constants';

export default function DonorDashboard() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [targetNgoAddress, setTargetNgoAddress] = useState(''); // Replaced fixed list with custom address input
  const [isDonating, setIsDonating] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Trace States
  const [inputHash, setInputHash] = useState('');
  const [isTracing, setIsTracing] = useState(false);
  const [traceResult, setTraceResult] = useState<any>(null);

  // Connect MetaMask
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error("User rejected request");
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  // Web3 Donation Logic
  const handleDonate = async () => {
    if (!walletAddress) return alert("Please connect your wallet first!");
    
    // Validate the inputted Ethereum address
    if (!targetNgoAddress.startsWith('0x') || targetNgoAddress.length !== 42) {
      return alert("Please enter a valid NGO wallet address (0x...)!");
    }
    
    if (!donationAmount || Number(donationAmount) <= 0) return alert("Enter a valid amount!");

    try {
      setIsDonating(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const treasuryContract = new ethers.Contract(TREASURY_ADDRESS, TREASURY_ABI, signer);
      const amountInWei = ethers.parseEther(donationAmount);

      // Pass the dynamically typed targetNgoAddress to the smart contract
      const tx = await treasuryContract.donate(targetNgoAddress, { value: amountInWei });
      await tx.wait();
      
      setTxHash(tx.hash);
      setInputHash(tx.hash); // Automatically fill the tracer input
      alert(`Donation Successful! Routed to NGO: ${targetNgoAddress.substring(0, 6)}...`);
    } catch (error) {
      console.error("Donation failed:", error);
      alert("Transaction failed.");
    } finally {
      setIsDonating(false);
      setDonationAmount('');
      setTargetNgoAddress(''); // Clear the input after success
    }
  };

  // Web3 Trace Tracking Logic
  const handleTrace = async () => {
    if (!inputHash.startsWith('0x') || inputHash.length !== 66) {
      return alert("Please enter a valid 66-character transaction hash!");
    }

    try {
      setIsTracing(true);
      setTraceResult(null);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const tx = await provider.getTransaction(inputHash);

      if (!tx) {
        alert("Transaction not found on Sepolia yet. Wait for a block confirmation.");
        return;
      }

      // Check if target matches your Treasury deployment address
      const isToTreasury = tx.to?.toLowerCase() === TREASURY_ADDRESS.toLowerCase();

      setTraceResult({
        hash: tx.hash,
        sender: tx.from,
        destination: tx.to,
        value: ethers.formatEther(tx.value),
        blockNumber: tx.blockNumber,
        isValidTreasuryTx: isToTreasury
      });

    } catch (error) {
      console.error("Trace failed:", error);
      alert("Could not fetch transaction details.");
    } finally {
      setIsTracing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-blue-600" size={32} />
          <h1 className="text-2xl font-bold tracking-tight">D3TMS Donor</h1>
        </div>
        <button onClick={connectWallet} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2">
          <Wallet size={18} />
          {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}` : 'Connect Wallet'}
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Donate Card */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-2xl font-bold mb-2">Make a Donation</h3>
            <p className="text-gray-500 mb-6">Contribute to the emergency relief fund. You will receive an NFT Certificate of Impact.</p>
            
            {/* Custom Target NGO Input */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Destination NGO Wallet Address</label>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <Building2 className="text-gray-400 ml-3" size={18} />
                <input 
                  type="text" 
                  value={targetNgoAddress}
                  onChange={(e) => setTargetNgoAddress(e.target.value)}
                  placeholder="Paste target NGO address (0x...)" 
                  className="bg-transparent text-gray-900 text-sm block w-full p-3 outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <input 
                type="number" 
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                placeholder="Amount in ETH" 
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg block w-full p-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleDonate}
                disabled={isDonating}
                className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium whitespace-nowrap flex items-center gap-2 transition-all"
              >
                {isDonating ? <Loader2 className="animate-spin" size={18} /> : 'Donate Now'}
              </button>
            </div>
            {txHash && (
              <p className="mt-4 text-sm text-green-600 break-all bg-green-50 p-3 rounded-lg border border-green-100">
                Success! Tx Hash: <strong>{txHash}</strong>
              </p>
            )}
          </div>

          {/* Traceability Card */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-2xl font-bold mb-2">Trace Your Funds</h3>
            <p className="text-gray-500 mb-6">Enter a Transaction Hash to visualize real-time tracking transparency.</p>
            <div className="flex gap-4 mb-6">
              <input 
                type="text" 
                value={inputHash}
                onChange={(e) => setInputHash(e.target.value)}
                placeholder="Enter txHash (0x...)" 
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg block w-full p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono" 
              />
              <button 
                onClick={handleTrace}
                disabled={isTracing}
                className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all"
              >
                {isTracing ? <Loader2 className="animate-spin" size={18} /> : <>Trace <ArrowRight size={16} /></>}
              </button>
            </div>

            {/* Live Visual Timeline Breakdown */}
            {traceResult && (
              <div className="border-t border-gray-100 pt-6 animate-fade-in">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">On-Chain Flow Audit</h4>
                
                <div className="space-y-6 relative before:absolute before:bottom-2 before:top-2 before:left-3.5 before:w-0.5 before:bg-gray-200">
                  
                  {/* Stage 1 */}
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="text-green-500 bg-white z-10 min-w-[28px]" size={28} />
                    <div>
                      <h5 className="font-semibold text-sm">Stage 1: Donor Liquidity Confirmed</h5>
                      <p className="text-xs text-gray-500 break-all font-mono">Source Account: {traceResult.sender}</p>
                      <p className="text-xs font-medium text-blue-600 mt-1">Value Dispatched: {traceResult.value} Sepolia ETH</p>
                    </div>
                  </div>

                  {/* Stage 2 */}
                  <div className="flex items-start gap-4">
                    {traceResult.isValidTreasuryTx ? (
                      <CheckCircle2 className="text-green-500 bg-white z-10 min-w-[28px]" size={28} />
                    ) : (
                      <Circle className="text-gray-300 bg-white z-10 min-w-[28px]" size={28} />
                    )}
                    <div>
                      <h5 className="font-semibold text-sm">Stage 2: DAO Treasury Vault Secured</h5>
                      <p className="text-xs text-gray-500 break-all font-mono">Deposited To: {traceResult.destination}</p>
                      {traceResult.isValidTreasuryTx ? (
                        <span className="inline-block mt-1 text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-md">Verified Cryptographic Custody</span>
                      ) : (
                        <span className="inline-block mt-1 text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-md">External Destination Address</span>
                      )}
                    </div>
                  </div>

                  {/* Stage 3 */}
                  <div className="flex items-start gap-4">
                    <Circle className="text-gray-300 bg-white z-10 min-w-[28px]" size={28} />
                    <div>
                      <h5 className="font-semibold text-sm text-gray-400">Stage 3: NGO Disbursement Mapping</h5>
                      <p className="text-xs text-gray-400">Awaiting community multi-sig voting confirmation to execute field release.</p>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}