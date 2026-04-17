import { base, baseSepolia, mainnet, sepolia, type Chain } from "viem/chains";

type ChainConfig = {
  chain: Chain;
  usdcAddress: string | null;
};

const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    chain: mainnet,
    usdcAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  },
  8453: {
    chain: base,
    usdcAddress: "0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913".toLowerCase(),
  },
  11155111: {
    chain: sepolia,
    usdcAddress: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
  },
  84532: {
    chain: baseSepolia,
    usdcAddress: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
  },
};

export function getConfiguredChainId() {
  return Number(process.env.NEXT_PUBLIC_WALLET_CHAIN_ID || process.env.WALLET_CHAIN_ID || 84532);
}

export function getChainConfig(chainId = getConfiguredChainId()) {
  const config = SUPPORTED_CHAINS[chainId] ?? SUPPORTED_CHAINS[84532];
  const publicRpc = process.env.NEXT_PUBLIC_WALLET_RPC_URL;
  const privateRpc = process.env.WALLET_RPC_URL;
  const explorerBaseUrl =
    process.env.NEXT_PUBLIC_BLOCK_EXPLORER_TX_BASE_URL ??
    config.chain.blockExplorers?.default.url ??
    null;

  return {
    chainId: config.chain.id,
    chainName: config.chain.name,
    chain: config.chain,
    chainHex: `0x${config.chain.id.toString(16)}`,
    nativeCurrency: config.chain.nativeCurrency,
    rpcUrls:
      publicRpc || privateRpc
        ? [publicRpc || privateRpc || ""]
        : config.chain.rpcUrls.default.http,
    rpcUrl: privateRpc || publicRpc || config.chain.rpcUrls.default.http[0] || null,
    blockExplorerUrl: config.chain.blockExplorers?.default.url ?? null,
    blockExplorerTxBaseUrl: explorerBaseUrl
      ? `${explorerBaseUrl.replace(/\/$/, "")}/tx`
      : null,
    usdcAddress:
      process.env.NEXT_PUBLIC_USDC_ADDRESS?.toLowerCase() ||
      process.env.USDC_ADDRESS?.toLowerCase() ||
      config.usdcAddress,
  };
}

export function walletPaymentsEnabled() {
  const config = getChainConfig();
  return Boolean(process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS && config.rpcUrl);
}

export function walletAuthEnabled() {
  return Boolean(process.env.DATABASE_URL);
}
