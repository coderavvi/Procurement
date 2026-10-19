# 🔐 Environment Variables & Quickstart Guide

This document explains the environment configuration, security practices for sensitive variables, and how to start and operate the **Blockchain-Enabled E-Tendering System** on any new environment or fresh clone.

---

## 1. 🛡️ Security Policy: Why `.env` is Not Pushed to GitHub

Environment files (`.env`, `.env.local`, `*.env`) contain sensitive application secrets and credentials. In blockchain projects, committing these files can lead to catastrophic security breaches, including:

* **Compromised Private Keys**: Private keys controlling crypto accounts with administrative or funds withdrawal permissions.
* **Leaked API Keys**: Alchemy, Infura, QuickNode, or Etherscan API tokens resulting in rate limiting or unauthorized billing.
* **Database & Internal Secrets**: Internal service endpoints and credentials.

For these reasons:
* `.env` and all related environment files are strictly included in [`.gitignore`](file:///C:/Users/coderavvi/Desktop/Procurement/.gitignore).
* Template files ([`.env.example`](file:///C:/Users/coderavvi/Desktop/Procurement/.env.example), [`server/.env.example`](file:///C:/Users/coderavvi/Desktop/Procurement/server/.env.example), and [`client/.env.example`](file:///C:/Users/coderavvi/Desktop/Procurement/client/.env.example)) are tracked in Git to document the required variable names and safe defaults.

---

## 2. 📋 Environment Variables Reference

### A. Root / Hardhat Network ([`.env.example`](file:///C:/Users/coderavvi/Desktop/Procurement/.env.example))

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Runtime environment (`development` or `production`). |
| `HARDHAT_NETWORK` | `localhost` | Network name targeted by deployment and seed scripts. |
| `HARDHAT_RPC_URL` | `http://127.0.0.1:8545` | Local JSON-RPC endpoint exposed by Hardhat node. |
| `HARDHAT_CHAIN_ID` | `31337` | Local Hardhat chain ID. |
| `STORAGE_SERVER_PORT` | `3001` | Port for the mock off-chain storage server. |
| `STORAGE_SERVER_URL` | `http://localhost:3001` | Base URL for document storage and file uploads. |
| `CLIENT_PORT` | `5173` | Port for the Vite + React frontend. |
| `CLIENT_URL` | `http://localhost:5173` | Base URL where the frontend is accessed. |

#### Optional Public Testnet Variables (e.g. Sepolia / Holesky)
| Variable | Example Value | Description |
| :--- | :--- | :--- |
| `SEPOLIA_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/...` | RPC provider URL (Alchemy / Infura). |
| `PRIVATE_KEY` | `0xabcdef...` | Deployer account private key (32 bytes hex). |
| `ETHERSCAN_API_KEY` | `ABC123XYZ...` | Etherscan API key for contract verification. |

### B. Storage Server ([`server/.env.example`](file:///C:/Users/coderavvi/Desktop/Procurement/server/.env.example))

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | Port on which the Express storage server listens. |
| `NODE_ENV` | `development` | Server runtime environment. |

### C. Client Frontend ([`client/.env.example`](file:///C:/Users/coderavvi/Desktop/Procurement/client/.env.example))

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_STORAGE_SERVER_URL` | `http://localhost:3001` | URL of the storage server for file uploads/downloads. |
| `VITE_HARDHAT_RPC_URL` | `http://127.0.0.1:8545` | Local blockchain RPC URL accessed by the browser. |

---

## 3. ⚙️ How to Load Environment Variables

### Option 1: Local Development (Zero-Config / Out-of-the-Box)
For local development, **no `.env` file is needed**. All components (Hardhat node, storage server, client UI) have sensible fallback defaults configured to run on localhost immediately.

### Option 2: Custom Local Setup
If you need to change ports or customize URLs:

**In PowerShell (Windows):**
```powershell
# Copy root environment template
Copy-Item .env.example .env

# Optional: Copy server and client templates
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

**In Command Prompt (cmd.exe):**
```cmd
copy .env.example .env
copy server\.env.example server\.env
copy client\.env.example client\.env
```

**In Bash (macOS / Linux):**
```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
```

After copying, open `.env` in any text editor and adjust values as needed.

---

## 4. 🚀 Starting the Project on a Fresh Clone

### Prerequisites
1. **Node.js**: v18.0.0 or higher (v20+ recommended)
2. **NPM**: v9.0.0 or higher

---

### Method 1: Automated 1-Click Startup (Recommended)

A unified single startup script is provided that automates the entire sequence:
1. Validates Node.js and NPM installations.
2. Automatically installs all missing dependencies for root, server, and client.
3. Compiles Solidity smart contracts via Hardhat.
4. Starts the local Hardhat blockchain node (`http://127.0.0.1:8545`).
5. Waits for the RPC node to become responsive.
6. Automatically deploys and seeds sample tenders, writing contract ABI & address to client and server.
7. Launches the mock off-chain storage server (`http://localhost:3001`).
8. Launches the Vite React frontend (`http://localhost:5173`).
9. Opens your default web browser to `http://localhost:5173`.

#### To Run:
* **Option A (Double-Click)**: Simply double-click [`start.bat`](file:///C:/Users/coderavvi/Desktop/Procurement/start.bat) from Windows File Explorer.
* **Option B (PowerShell)**:
  ```powershell
  .\start.ps1
  ```
* **Option C (NPM)**:
  ```bash
  npm start
  ```

---

### Method 2: Manual Multi-Terminal Startup

If you prefer running services in separate terminal tabs:

#### Terminal 1: Hardhat Blockchain Node
```bash
# Install root dependencies if needed
npm install

# Start local Hardhat blockchain (20 pre-funded test accounts)
npx hardhat node
```
*RPC endpoint: `http://127.0.0.1:8545` (Chain ID: 31337)*

#### Terminal 2: Deploy Contracts & Start Storage Server
```bash
# Deploy contract and seed sample tenders with bidders
npx hardhat run scripts/seed.js --network localhost

# Install server dependencies and start server
cd server
npm install
npm start
```
*Storage server runs at `http://localhost:3001`*

#### Terminal 3: Start Frontend Client
```bash
# Install frontend dependencies and start Vite dev server
cd client
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`*

---

## 5. 👥 Test Accounts & Roles

The frontend features a **built-in 1-Click Role Switcher** in the top navigation bar. You do not need to install or configure MetaMask to test the full lifecycle:

| Role | Account Name | Address | Private Key (Hardhat Default #0-#3) |
| :--- | :--- | :--- | :--- |
| **Procurement Officer** | Officer #0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Bidder 1** | Alpha Engineering Ltd | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Bidder 2** | Beta Construction Corp | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| **Bidder 3** | Gamma Systems Ltd | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |

---

## 6. 🧪 Running Tests

To run the complete automated test suite (78 tests verifying all 7 stages, RBAC, criteria, sealed bid hashes, and scoring):

```bash
npx hardhat test
```

---

## 7. ❓ Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Port 8545 already in use` | Another Hardhat node or process is running on port 8545. | Run `Get-Process -Id (Get-NetTCPConnection -LocalPort 8545).OwningProcess \| Stop-Process -Force` in PowerShell. |
| `Port 3001 already in use` | Existing Express server process running. | Run `Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess \| Stop-Process -Force`. |
| `Port 5173 already in use` | Existing Vite frontend running. | Vite will automatically offer port 5174 or close the previous terminal. |
| Contract not found in UI | Seed script was not executed after starting Hardhat node. | Run `npx hardhat run scripts/seed.js --network localhost`. |
| MetaMask nonce error | Local Hardhat node was restarted while MetaMask retains previous transaction count. | In MetaMask: Settings ➔ Advanced ➔ **Clear activity and nonce data**. |
