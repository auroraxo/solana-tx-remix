/**
 * sememe-multi.mjs — every stored sememe artifact, as a per-program instruction table.
 *
 * The single-program migration (src/sememe-idl.mjs) moved ONE program — Whirlpool — off
 * its generated codecs and onto a fingerprint-verified on-chain IDL. The multi-program
 * path kept reading the IDL copies checked into `idl/multi/`, which is the thing sememe
 * exists to replace: snapshots with no provenance, no fingerprint and no freshness check.
 *
 * Measured on 2026-10-30 (see sememe's research/vendored-drift-tx-remix-2026-10-30.json):
 * every vendored copy that HAS an on-chain IDL is strictly stale — Jupiter AMM v6 was
 * missing 2 instructions, DFlow was missing 1 — and one of Jupiter's missing
 * instructions (`create_idempotent_associated_token_account`) appears in REAL mainnet
 * traffic. A recipe emitted from the vendored copy rendered that instruction as
 * `(unknown)`; the bytes are on chain and the program is public, so a fresh pull names
 * it.
 *
 * This module turns the store into the source for EVERY program it holds:
 *
 *   loadStoredProgramTables()  -> Map<programAddress, { anchor, tag, source, reason }>
 *
 * Rules that keep this honest:
 *
 *   1. The fingerprint is re-checked against the object's own bytes before the object is
 *      used. A store that is present and does not verify is BROKEN, and a broken program
 *      is reported — it is never silently replaced by the vendored copy.
 *   2. A program with no receipt is ABSENT. The vendored copy is used for it, and that
 *      is stated, not hidden: `native` programs (SPL Token, Aquifer, BisonFi, SolFi)
 *      publish no on-chain Anchor IDL, so for them the vendored copy is the only
 *      description available.
 *   3. Discriminators are derived with Anchor's own rule for programs whose on-chain IDL
 *      stores none (legacy `anchor:idl` accounts). sememe's `withDerivedDiscriminators`
 *      is used unchanged, and a stored value always wins over a derived one.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sememeSourceDir, sememeStoreDir, ABSENT, BROKEN } from "./sememe-idl.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** sememe's dependency-free derivation rule. Cached; `null` when sememe is not here. */
let derivedModule = null;
async function loadDerived() {
  if (derivedModule !== null) return derivedModule;
  const p = path.join(sememeSourceDir(), "src", "discriminators.mjs");
  if (!fs.existsSync(p)) {
    derivedModule = { module: null, error: `no sememe source at ${sememeSourceDir()} (set SEMEME_DIR)` };
    return derivedModule;
  }
  try {
    derivedModule = { module: await import(pathToFileURL(p).href), error: null };
  } catch (error) {
    derivedModule = { module: null, error: `cannot load sememe discriminators: ${error.message}` };
  }
  return derivedModule;
}

/**
 * sememe's canonical JSON form — the exact bytes `pull` hashed. The fingerprint is
 * sha256(canonicalJson(idl) + '\n'), so the re-check must use the SAME canonicalizer.
 * JSON.stringify is not it: its key order is not the stored order, and using it would
 * reject every honest artifact while accepting a tampered one.
 */
let canonicalModule = null;
async function loadCanonical() {
  if (canonicalModule !== null) return canonicalModule;
  const p = path.join(sememeSourceDir(), "src", "canonical.mjs");
  if (!fs.existsSync(p)) {
    canonicalModule = { module: null, error: `no sememe source at ${sememeSourceDir()} (set SEMEME_DIR)` };
    return canonicalModule;
  }
  try {
    canonicalModule = { module: await import(pathToFileURL(p).href), error: null };
  } catch (error) {
    canonicalModule = { module: null, error: `cannot load sememe canonicalizer: ${error.message}` };
  }
  return canonicalModule;
}

/** Every receipt in the store, newest last per program. */
function receiptsByProgram(storeDir) {
  const dir = path.join(storeDir, "receipts");
  if (!fs.existsSync(dir)) return { byProgram: new Map(), storePresent: false };
  const byProgram = new Map();
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith(".json")) continue;
    const program = name.split("-")[0];
    const list = byProgram.get(program) ?? [];
    list.push(name);
    byProgram.set(program, list);
  }
  return { byProgram, storePresent: true };
}

/**
 * The address a stored IDL declares for itself. Anchor IDLs carry `address` at the top
 * level; some carry it under `metadata.address`.
 */
function idlAddress(idl) {
  if (typeof idl?.address === "string" && idl.address) return idl.address;
  if (typeof idl?.metadata?.address === "string" && idl.metadata.address) return idl.metadata.address;
  return null;
}

/**
 * The stored IDL for one program, with the fingerprint re-checked against its own bytes.
 * Returns `{ idl, reason, error, fingerprint, receipt }` — the same ABSENT/BROKEN split
 * the single-program path uses, so a damaged store cannot quietly become a green run.
 *
 * The re-hash is not decoration. The single-program verifier re-checks its fingerprint,
 * but the multi-program path initially did not — it read the object named by the receipt
 * and used it. A tampered Jupiter AMM v6 object (a valid JSON file with one instruction
 * renamed) was then ACCEPTED by this path, while the same tampering is refused by
 * src/sememe-idl.mjs. Two readers of one store with different verification strength is
 * exactly the drift this repository exists to prevent, so both now re-hash the same way.
 */
export async function loadStoredProgram(program) {
  const store = sememeStoreDir();
  const receiptsDir = path.join(store, "receipts");
  if (!fs.existsSync(receiptsDir)) {
    return { idl: null, reason: ABSENT, error: `no sememe store at ${store}` };
  }
  const candidates = fs.readdirSync(receiptsDir)
    .filter((n) => n.startsWith(`${program}-`) && n.endsWith(".json"))
    .sort();
  if (!candidates.length) {
    return { idl: null, reason: ABSENT, error: `store ${store} has no receipt for ${program}` };
  }
  const name = candidates[candidates.length - 1];
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(path.join(receiptsDir, name), "utf8"));
  } catch (error) {
    return { idl: null, reason: BROKEN, error: `unreadable receipt ${name}: ${error.message}` };
  }
  const claimed = String(receipt.fingerprint ?? "").replace(/^sha256:/, "");
  if (!/^[a-f0-9]{64}$/.test(claimed)) {
    return { idl: null, reason: BROKEN, error: `receipt ${name} has a malformed fingerprint` };
  }
  const objectPath = path.join(store, "objects", `${claimed}.json`);
  if (!fs.existsSync(objectPath)) {
    return { idl: null, reason: BROKEN, error: `receipt ${name} claims ${claimed} but the object is missing` };
  }
  let idl;
  try {
    idl = JSON.parse(fs.readFileSync(objectPath, "utf8"));
  } catch (error) {
    return { idl: null, reason: BROKEN, error: `unreadable store object ${claimed}: ${error.message}` };
  }
  if (!Array.isArray(idl?.instructions)) {
    return { idl: null, reason: BROKEN, error: `store object ${claimed} has no instructions` };
  }
  // Re-hash. `pull` writes sha256(canonicalJson(idl) + '\n'); verify with the same
  // canonicalizer, because JSON.stringify's key order is not the stored order.
  const canonical = await loadCanonical();
  if (!canonical.module) {
    return { idl: null, reason: BROKEN, error: `cannot verify fingerprint: ${canonical.error}` };
  }
  const actual = createHash("sha256").update(`${canonical.module.canonicalJson(idl)}\n`).digest("hex");
  if (actual !== claimed) {
    return {
      idl: null,
      reason: BROKEN,
      error: `store object ${claimed} re-hashes to ${actual} — object and receipt disagree`,
    };
  }
  return { idl, receipt, fingerprint: claimed, reason: null, error: null, object: objectPath };
}

/**
 * Every stored artifact in the store, as a per-program dispatch table.
 *
 * Returns `{ tables, problems, conflicts }`. `problems` names every program whose stored
 * artifact could not be used and why — a BROKEN artifact is never quietly replaced by the
 * vendored copy. `conflicts` records stored-vs-derived discriminator disagreements, which
 * are reported but do NOT block: a stored value that survives real payload bytes wins.
 */
export async function loadStoredProgramTables() {
  const store = sememeStoreDir();
  const { byProgram, storePresent } = receiptsByProgram(store);
  const tables = new Map();
  const problems = [];
  const conflicts = [];
  if (!storePresent) {
    return { tables, problems: [{ program: null, reason: ABSENT, error: `no sememe store at ${store}` }], conflicts };
  }
  const derived = await loadDerived();

  for (const [program, names] of byProgram) {
    const loaded = await loadStoredProgram(program);
    if (loaded.error) {
      problems.push({ program, reason: loaded.reason, error: loaded.error });
      continue;
    }
    let idl = loaded.idl;
    if (derived.module) {
      // Fill discriminator gaps with Anchor's rule. A stored value always wins over a
      // derived one — sememe's rule, and measured on Jupiter AMM v6: instruction
      // `create_idempotent_associated_token_account` STORES 5368c096 while the derivation
      // gives bdbcecfa, and 5 real mainnet payloads carry 5368c096 and re-encode
      // byte-exactly. A conflict here is a name-vs-bytes disagreement that the STORED
      // value already won against real traffic; it is recorded, not fatal.
      const filled = derived.module.withDerivedDiscriminators(idl);
      for (const conflict of filled.conflicts ?? []) {
        conflicts.push({
          program,
          kind: conflict.kind,
          name: conflict.name,
          stored: Buffer.from(conflict.stored).toString("hex"),
          derived: Buffer.from(conflict.derived).toString("hex"),
          resolution: "stored wins (validated against real payload bytes)",
        });
      }
      idl = filled.idl;
    } else {
      problems.push({ program, reason: ABSENT, error: derived.error });
      continue;
    }
    const address = idlAddress(idl);
    if (!address) {
      problems.push({ program, reason: BROKEN, error: "stored IDL declares no program address" });
      continue;
    }
    const anchor = new Map();
    const tag = new Map();
    for (const instruction of idl.instructions ?? []) {
      if (!Array.isArray(instruction.discriminator) || instruction.discriminator.length === 0) continue;
      const bytes = Buffer.from(instruction.discriminator);
      const entry = {
        name: String(instruction.name),
        snake: String(instruction.name).toLowerCase(),
        file: loaded.object,
        programName: program,
        accounts: (instruction.accounts ?? []).map((a) => String(a.name)),
        args: (instruction.args ?? []).map((a) => ({ name: a.name, type: a.type })),
        source: "stored IDL",
      };
      if (bytes.length >= 8) {
        anchor.set(bytes.subarray(0, 8).toString("hex"), { ...entry, scheme: "anchor", tagLen: 8 });
      } else {
        tag.set(bytes.toString("hex"), { ...entry, scheme: "tag", tagLen: bytes.length });
      }
    }
    if (!anchor.size && !tag.size) {
      problems.push({ program, reason: BROKEN, error: "stored IDL yields no usable discriminator" });
      continue;
    }
    tables.set(address, {
      anchor,
      tag,
      sources: new Set([loaded.object]),
      fingerprint: loaded.fingerprint,
      receipt: loaded.receipt,
      instructionCount: (idl.instructions ?? []).length,
    });
  }
  return { tables, problems, conflicts };
}

export { ABSENT, BROKEN };
