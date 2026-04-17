import { formatUnits, parseAbi, parseUnits } from "viem";
import type { PaymentAsset, PaymentQuote, PaymentTarget } from "@/lib/types";
import { getChainConfig } from "@/lib/web3-config";

export const erc20Abi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

export function quoteFromCzk(params: {
  priceCzk: number;
  asset: PaymentAsset;
  target: PaymentTarget;
}): PaymentQuote {
  const config = getChainConfig();
  const recipientAddress = process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS;

  if (!recipientAddress) {
    throw new Error("NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS is not configured.");
  }

  if (params.asset === "eth") {
    const czkPerEth = Number(process.env.PAYMENT_CZK_PER_ETH || process.env.NEXT_PUBLIC_PAYMENT_CZK_PER_ETH);
    if (!Number.isFinite(czkPerEth) || czkPerEth <= 0) {
      throw new Error("PAYMENT_CZK_PER_ETH is not configured.");
    }

    const amountEth = params.priceCzk / czkPerEth;
    const normalized = amountEth.toFixed(8);
    const atomic = parseUnits(normalized, 18).toString();

    return {
      asset: "eth",
      chainId: config.chainId,
      chainName: config.chainName,
      recipientAddress,
      tokenAddress: null,
      amountAtomic: atomic,
      amountDisplay: `${formatUnits(BigInt(atomic), 18)} ETH`,
      quotedPriceCzk: params.priceCzk,
      explorerTxBaseUrl: config.blockExplorerTxBaseUrl,
      target: params.target,
    };
  }

  const czkPerUsdc = Number(process.env.PAYMENT_CZK_PER_USDC || process.env.NEXT_PUBLIC_PAYMENT_CZK_PER_USDC);
  if (!Number.isFinite(czkPerUsdc) || czkPerUsdc <= 0) {
    throw new Error("PAYMENT_CZK_PER_USDC is not configured.");
  }
  if (!config.usdcAddress) {
    throw new Error("USDC address is not configured for the selected chain.");
  }

  const amountUsdc = params.priceCzk / czkPerUsdc;
  const normalized = amountUsdc.toFixed(6);
  const atomic = parseUnits(normalized, 6).toString();

  return {
    asset: "usdc",
    chainId: config.chainId,
    chainName: config.chainName,
    recipientAddress,
    tokenAddress: config.usdcAddress,
    amountAtomic: atomic,
    amountDisplay: `${formatUnits(BigInt(atomic), 6)} USDC`,
    quotedPriceCzk: params.priceCzk,
    explorerTxBaseUrl: config.blockExplorerTxBaseUrl,
    target: params.target,
  };
}

export function paymentExplorerUrl(txHash: string) {
  const config = getChainConfig();
  return config.blockExplorerTxBaseUrl ? `${config.blockExplorerTxBaseUrl}/${txHash}` : null;
}
