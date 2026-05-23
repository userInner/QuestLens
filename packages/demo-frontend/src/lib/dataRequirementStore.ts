/**
 * Off-chain DataRequirement storage.
 *
 * In production a Requester pins their DataRequirement JSON to IPFS and the
 * frontend retrieves it by CID. For the hackathon demo we use localStorage
 * keyed by the on-chain dataRequirement hash. This is documented in spec
 * task 4.3 [P1] - real IPFS upload arrives post-demo.
 */

import type {DataRequirementV1} from "@questlens/schemas";

const STORAGE_KEY = "questlens.dataRequirements.v1";

interface Stored {
  [hash: string]: DataRequirementV1;
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
}

function write(s: Stored): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function saveDataRequirement(hash: string, dr: DataRequirementV1): void {
  const s = read();
  s[hash.toLowerCase()] = dr;
  write(s);
}

export function loadDataRequirement(hash: string): DataRequirementV1 | undefined {
  return read()[hash.toLowerCase()];
}

export function listKnownDataRequirements(): Map<string, DataRequirementV1> {
  return new Map(Object.entries(read()));
}
