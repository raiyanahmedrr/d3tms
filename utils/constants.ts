// d3tms-frontend/utils/constants.ts

// 1. Core On-Chain Smart Contract Deployments
export const TREASURY_ADDRESS = '0xFFDaa3D72A0373d92979E5a7445F92105f711165';
export const DISBURSEMENT_TRACKER_ADDRESS = '0x10D5a27A4cB9869a3aE9Bf2f3ed01160Ea294f64';
export const DONOR_NFT_ADDRESS = '0x88448797eb78ffd1efDc9DEA8655D8a03A3507B5';

// 2. Cryptographic Interface Binary Layout (Treasury Contract Structure)
export const TREASURY_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "_ngo", "type": "address" }],
    "name": "donate",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "donationCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "donations",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "address", "name": "donor", "type": "address" },
      { "internalType": "address", "name": "ngo", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "bytes32", "name": "parentHash", "type": "bytes32" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];