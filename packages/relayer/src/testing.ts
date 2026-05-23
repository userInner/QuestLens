/**
 * Test helpers exported from the relayer package.
 *
 * `buildSignedProofForTest` produces a fully-signed Proof v1 object for an
 * arbitrary unsigned payload, using a generated P-256 keypair. This is what
 * Worker_Client unit tests and Demo Day rehearsals use to exercise Layer 1
 * without needing a real Android Keystore / iOS Secure Enclave.
 *
 * Production Worker_Clients (Telegram Mini App, DePIN hardware) MUST sign
 * via the device's hardware secure element. This helper is for tests only.
 */

import {createPublicKey, createSign, generateKeyPairSync, type KeyObject} from "node:crypto";

import {hashUnsignedProof, type ProofV1, type UnsignedProofV1} from "@questlens/schemas";

export interface SignedProofBundle {
  proof: ProofV1;
  /** The keypair used; tests can re-use the public key for repeated proofs. */
  privateKey: KeyObject;
  publicKeyHex: `0x${string}`;
}

export function buildSignedProofForTest(
  unsigned: UnsignedProofV1,
  reusePrivateKey?: KeyObject,
): SignedProofBundle {
  const keypair = reusePrivateKey
    ? {privateKey: reusePrivateKey, publicKey: derivePublicKeyObject(reusePrivateKey)}
    : generateKeyPairSync("ec", {namedCurve: "P-256"});

  const publicKeyHex = exportSec1Hex(keypair.publicKey);
  const {canonical} = hashUnsignedProof(unsigned);
  const signer = createSign("sha256");
  signer.update(Buffer.from(canonical, "utf8"));
  signer.end();
  const signature = signer.sign(keypair.privateKey);
  const signatureHex = ("0x" + signature.toString("hex")) as `0x${string}`;

  const proof: ProofV1 = {
    ...unsigned,
    hardwareSignature: signatureHex,
    publicKey: publicKeyHex,
  };
  return {proof, privateKey: keypair.privateKey, publicKeyHex};
}

function exportSec1Hex(publicKey: KeyObject): `0x${string}` {
  const jwk = publicKey.export({format: "jwk"}) as {x?: string; y?: string};
  if (!jwk.x || !jwk.y) {
    throw new Error("Could not export P-256 public key as JWK with x,y");
  }
  const x = Buffer.from(jwk.x, "base64url");
  const y = Buffer.from(jwk.y, "base64url");
  if (x.length !== 32 || y.length !== 32) {
    throw new Error(`Unexpected P-256 coord lengths: x=${x.length} y=${y.length}`);
  }
  const sec1 = Buffer.concat([Buffer.from([0x04]), x, y]);
  return ("0x" + sec1.toString("hex")) as `0x${string}`;
}

function derivePublicKeyObject(privateKey: KeyObject): KeyObject {
  const jwk = privateKey.export({format: "jwk"}) as Record<string, unknown>;
  // Strip the private scalar `d` to keep only the public components.
  const {d: _d, ...publicJwk} = jwk;
  void _d;
  return createPublicKey({key: publicJwk as never, format: "jwk"});
}
