/**
 * sememe-idl.mjs — decode Whirlpool instruction arguments from a STORED SEMEME ARTIFACT.
 *
 * The problem this removes: `src/args.mjs` parses Codama-generated TypeScript modules that
 * are NOT in this repository. Every fresh clone therefore cannot decode a single Whirlpool
 * argument, and `ci/acceptance.mjs` reports `out/remix-6754RLWd.ts` as SKIP — the flagship
 * recipe, unverified, in the environment where it matters most.
 *
 * sememe pulls a program's own IDL from the chain and stores it content-addressed, with a
 * receipt recording program, source account, slot and fingerprint. This module consumes that
 * store:
 *
 *   - `sememeSourceDir()` / `sememeStoreDir()`  — where the decoder and the artifact live
 *   - `loadStoredIdl(program)`                  — object + receipt, FINGERPRINT RE-CHECKED
 *   - `decodeWithSememe(program, data)`         — one instruction payload -> named arguments
 *   - `sememeStatus()`                          — what is usable here, and what is missing
 *
 * Everything degrades to `null` with a reason instead of throwing: a machine without a sememe
 * checkout or store must still be able to run the verifier, which then falls back to the
 * generated-codec path and reports SKIP exactly as before.
 *
 * Why the verifier is allowed to differ from the emitter: the emitter writes names from the
 * generated codecs, and the verifier now re-derives them from an INDEPENDENT source — an IDL
 * pulled from the chain by different code. A defect shared by emitter and generated codecs
 * (a wrong argument layout, a mislabelled discriminator) can no longer hide behind both
 * sides agreeing with itself.
 *
 * Fingerprint rule: sha256(canonicalJson(idl) + '\n') must equal the receipt's fingerprint.
 * The receipt alone is a claim; recomputed bytes are the check. A store object that does not
 * re-hash to its receipt is refused rather than decoded.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const WHIRLPOOL_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/**
 * Where sememe's source lives. Same convention as `IDL_GEN_DIR`: an explicit environment
 * variable first, then a sibling checkout under the user's home. Neither is required — the
 * caller handles `null`.
 */
export function sememeSourceDir() {
  return (
    process.env.SEMEME_DIR ||
    path.resolve(process.env.HOME ?? "", "github_repos/sememe")
  );
}

/** The stored artifact: sememe's `<store>/objects/<fingerprint>.json` + `receipts/`. */
export function sememeStoreDir() {
  return process.env.SEMEME_STORE || path.resolve(HERE, "..", "idl", "sememe-store");
}

let codecCache = null;

/**
 * Import sememe's decode core (dependency-free: node builtins and its own files only).
 * Returns `null` when there is no checkout here — never throws, so the verifier can decide
 * which path to take from the value alone.
 */
async function loadCodec() {
  if (codecCache !== null) return codecCache;
  const codecPath = path.join(sememeSourceDir(), "src", "codec.mjs");
  const canonicalPath = path.join(sememeSourceDir(), "src", "canonical.mjs");
  if (!fs.existsSync(codecPath) || !fs.existsSync(canonicalPath)) {
    codecCache = { error: `no sememe source at ${sememeSourceDir()} (set SEMEME_DIR)` };
    return codecCache;
  }
  try {
    const codec = await import(pathToFileURL(codecPath).href);
    const { canonicalJson } = await import(pathToFileURL(canonicalPath).href);
    codecCache = { codec, canonicalJson, error: null };
  } catch (error) {
    codecCache = { error: `cannot load sememe codec: ${error.message}` };
  }
  return codecCache;
}

/**
 * Why the stored artifact is not usable, if it is not.
 *
 * The distinction matters: a machine that simply does not HAVE a sememe store is a
 * normal state (the verifier falls back to the generated codecs and reports SKIP), while
 * a machine that HAS one and it does not verify is a defect that must be reported as a
 * failure. Collapsing the two is how a tampered or corrupted artifact becomes a green
 * run: the check finds the damage, cannot use the result, and quietly proceeds without it.
 *
 *   absent   — nothing here: no checkout, no store, or no receipt for this program
 *   broken   — something is here and it is wrong: unreadable, malformed, or the object's
 *              bytes do not re-hash to the fingerprint the receipt claims
 */
export const ABSENT = "absent";
export const BROKEN = "broken";

/**
 * Read a stored IDL for `program` and RE-CHECK its fingerprint against its own bytes.
 *
 * Returns `{ idl, receipt, fingerprint, object, reason, error }`. The fingerprint check is
 * the whole point of using a store instead of a JSON file dropped in the tree: the receipt
 * claims provenance, and the recomputed digest proves the object is the one that was
 * claimed. A mismatch is reported as `broken`, never as a usable IDL.
 */
export async function loadStoredIdl(program = WHIRLPOOL_PROGRAM) {
  const source = await loadCodec();
  if (source.error) return { idl: null, reason: ABSENT, error: source.error };

  const store = sememeStoreDir();
  const receiptsDir = path.join(store, "receipts");
  if (!fs.existsSync(receiptsDir)) {
    return { idl: null, reason: ABSENT, error: `no sememe store at ${store} (set SEMEME_STORE or run sememe pull)` };
  }
  const candidates = fs.readdirSync(receiptsDir).filter((n) => n.startsWith(`${program}-`)).sort();
  if (!candidates.length) return { idl: null, reason: ABSENT, error: `store ${store} has no receipt for ${program}` };

  const receiptName = candidates[candidates.length - 1];
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(path.join(receiptsDir, receiptName), "utf8"));
  } catch (error) {
    return { idl: null, reason: BROKEN, error: `unreadable receipt ${receiptName}: ${error.message}` };
  }

  const claimed = String(receipt.fingerprint ?? "").replace(/^sha256:/, "");
  if (!/^[a-f0-9]{64}$/.test(claimed)) {
    return { idl: null, reason: BROKEN, error: `receipt ${receiptName} has a malformed fingerprint: ${receipt.fingerprint}` };
  }

  const objectPath = path.join(store, "objects", `${claimed}.json`);
  if (!fs.existsSync(objectPath)) {
    return { idl: null, reason: BROKEN, error: `receipt ${receiptName} claims ${claimed} but the store object is missing` };
  }

  let idl;
  try {
    idl = JSON.parse(fs.readFileSync(objectPath, "utf8"));
  } catch (error) {
    return { idl: null, reason: BROKEN, error: `unreadable store object ${claimed}.json: ${error.message}` };
  }
  if (!Array.isArray(idl?.instructions)) {
    return { idl: null, reason: BROKEN, error: `store object ${claimed} has no instructions` };
  }

  // Re-hash. `pull` writes sha256(canonicalJson(idl) + '\n'), so verify with the same
  // canonicalizer rather than with JSON.stringify, whose key order is not the stored order.
  const actual = createHash("sha256").update(`${source.canonicalJson(idl)}\n`).digest("hex");
  if (actual !== claimed) {
    return {
      idl: null,
      reason: BROKEN,
      error: `store object ${claimed} re-hashes to ${actual} — object and receipt disagree`,
    };
  }

  return { idl, receipt, fingerprint: `sha256:${actual}`, object: objectPath, reason: null, error: null };
}

/**
 * Decode one full instruction payload (discriminator + arguments) with the stored IDL.
 *
 * Returns `{ instruction, args, consumed, bytes, trailing, nameMatches }` or `{ error }`.
 * `nameMatches` compares the IDL's own name for the discriminator against the recipe's
 * label — the check that a label cannot drift from bytes silently.
 */
export async function decodeWithSememe(data, program = WHIRLPOOL_PROGRAM) {
  const stored = await loadStoredIdl(program);
  if (stored.error) return { error: stored.error, reason: stored.reason };
  const source = await loadCodec();
  try {
    const decoded = source.codec.decodeInstructionData(stored.idl, data, { trailing: "report" });
    return {
      instruction: decoded.instruction,
      args: source.codec.toJsonSafe(decoded.args),
      consumed: decoded.consumed,
      bytes: decoded.total,
      trailing: decoded.trailing,
      idlName: decoded.instruction,
      error: null,
    };
  } catch (error) {
    return { error: String(error?.message ?? error) };
  }
}

/**
 * What this machine can do, for a verifier that must say WHY a claim is unverifiable.
 * Returns `{ source, store, idl, reason, error, usable }`, where `reason` is `absent`
 * (nothing here — the caller may fall back) or `broken` (something is here and it is wrong
 * — the caller must not fall back silently).
 */
export async function sememeStatus(program = WHIRLPOOL_PROGRAM) {
  const source = await loadCodec();
  if (source.error) {
    return { usable: false, reason: ABSENT, error: source.error, source: null, store: null, idl: null };
  }
  const stored = await loadStoredIdl(program);
  if (stored.error) {
    return {
      usable: false,
      reason: stored.reason,
      error: stored.error,
      source: sememeSourceDir(),
      store: sememeStoreDir(),
      idl: null,
    };
  }
  return {
    usable: true,
    reason: null,
    error: null,
    source: sememeSourceDir(),
    store: sememeStoreDir(),
    idl: stored.idl,
    fingerprint: stored.fingerprint,
    receipt: stored.receipt,
    object: stored.object,
  };
}

/** Reset the memoized codec import — used by tests that change SEMEME_DIR. */
export function _resetCodecCache() {
  codecCache = null;
}
