"use client";

import { encodeFunctionData, getAddress } from "viem";
import type { PaymentQuote, WalletConnection } from "@/lib/types";
import { erc20Abi } from "@/lib/payments";
import { getChainConfig } from "@/lib/web3-config";

function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet was detected.");
  }

  return window.ethereum;
}

export async function requestWalletConnection(): Promise<WalletConnection> {
  const provider = getProvider();
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  const chainId = (await provider.request({
    method: "eth_chainId",
  })) as string;

  const address = getAddress(accounts[0]);
  const isRabby = provider.isRabby;
  const isMetaMask = provider.isMetaMask;

  return {
    address,
    chainId,
    provider: isRabby ? "rabby" : isMetaMask ? "metamask" : "injected",
    connectedAt: new Date().toISOString(),
  };
}

export async function switchWalletToConfiguredChain() {
  const provider = getProvider();
  const config = getChainConfig();

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: config.chainHex }],
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? Number(error.code) : null;
    if (code !== 4902) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: config.chainHex,
          chainName: config.chainName,
          nativeCurrency: config.nativeCurrency,
          rpcUrls: config.rpcUrls,
          blockExplorerUrls: config.blockExplorerUrl ? [config.blockExplorerUrl] : undefined,
        },
      ],
    });
  }
}

export async function signWalletMessage(message: string, address: string) {
  const provider = getProvider();
  const checksumAddress = getAddress(address);
  return (await provider.request({
    method: "personal_sign",
    params: [message, checksumAddress],
  })) as string;
}

export async function sendQuotedPayment(quote: PaymentQuote, address: string) {
  const provider = getProvider();
  const from = getAddress(address);

  if (quote.asset === "eth") {
    return (await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to: quote.recipientAddress,
          value: `0x${BigInt(quote.amountAtomic).toString(16)}`,
        },
      ],
    })) as string;
  }

  if (!quote.tokenAddress) {
    throw new Error("USDC quote is missing token address.");
  }

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [getAddress(quote.recipientAddress), BigInt(quote.amountAtomic)],
  });

  return (await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        to: quote.tokenAddress,
        data,
        value: "0x0",
      },
    ],
  })) as string;
}
