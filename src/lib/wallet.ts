export type WalletUnlockDraft = {
  status: "ready" | "missing_recipient" | "missing_quote";
  recipient: string | null;
  chainId: string | null;
  nativeAmountWei: string | null;
  nativeAmountLabel: string | null;
  eip681Uri: string | null;
  transactionRequest:
    | {
        to: string;
        value: string;
      }
    | null;
};

export function shortenWalletAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function createWalletUnlockDraft(priceCzk: number | null | undefined): WalletUnlockDraft {
  const recipient = process.env.NEXT_PUBLIC_UNLOCK_RECEIVER ?? null;
  const chainId = process.env.NEXT_PUBLIC_UNLOCK_CHAIN_ID ?? null;
  const weiPerCzk = process.env.NEXT_PUBLIC_UNLOCK_WEI_PER_CZK ?? null;

  if (!recipient) {
    return {
      status: "missing_recipient",
      recipient: null,
      chainId,
      nativeAmountWei: null,
      nativeAmountLabel: null,
      eip681Uri: null,
      transactionRequest: null,
    };
  }

  if (!priceCzk || !weiPerCzk) {
    return {
      status: "missing_quote",
      recipient,
      chainId,
      nativeAmountWei: null,
      nativeAmountLabel: null,
      eip681Uri: null,
      transactionRequest: null,
    };
  }

  let nativeAmountWei: string;

  try {
    nativeAmountWei = (BigInt(Math.round(priceCzk)) * BigInt(weiPerCzk)).toString();
  } catch {
    return {
      status: "missing_quote",
      recipient,
      chainId,
      nativeAmountWei: null,
      nativeAmountLabel: null,
      eip681Uri: null,
      transactionRequest: null,
    };
  }
  const valueHex = `0x${BigInt(nativeAmountWei).toString(16)}`;
  const nativeAmountLabel = formatWeiAsEth(nativeAmountWei);
  const chainSuffix = chainId ? `@${chainId}` : "";

  return {
    status: "ready",
    recipient,
    chainId,
    nativeAmountWei,
    nativeAmountLabel,
    eip681Uri: `ethereum:${recipient}${chainSuffix}?value=${nativeAmountWei}`,
    transactionRequest: {
      to: recipient,
      value: valueHex,
    },
  };
}

function formatWeiAsEth(value: string) {
  const whole = value.padStart(19, "0");
  const integer = whole.slice(0, -18).replace(/^0+/, "") || "0";
  const fraction = whole.slice(-18).replace(/0+$/, "");
  return fraction ? `${integer}.${fraction.slice(0, 6)} ETH` : `${integer} ETH`;
}
