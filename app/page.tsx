'use client';

import Link from 'next/link';
import { HeartHandshake, Building2, Smartphone, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 font-sans">
      
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <ShieldCheck className="text-blue-600" size={64} />
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Welcome to D3TMS
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Decentralized Disaster Donation Tracking and Management System. 
          Please select your role to enter the portal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        
        <Link href="/donor">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-500 transition-all cursor-pointer group flex flex-col items-center text-center">
            <div className="bg-blue-50 p-4 rounded-full mb-6 group-hover:scale-110 transition-transform">
              <HeartHandshake className="text-blue-600" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Donor Portal</h2>
            <p className="text-gray-500">Make donations, trace your funds, and participate in DAO governance.</p>
          </div>
        </Link>

        <Link href="/ngo">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:emerald-500 transition-all cursor-pointer group flex flex-col items-center text-center">
            <div className="bg-emerald-50 p-4 rounded-full mb-6 group-hover:scale-110 transition-transform">
              <Building2 className="text-emerald-600" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">NGO Admin</h2>
            <p className="text-gray-500">Submit aid proposals, manage funds, and assign budgets to field workers.</p>
          </div>
        </Link>

        <Link href="/field-worker">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:orange-500 transition-all cursor-pointer group flex flex-col items-center text-center">
            <div className="bg-orange-50 p-4 rounded-full mb-6 group-hover:scale-110 transition-transform">
              <Smartphone className="text-orange-600" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Field Worker</h2>
            <p className="text-gray-500">Scan beneficiary QR codes and sync offline delivery proofs to the blockchain.</p>
          </div>
        </Link>

      </div>
    </div>
  );
}