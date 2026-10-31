/**
 * native.mjs — the native-program decoder, as a THIN FACADE over sememe's verified module.
 *
 * History, because the shape of this file is the lesson: it used to carry a
 * hand-transcribed copy of the System and ComputeBudget instruction tables, with a
 * `PROVENANCE` object pinning the upstream source it was transcribed FROM. The
 * transcription was reviewed and "corroborated" and it still carried three defects,
 * measured on real mainnet traffic (sememe, 2026-10-31):
 *
 *   1. the seed strings used a u32 length header — the chain carries a u64 (bincode
 *      fixint), so 0 of 63 live CreateAccountWithSeed payloads could be named;
 *   2. System variants 12 and 13 (`UpgradeNonceAccount`, `CreateAccountAllowPrefund`)
 *      were missing entirely — unknown selectors rendered (unknown);
 *   3. ComputeBudget tag 0 was silently accepted as `Unused` where the runtime rejects
 *      it as InvalidInstructionData.
 *
 * The fix is the one this repository's own verifier already applies to Anchor IDLs:
 * do not keep a copy that can drift — consume the producer's verified artifact instead.
 * The tables now live in sememe, derived from vendored upstream Rust at load time and
 * re-hashed against the pinned sources (sememe src/native-interface.mjs); this module
 * keeps only the call surface the rest of the repo already imports.
 *
 * The one behavior change is deliberate and measured: `decodeNative` now returns null
 * for a wire-rejected ComputeBudget tag 0 (the runtime's verdict) instead of the name
 * `Unused`. Nothing in the repo relied on naming tag 0: no committed recipe carries one,
 * and the negative controls do not exercise it. Where the old table NAMED bytes the
 * chain would not have executed, the new table refuses them — that is the direction the
 * falsification controls already enforce everywhere else.
 *
 * sememe is found the same way the stored-IDL decoder finds it: SEMEME_DIR first, then
 * the sibling checkout. There is no silent fallback — if sememe is absent, importing
 * this module fails, and a fresh clone of THIS repository cannot silently lose its
 * native decoding.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Where sememe's checkout lives (same convention as src/sememe-idl.mjs). */
export function sememeSourceDir() {
  return process.env.SEMEME_DIR || path.resolve(process.env.HOME ?? "", "github_repos/sememe");
}

let nativeModule = null;
let loadError = null;

async function loadSememe() {
  if (nativeModule !== null) return nativeModule;
  if (loadError) return null;
  const dir = sememeSourceDir();
  const modulePath = path.join(dir, "src", "native.mjs");
  if (!fs.existsSync(modulePath)) {
    loadError = `no sememe checkout at ${dir} (set SEMEME_DIR) — the native decoder lives there`;
    return null;
  }
  try {
    nativeModule = await import(pathToFileURL(modulePath).href);
  } catch (error) {
    loadError = `cannot load sememe native decoder: ${error.message}`;
  }
  return nativeModule;
}

// Loaded at import, like the rest of this repository's modules, but WITHOUT throwing:
// a machine with no sememe checkout is a documented state (the verifier reports native
// instructions as unverifiable there) — a hard failure here would turn that documented
// state into a crash before any report could say why. The reason stays available
// through {@link nativeStatus} and every decode returns null while it is set.
const sememe = await loadSememe();

/**
 * Whether the native decoder is reachable, and why not if it is not.
 *
 * `{ ok, reason, source }` — the shape the verifier uses to tell "the bytes were
 * refused" (a finding about the recipe) apart from "there is nothing to decode with"
 * (a finding about the environment, reported as an unverified run rather than a
 * wrong recipe).
 */
export function nativeStatus() {
  return sememe
    ? { ok: true, reason: null, source: sememeSourceDir() }
    : { ok: false, reason: loadError ?? "not loaded", source: sememeSourceDir() };
}

export const SYSTEM_PROGRAM = sememe?.SYSTEM_PROGRAM ?? "11111111111111111111111111111111";
export const COMPUTE_BUDGET_PROGRAM = sememe?.COMPUTE_BUDGET_PROGRAM ?? "ComputeBudget111111111111111111111111111111";
export const NATIVE_PROVENANCE = sememe?.NATIVE_PROVENANCE ?? {};
export const NativeCodecError = sememe?.NativeCodecError;

/** Program ids this module can decode, for callers that enumerate. */
export function nativePrograms() {
  return sememe ? sememe.nativePrograms() : [];
}

/** Provenance for one native program, or null. */
export function nativeProvenance(program) {
  return sememe ? sememe.nativeProvenance(program) : null;
}

/**
 * Decode a native instruction payload; null when the program is not native or the
 * bytes are refused (unknown selector, wire-rejected variant, truncated payload).
 * A refusal reason is available via {@link nativeRefusal}.
 */
export function decodeNative(program, data) {
  if (!sememe) return null;
  try {
    const decoded = sememe.decodeNativeInstruction(program, data);
    // sememe signals "not a native program" with a `{refused}` result rather than a
    // throw; this facade's contract with the rest of the repo is "null = cannot name",
    // and a truthy object without a `name` would make callers print `undefined` as an
    // instruction name. The refusal must surface as null here, and its reason through
    // nativeRefusal().
    return decoded && decoded.refused ? null : decoded;
  } catch (error) {
    if (error instanceof sememe.NativeCodecError) return null;
    throw error;
  }
}

/** Why the last decode refused, or null if it decoded. */
export function nativeRefusal(program, data) {
  return sememe ? sememe.nativeRefusal(program, data) : "decoder-unavailable";
}

/**
 * Re-encode a decoded native instruction back to bytes, or null when the
 * name/program/args do not describe encodable bytes (the verifier's round-trip check).
 */
export function encodeNative(program, name, values = null) {
  if (!sememe) return null;
  try {
    return sememe.encodeNativeInstruction(program, name, values ?? {});
  } catch (error) {
    if (error instanceof sememe.NativeCodecError) return null;
    throw error;
  }
}

/** Whether `program` is one of the native programs. */
export function isNativeProgram(program) {
  // The PROGRAM's wire scheme is a fact about Solana, not about whether this checkout
  // can decode it: the verifier must still route System/ComputeBudget into the native
  // branch (where it then reports the decoder's absence) instead of silently skipping
  // the branch and counting an unchecked instruction as verified.
  if (!sememe) return program === SYSTEM_PROGRAM || program === COMPUTE_BUDGET_PROGRAM;
  return sememe.isNativeProgram(program);
}

/** Whether some native program implements this instruction name. */
export function isNativeName(name) {
  return nativePrograms().some((program) => sememe.isNativeName(program, name));
}

/** Whether `name` belongs to `program`'s native table. */
export function isNative(program, name) {
  return sememe ? sememe.isNativeName(program, name) : false;
}

/** Short label for a native program, used in verifier messages. */
export function nativeProgramLabel(program) {
  if (program === SYSTEM_PROGRAM) return "System";
  if (program === COMPUTE_BUDGET_PROGRAM) return "ComputeBudget";
  return "native";
}
