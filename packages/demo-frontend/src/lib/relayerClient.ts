/**
 * Thin client over the Relayer ingest endpoint.
 *
 * Sends a Proof + DataRequirement + base64(image) and returns the verdict
 * + on-chain action (submitProof, slashWorker, or noop).
 */

import type {DataRequirementV1, ProofV1} from "@questlens/schemas";

export interface RelayerVerdict {
  ok: boolean;
  layer: 1 | 2 | 3;
  reason: string;
  slashable?: boolean;
  details?: Record<string, unknown>;
}

export interface RelayerResponse {
  verdict: RelayerVerdict;
  layersRun: Array<1 | 2 | 3>;
  txHash?: string;
  action: "submitProof" | "slashWorker" | "noop";
  message?: string;
}

export async function submitToRelayer(
  relayerUrl: string,
  proof: ProofV1,
  dataRequirement: DataRequirementV1,
  imageBytes: Uint8Array,
): Promise<RelayerResponse> {
  const imageBase64 = bytesToBase64(imageBytes);
  const res = await fetch(`${relayerUrl}/ingest`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({proof, dataRequirement, imageBase64}),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Relayer returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const err = parsed as {error?: string; detail?: string};
    throw new Error(
      `Relayer rejected (${res.status}): ${err.error ?? "unknown"}${err.detail ? ` - ${err.detail}` : ""}`,
    );
  }
  return parsed as RelayerResponse;
}

function bytesToBase64(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}
