// Default Hardhat local test accounts & private keys for rapid PhD MVP testing & role switching
export const HARDHAT_ACCOUNTS = [
  {
    index: 0,
    name: "Procurement Officer / Admin",
    role: "Officer",
    agency: "Ministry of Finance & Procurement Authority",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    privileges: [
      "Advertise public tenders & set statutory criteria",
      "Configure tender dossier procurement fees",
      "Review & adjudicate contractor prequalifications",
      "Open sealed bids post-deadline & execute scoring",
      "Award winning contract & seal immutable archive"
    ]
  },
  {
    index: 1,
    name: "Bidder 1: Alpha Engineering Ltd",
    role: "Bidder",
    agency: "Commercial Contractor (Civil & Infrastructure)",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    privileges: [
      "Purchase tender dossiers & verify specification hash",
      "Submit statutory prequalification credentials",
      "Deterministic client-side Keccak-256 bid hashing",
      "Submit sealed proposal to blockchain",
      "Bid withdrawal & substitution before deadline"
    ]
  },
  {
    index: 2,
    name: "Bidder 2: Beta Solutions Corp",
    role: "Bidder",
    agency: "Commercial Contractor (Smart Grid Systems)",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb2f95402bbf840c87c24a3059489508fe40f46",
    privileges: [
      "Purchase tender dossiers & verify specification hash",
      "Submit statutory prequalification credentials",
      "Deterministic client-side Keccak-256 bid hashing",
      "Submit sealed proposal to blockchain",
      "Bid withdrawal & substitution before deadline"
    ]
  },
  {
    index: 3,
    name: "Bidder 3: Gamma Infrastructure",
    role: "Bidder",
    agency: "Commercial Contractor (Renewable Energy)",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    privileges: [
      "Purchase tender dossiers & verify specification hash",
      "Submit statutory prequalification credentials",
      "Deterministic client-side Keccak-256 bid hashing",
      "Submit sealed proposal to blockchain",
      "Bid withdrawal & substitution before deadline"
    ]
  },
  {
    index: 4,
    name: "Officer 2: Dept of Transportation",
    role: "Officer",
    agency: "Department of Transportation",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey: "0x47e179ec197488593b100287e90321229dd377601aa2f082615a3857b411a7b0",
    privileges: [
      "Advertise transit tenders & set criteria",
      "Adjudicate transportation contractor credentials",
      "Open transit bids & enter evaluation scores",
      "Execute on-chain transit contract awards"
    ]
  },
];
