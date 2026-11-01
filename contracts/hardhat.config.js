import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

/** @type {import("hardhat/config").HardhatUserConfig} */
export default {
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  // KCP 네트워크 정보(RPC·chainId)는 전달받은 뒤 추가한다. 키는 .env로만 주입.
};
