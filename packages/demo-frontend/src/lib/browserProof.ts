/**
 * Browser-side Proof builder using Web Crypto API.
 *
 * Generates an ephemeral P-256 keypair on first use, signs the canonicalized
 * unsigned proof per the Proof Standard (Requirement 10), and produces a
 * Proof v1 object accepted by Layer 1 of the Verification Pipeline.
 *
 * NOTE: A real Worker_Client must use the device's hardware secure element
 * (Android Keystore / iOS Secure Enclave). The browser-generated key here is
 * a demo shortcut: it satisfies the cryptographic shape of Proof v1 and runs
 * the same verification path, but does not provide hardware tamper-resistance.
 * Real attestation hookup is task 9.3 [P1].
 */

import {hashUnsignedProof, type ProofV1, type UnsignedProofV1} from "@questlens/schemas";

interface CachedKeypair {
  privateKey: CryptoKey;
  publicKeyHex: `0x${string}`;
}

let cachedKeypair: CachedKeypair | null = null;

export async function getOrCreateDeviceKeypair(): Promise<CachedKeypair> {
  if (cachedKeypair) return cachedKeypair;

  const keyPair = await crypto.subtle.generateKey(
    {name: "ECDSA", namedCurve: "P-256"},
    true,
    ["sign", "verify"],
  );
  // Export as JWK to assemble SEC1 uncompressed point.
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  if (!jwk.x || !jwk.y) {
    throw new Error("Failed to export P-256 public key (missing x/y)");
  }
  const x = base64UrlToBytes(jwk.x);
  const y = base64UrlToBytes(jwk.y);
  if (x.length !== 32 || y.length !== 32) {
    throw new Error(`Unexpected coord lengths: x=${x.length} y=${y.length}`);
  }
  const sec1 = new Uint8Array(65);
  sec1[0] = 0x04;
  sec1.set(x, 1);
  sec1.set(y, 33);
  const publicKeyHex = ("0x" + bytesToHex(sec1)) as `0x${string}`;

  cachedKeypair = {privateKey: keyPair.privateKey, publicKeyHex};
  return cachedKeypair;
}

/**
 * Hash a Blob (the captured image) with SHA-256 and return the 0x-prefixed hex digest.
 */
export async function sha256OfBlob(blob: Blob): Promise<`0x${string}`> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return ("0x" + bytesToHex(new Uint8Array(digest))) as `0x${string}`;
}

export interface BuildProofOptions {
  taskId: bigint;
  imageBlob: Blob;
  capturedLatitude: number;
  capturedLongitude: number;
  /** Override Date.now() for deterministic demo runs. */
  capturedTimestamp?: number;
  /** Defaults to "DEMO_OK_DEVICE" so Layer 1's stub passes. */
  platformAttestation?: string;
}

export async function buildBrowserProof(opts: BuildProofOptions): Promise<{
  proof: ProofV1;
  imageBytes: Uint8Array;
}> {
  const {privateKey, publicKeyHex} = await getOrCreateDeviceKeypair();
  const imageBytesBuf = await opts.imageBlob.arrayBuffer();
  const imageBytes = new Uint8Array(imageBytesBuf);
  const imageHash = await sha256OfBlob(opts.imageBlob);

  const unsigned: UnsignedProofV1 = {
    schemaVersion: "1.0",
    taskId: opts.taskId.toString(),
    imageHash,
    capturedLatitude: opts.capturedLatitude,
    capturedLongitude: opts.capturedLongitude,
    capturedTimestamp: opts.capturedTimestamp ?? Date.now(),
    platformAttestation: opts.platformAttestation ?? "DEMO_OK_DEVICE",
    hardwareAttestationType: "android-keystore",
  };

  const {canonical} = hashUnsignedProof(unsigned);
  const canonicalBytes = new TextEncoder().encode(canonical);
  const rawSig = await crypto.subtle.sign(
    {name: "ECDSA", hash: "SHA-256"},
    privateKey,
    canonicalBytes,
  );
  // Web Crypto returns IEEE-P1363 (r || s) for ECDSA. We need DER for
  // Node's verifier. Convert here so the on-chain Relayer can reuse the
  // exact same Layer 1 path it has unit tests for.
  const der = ieeeP1363ToDer(new Uint8Array(rawSig));
  const signatureHex = ("0x" + bytesToHex(der)) as `0x${string}`;

  const proof: ProofV1 = {
    ...unsigned,
    hardwareSignature: signatureHex,
    publicKey: publicKeyHex,
  };
  return {proof, imageBytes};
}

/* ----------------- byte helpers ----------------- */

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64url.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Convert IEEE-P1363 (fixed-width r || s) to DER-encoded ECDSA signature.
 * P-256 uses 32-byte r and s.
 */
function ieeeP1363ToDer(p1363: Uint8Array): Uint8Array {
  if (p1363.length !== 64) {
    throw new Error(`Expected 64-byte P-256 signature, got ${p1363.length}`);
  }
  const r = trimLeadingZeros(p1363.slice(0, 32));
  const s = trimLeadingZeros(p1363.slice(32, 64));
  const rBytes = ensurePositive(r);
  const sBytes = ensurePositive(s);

  const seqLen = 2 + rBytes.length + 2 + sBytes.length;
  const out = new Uint8Array(2 + seqLen);
  let i = 0;
  out[i++] = 0x30;
  out[i++] = seqLen;
  out[i++] = 0x02;
  out[i++] = rBytes.length;
  out.set(rBytes, i);
  i += rBytes.length;
  out[i++] = 0x02;
  out[i++] = sBytes.length;
  out.set(sBytes, i);
  return out;
}

function trimLeadingZeros(b: Uint8Array): Uint8Array {
  let start = 0;
  while (start < b.length - 1 && b[start] === 0) start++;
  return b.slice(start);
}

/** ASN.1 DER INTEGER must be unsigned: prepend 0x00 when high bit is set. */
function ensurePositive(b: Uint8Array): Uint8Array {
  if ((b[0] ?? 0) & 0x80) {
    const out = new Uint8Array(b.length + 1);
    out[0] = 0;
    out.set(b, 1);
    return out;
  }
  return b;
}
