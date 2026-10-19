const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("----------------------------------------------------");
  console.log("Deploying ETendering Smart Contract to Localhost...");
  console.log("----------------------------------------------------");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer Account (Officer #0): ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account Balance: ${ethers.formatEther(balance)} ETH`);

  const ETenderingFactory = await ethers.getContractFactory("ETendering");
  const etendering = await ETenderingFactory.deploy();
  await etendering.waitForDeployment();

  const contractAddress = await etendering.getAddress();
  console.log(`\n>>> ETendering Contract Deployed to: ${contractAddress}\n`);

  // Extract ABI from Hardhat artifact
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/ETendering.sol/ETendering.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const contractData = {
    address: contractAddress,
    abi: artifact.abi,
    deployedAt: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
  };

  // Ensure directories exist
  const clientContractsDir = path.join(__dirname, "../client/src/contracts");
  if (!fs.existsSync(clientContractsDir)) {
    fs.mkdirSync(clientContractsDir, { recursive: true });
  }

  const serverDir = path.join(__dirname, "../server");
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
  }

  // Write contract info
  fs.writeFileSync(
    path.join(clientContractsDir, "ETendering.json"),
    JSON.stringify(contractData, null, 2)
  );
  fs.writeFileSync(
    path.join(serverDir, "contractInfo.json"),
    JSON.stringify(contractData, null, 2)
  );
  fs.writeFileSync(
    path.join(__dirname, "deployedAddress.json"),
    JSON.stringify({ address: contractAddress }, null, 2)
  );

  console.log("Contract ABI and address saved to:");
  console.log(" - client/src/contracts/ETendering.json");
  console.log(" - server/contractInfo.json");
  console.log(" - scripts/deployedAddress.json");
  console.log("----------------------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
