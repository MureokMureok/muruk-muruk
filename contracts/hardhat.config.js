import { existsSync } from "node:fs";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable } from "hardhat/config";

// .env가 있으면 읽는다. 없어도 로컬 테스트는 그대로 동작한다.
if (existsSync(".env")) process.loadEnvFile(".env");

/** @type {import("hardhat/config").HardhatUserConfig} */
export default {
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // NHN KCP 테스트넷 (Avalanche L1 monthlygol). 값은 .env에서만 읽는다.
    kcp: {
      type: "http",
      chainType: "l1",
      chainId: 56357,
      url: configVariable("RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
};
