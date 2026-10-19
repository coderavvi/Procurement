import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import contractArtifact from "../contracts/ETendering.json";
import { HARDHAT_ACCOUNTS } from "../utils/accounts";

const Web3Context = createContext();

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [contract, setContract] = useState(null);
  const [contractAddress, setContractAddress] = useState(contractArtifact.address || "");
  const [selectedHardhatIndex, setSelectedHardhatIndex] = useState(0);
  const [connectionMode, setConnectionMode] = useState("hardhat_wallet");
  const [isConnected, setIsConnected] = useState(false);
  const [tenders, setTenders] = useState([]);
  const [isAuthorizedOfficer, setIsAuthorizedOfficer] = useState(false);
  const [officerAgency, setOfficerAgency] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [blockchainTimestamp, setBlockchainTimestamp] = useState(Math.floor(Date.now() / 1000));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Web3 Connection
  const initWeb3 = useCallback(async (mode = connectionMode, hhIndex = selectedHardhatIndex) => {
    setLoading(true);
    setError(null);
    try {
      let activeProvider;
      let activeSigner;
      let activeAccount;

      if (mode === "metamask") {
        if (!window.ethereum) {
          throw new Error("MetaMask extension is not detected in your browser. Please install MetaMask or select one of the authorized simulated identities.");
        }
        activeProvider = new ethers.BrowserProvider(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        activeSigner = await activeProvider.getSigner();
        activeAccount = await activeSigner.getAddress();
      } else {
        activeProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const accountConfig = HARDHAT_ACCOUNTS[hhIndex] || HARDHAT_ACCOUNTS[0];
        activeSigner = new ethers.Wallet(accountConfig.privateKey, activeProvider);
        activeAccount = accountConfig.address;
      }

      setProvider(activeProvider);
      setSigner(activeSigner);
      setAccount(activeAccount);
      setConnectionMode(mode);
      setSelectedHardhatIndex(hhIndex);

      // Fetch latest block timestamp
      try {
        const directProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const block = await directProvider.getBlock("latest");
        if (block) {
          setBlockchainTimestamp(block.timestamp);
        }
      } catch (blockErr) {
        console.warn("Could not fetch block timestamp:", blockErr);
      }

      // Fetch balance
      const bal = await activeProvider.getBalance(activeAccount);
      setBalance(ethers.formatEther(bal));

      let isAuth = false;
      let agency = "";
      let isContractAdmin = false;

      // Connect Contract
      if (contractArtifact.address && contractArtifact.abi) {
        const contractInstance = new ethers.Contract(
          contractArtifact.address,
          contractArtifact.abi,
          activeSigner
        );
        setContract(contractInstance);
        setContractAddress(contractArtifact.address);

        // Fetch officer accreditation and admin status
        try {
          isAuth = await contractInstance.isAuthorizedOfficer(activeAccount);
          setIsAuthorizedOfficer(isAuth);
          if (isAuth) {
            agency = await contractInstance.officerAgency(activeAccount);
            setOfficerAgency(agency);
          } else {
            setOfficerAgency("");
          }

          const contractAdmin = await contractInstance.admin();
          isContractAdmin = contractAdmin.toLowerCase() === activeAccount.toLowerCase();
          setIsAdmin(isContractAdmin);
        } catch (authErr) {
          console.warn("Could not fetch RBAC status:", authErr);
        }
      }

      setIsConnected(true);
      sessionStorage.setItem("etendering_wallet_connected", JSON.stringify({ mode, hhIndex }));

      return {
        success: true,
        account: activeAccount,
        isOfficer: isAuth,
        agency,
        isAdmin: isContractAdmin,
        mode,
        hhIndex,
      };
    } catch (err) {
      console.error("Web3 init error:", err);
      const errMsg = err.message || "Failed to connect to local Hardhat node at http://127.0.0.1:8545. Make sure 'npx hardhat node' is running.";
      setError(errMsg);
      setIsConnected(false);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, [connectionMode, selectedHardhatIndex]);

  // Load all tenders from the smart contract
  const fetchTenders = useCallback(async () => {
    if (!contract) return;
    try {
      // Sync blockchain block timestamp
      try {
        const directProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const latestBlock = await directProvider.getBlock("latest");
        if (latestBlock) {
          setBlockchainTimestamp(latestBlock.timestamp);
        }
      } catch (bErr) {
        // silent fallback
      }

      const count = await contract.tenderCount();
      const loaded = [];

      for (let i = 1; i <= Number(count); i++) {
        const t = await contract.getTender(i);
        const registeredBidders = await contract.getRegisteredBidders(i);
        const submittedBidders = await contract.getSubmittedBidders(i);

        let criteria = [];
        try {
          const rawCriteria = await contract.getTenderCriteria(i);
          criteria = rawCriteria.map((c) => ({
            name: c.name,
            minimumRequirement: c.minimumRequirement,
            requiresUpload: c.requiresUpload,
          }));
        } catch (critErr) {
          console.warn(`Could not fetch criteria for tender ${i}:`, critErr);
        }

        const bidderDetails = [];
        for (const bAddr of registeredBidders) {
          const bInfo = await contract.getBidder(i, bAddr);
          bidderDetails.push({
            address: bAddr,
            registered: bInfo.registered,
            prequalified: bInfo.prequalified,
            hasSubmitted: bInfo.hasSubmitted,
            withdrawn: bInfo.withdrawn,
            docHash: bInfo.docHash,
            submissionTimestamp: Number(bInfo.submissionTimestamp),
            technicalScore: Number(bInfo.technicalScore),
            financialScore: Number(bInfo.financialScore),
            totalScore: Number(bInfo.totalScore),
            evaluated: bInfo.evaluated,
          });
        }

        let hasPurchased = false;
        if (account) {
          try {
            hasPurchased = await contract.hasBidderPurchasedTender(i, account);
          } catch (pErr) {
            hasPurchased = false;
          }
        }

        let tenderBalance = "0";
        try {
          const bal = await contract.tenderBalances(i);
          tenderBalance = ethers.formatEther(bal);
        } catch (bErr) {
          tenderBalance = "0";
        }

        loaded.push({
          id: Number(t.id),
          title: t.title,
          description: t.description || "",
          deadline: Number(t.deadline),
          state: Number(t.state),
          weightTechnical: Number(t.weightTechnical),
          weightFinancial: Number(t.weightFinancial),
          officer: t.officer,
          winner: t.winner,
          winningScore: Number(t.winningScore),
          finalDocHash: t.finalDocHash,
          openedTimestamp: Number(t.openedTimestamp),
          archivedTimestamp: Number(t.archivedTimestamp),
          prequalificationSkipped: Boolean(t.prequalificationSkipped),
          specDocHash: t.specDocHash || "0x0000000000000000000000000000000000000000000000000000000000000000",
          tenderFee: t.tenderFee ? ethers.formatEther(t.tenderFee) : "0",
          tenderFeeWei: t.tenderFee ? t.tenderFee.toString() : "0",
          tenderBalance,
          hasPurchased,
          criteria,
          registeredBidders,
          submittedBidders,
          bidders: bidderDetails,
        });
      }

      loaded.sort((a, b) => b.id - a.id);
      setTenders(loaded);

      // Refresh RBAC info
      if (account) {
        const isAuth = await contract.isAuthorizedOfficer(account);
        setIsAuthorizedOfficer(isAuth);
        if (isAuth) {
          const agency = await contract.officerAgency(account);
          setOfficerAgency(agency);
        } else {
          setOfficerAgency("");
        }
      }
    } catch (err) {
      console.error("Error fetching tenders from contract:", err);
    }
  }, [contract, account]);

  // Fast-Forward Hardhat Blockchain Time
  const fastForwardTime = async (secondsOrDeadline = 7200) => {
    try {
      const directProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const block = await directProvider.getBlock("latest");
      const currentBlockTime = block ? block.timestamp : Math.floor(Date.now() / 1000);

      let secondsToAdvance = 7200;
      if (typeof secondsOrDeadline === "number" && secondsOrDeadline > 1000000000) {
        // It's a deadline timestamp (in seconds): calculate exact jump past deadline
        if (secondsOrDeadline >= currentBlockTime) {
          secondsToAdvance = (secondsOrDeadline - currentBlockTime) + 120; // 2 minutes past deadline
        } else {
          secondsToAdvance = 120; // Already passed deadline, advance small increment
        }
      } else if (typeof secondsOrDeadline === "number") {
        secondsToAdvance = Math.max(secondsOrDeadline, 120);
      }

      await directProvider.send("evm_increaseTime", [Number(secondsToAdvance)]);
      await directProvider.send("evm_mine", []);

      const newBlock = await directProvider.getBlock("latest");
      if (newBlock) {
        setBlockchainTimestamp(newBlock.timestamp);
      }

      await fetchTenders();
      return true;
    } catch (err) {
      console.error("Time travel error:", err);
      return false;
    }
  };

  // Connect / Switch Hardhat Account
  const connectHardhatAccount = useCallback(async (index) => {
    return initWeb3("hardhat_wallet", index);
  }, [initWeb3]);

  const switchAccount = useCallback(async (index) => {
    return initWeb3("hardhat_wallet", index);
  }, [initWeb3]);

  // Connect to MetaMask
  const connectMetaMask = useCallback(async () => {
    return initWeb3("metamask");
  }, [initWeb3]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    sessionStorage.removeItem("etendering_wallet_connected");
    setIsConnected(false);
    setAccount("");
    setSigner(null);
    setContract(null);
    setBalance("0");
    setIsAuthorizedOfficer(false);
    setIsAdmin(false);
    setOfficerAgency("");
    setError(null);
  }, []);

  // Check saved session on mount; if none, remain disconnected for the login gate
  useEffect(() => {
    const saved = sessionStorage.getItem("etendering_wallet_connected");
    if (saved) {
      try {
        const { mode, hhIndex } = JSON.parse(saved);
        initWeb3(mode, hhIndex);
      } catch (e) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [initWeb3]);

  // Listen for MetaMask account/network changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (connectionMode === "metamask" && isConnected) {
          if (!accounts || accounts.length === 0) {
            disconnectWallet();
          } else {
            initWeb3("metamask");
          }
        }
      };

      const handleChainChanged = () => {
        if (connectionMode === "metamask" && isConnected) {
          window.location.reload();
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [connectionMode, isConnected, disconnectWallet, initWeb3]);

  useEffect(() => {
    if (contract) {
      fetchTenders();
      const interval = setInterval(fetchTenders, 3500);
      return () => clearInterval(interval);
    }
  }, [contract, fetchTenders]);

  const isOfficerOfTender = (tender) => {
    if (!account || !tender) return false;
    return tender.officer.toLowerCase() === account.toLowerCase();
  };

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        account,
        balance,
        contract,
        contractAddress,
        connectionMode,
        selectedHardhatIndex,
        isConnected,
        connectHardhatAccount,
        switchAccount,
        connectMetaMask,
        disconnectWallet,
        tenders,
        refreshTenders: fetchTenders,
        isOfficerOfTender,
        isAuthorizedOfficer,
        officerAgency,
        isAdmin,
        blockchainTimestamp,
        fastForwardTime,
        loading,
        error,
        hardhatAccounts: HARDHAT_ACCOUNTS,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}
