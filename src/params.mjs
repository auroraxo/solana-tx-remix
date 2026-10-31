/**
 * params.mjs — the EDITABLE constants of a recipe, and the proof that they are the bytes.
 *
 * A recipe's value is that a developer can change a number and rebuild the transaction.
 * Until now that value was half-claimed:
 *
 *   - The single-program emitter wrote `IX2_DECREASE_LIQUIDITY_V2_LIQUIDITY_AMOUNT = 2152817907718n`
 *     and NOTHING ever checked that constant against the wire bytes. A wrong constant is
 *     the most likely edit a reader makes, and the emitter's own comment ("verify
 *     byte-for-byte before editing") asks the READER to do a check the tool could do
 *     itself: the payload is right there, and the IDL that describes it is right there.
 *   - The multi-program emitter wrote NO constants at all for any instruction whose
 *     program is not Whirlpool. `schemaForInstruction(genIdlDir, ix.name)` looks a schema
 *     up BY NAME in the Whirlpool generated directory, so a Jupiter instruction named
 *     `shared_accounts_route_v2` found no schema and silently produced no constants —
 *     three of the six committed multi recipes carry zero editable parameters, and the
 *     README's "editable" claim was true for the flagship only.
 *
 * This module is the shared implementation both emitters and the verifier use:
 *
 *   decodeParams(program, data)      -> named arguments, per program, from the store
 *   encodeParams(program, name, args) -> the bytes those arguments claim to be
 *
 * Two properties make the constants trustworthy:
 *
 *   1. PROVENANCE. Arguments come from the stored, fingerprint-verified on-chain IDL for
 *      the PROGRAM that owns the instruction — never from a name lookup in another
 *      program's codec directory. `swap` exists in several programs; a name-based lookup
 *      picks whichever file happens to contain that string.
 *   2. ROUND TRIP. Decoded arguments are re-encoded and compared with the payload they
 *      came from. A constant set that does not reproduce its own instruction's bytes is
 *      not a constant set; it is a guess with a TypeScript type.
 *
 * The round trip is the part that makes this a CHECK rather than a convenience: the
 * verifier re-encodes the recipe's OWN constants and compares them with the chain bytes.
 * Editing a constant and forgetting to update the data block then fails verification
 * instead of producing a transaction nobody can rebuild.
 */
import { loadStoredIdl } from "./sememe-idl.mjs";
import { decodeNative, encodeNative, isNativeProgram } from "./native.mjs";

let codecCache = null;

/** sememe's dependency-free codec. Returns null when it is not reachable. */
async function loadCodec() {
  if (codecCache !== null) return codecCache;
  const { sememeSourceDir } = await import("./sememe-idl.mjs");
  const path = (await import("node:path")).default;
  const { pathToFileURL } = await import("node:url");
  const codecPath = path.join(sememeSourceDir(), "src", "codec.mjs");
  try {
    codecCache = { module: await import(pathToFileURL(codecPath).href), error: null };
  } catch (error) {
    codecCache = { module: null, error: `cannot load sememe codec: ${error.message}` };
  }
  return codecCache;
}

/**
 * The stored IDL for one program, with its fingerprint re-checked.
 *
 * Re-checked here rather than trusted from a cache: this module is the one that turns a
 * stored artifact into VALUES, so it is the last place a tampered object could still
 * produce a plausible-looking answer.
 */
export async function storedIdlFor(program) {
  const stored = await loadStoredIdl(program);
  if (stored.error) return { idl: null, reason: stored.reason, error: stored.error, fingerprint: null };
  return { idl: stored.idl, reason: null, error: null, fingerprint: stored.fingerprint };
}

/**
 * Named arguments for one instruction payload, from the program that owns it.
 *
 * Returns `{ args, name, source, trailing, fingerprint, reason, error }`:
 *   source — "stored IDL" (on-chain, fingerprint-verified) or "native" (System /
 *            ComputeBudget, which have no IDL) or null when nothing can decode it.
 *
 * `reason` is "absent" when there is simply no stored artifact for this program (the
 * caller may fall back) and "broken" when something IS there and does not verify (the
 * caller must not fall back silently — that is how a tampered artifact becomes a green
 * run).
 */
export async function decodeParams(program, data) {
  if (isNativeProgram(program)) {
    const decoded = decodeNative(program, data);
    if (!decoded) {
      return { args: null, name: null, source: "native", trailing: null, fingerprint: null, reason: "undecodable", error: `no native instruction matches these bytes on ${program}` };
    }
    return {
      args: decoded.args,
      integers: new Set(Object.entries(decoded.args).filter(([, v]) => typeof v === "bigint").map(([k]) => k)),
      name: decoded.name,
      source: "native",
      trailing: { count: 0, hex: "" },
      fingerprint: null,
      reason: null,
      error: null,
    };
  }

  const stored = await storedIdlFor(program);
  if (stored.error) {
    return { args: null, name: null, source: null, trailing: null, fingerprint: null, reason: stored.reason, error: stored.error };
  }
  const codec = await loadCodec();
  if (!codec.module) {
    return { args: null, name: null, source: null, trailing: null, fingerprint: null, reason: "absent", error: codec.error };
  }
  try {
    const decoded = codec.module.decodeInstructionData(stored.idl, data, { trailing: "report" });
    // Which TOP-LEVEL fields were integers (bigint) before toJsonSafe — a decimal string
    // field of type `string` (a seed, say) must stay a JSON string, while a u64 must be
    // emitted as `123n` or the exact value would be lost behind a quote… no, quotes keep
    // it exact too; the reason is the ENCODER: u64 accepts "123" and 123n alike, but a
    // `string` field accepts ONLY a string, so the literal has to follow the type.
    const integers = new Set(
      Object.entries(decoded.args)
        .filter(([, v]) => typeof v === "bigint")
        .map(([k]) => k),
    );
    return {
      args: codec.module.toJsonSafe(decoded.args),
      integers,
      name: decoded.instruction,
      source: "stored IDL",
      trailing: decoded.trailing,
      fingerprint: stored.fingerprint,
      reason: null,
      error: null,
    };
  } catch (error) {
    return {
      args: null,
      name: null,
      source: "stored IDL",
      trailing: null,
      fingerprint: stored.fingerprint,
      reason: "undecodable",
      error: String(error?.message ?? error),
    };
  }
}

/**
 * Re-encode named arguments back to instruction bytes.
 *
 * Returns a Buffer, or `{ error }` when the arguments do not describe the instruction
 * (unknown field, wrong type, missing field). The caller compares the result with the
 * bytes it came from: equal means the values ARE the bytes, unequal means they are not.
 */
export async function encodeParams(program, name, args) {
  if (isNativeProgram(program)) {
    const rebuilt = encodeNative(program, name, args);
    if (!rebuilt) return { bytes: null, error: `native ${name} on ${program} cannot be re-encoded from these values` };
    return { bytes: rebuilt, error: null };
  }
  const stored = await storedIdlFor(program);
  if (stored.error) return { bytes: null, error: stored.error };
  const codec = await loadCodec();
  if (!codec.module) return { bytes: null, error: codec.error };
  try {
    return { bytes: codec.module.encodeInstructionData(stored.idl, name, args), error: null };
  } catch (error) {
    return { bytes: null, error: String(error?.message ?? error) };
  }
}

/**
 * The literal to emit for one argument value.
 *
 * 64/128-bit integers are `BigInt` in the decoder and decimal strings after
 * `toJsonSafe`, so they are emitted as `123n` — the exact value, not a double that has
 * silently lost the low 53 bits. Everything else is JSON.
 *
 * `option` values keep their object form (`{"__option":"None"}` / `{"__option":"Some",…}`),
 * because that is the shape the encoder accepts: the recipe's constants are meant to be
 * re-encoded, and a flattened form would not round-trip.
 */
export function literalFor(value, { integer = false } = {}) {
  if (typeof value === "boolean") return { text: String(value), kind: "boolean" };
  if (typeof value === "bigint") return { text: `${value}n`, kind: "bigint" };
  if (typeof value === "number") return { text: JSON.stringify(value), kind: "number" };
  if (typeof value === "string") {
    // A decimal string that came from a 64/128-bit INTEGER is emitted as a BigInt
    // literal, so the value in the file is exact rather than a quoted number. A decimal
    // string that is genuinely a STRING field (a seed, a memo) stays a quoted string —
    // the encoder accepts only a string for that type, and a BigInt literal there would
    // fail to re-encode. The caller says which fields are integers.
    if (integer && /^-?\d+$/.test(value)) return { text: `${value}n`, kind: "bigint" };
    return { text: JSON.stringify(value), kind: "string" };
  }
  if (value === null) return { text: "null", kind: "null" };
  if (Array.isArray(value)) return { text: JSON.stringify(value), kind: "array" };
  if (typeof value === "object") return { text: JSON.stringify(value), kind: "object" };
  return { text: JSON.stringify(value), kind: "unknown" };
}

/**
 * The constant name for one argument: `IX<index>_<INSTRUCTION>_<FIELD>`.
 *
 * The instruction name is upper-cased, the field name is upper-cased, and both are
 * reduced to identifier characters. The name is stable across emissions, which matters:
 * a reader's edit must survive a re-emission.
 */
export function constantName(index, instruction, field) {
  const clean = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return `IX${index}_${clean(instruction)}_${clean(field)}`;
}

/**
 * The value a constant literal stands for — the inverse of {@link literalFor}.
 *
 * `123n` -> BigInt, JSON otherwise. The emitter gates on THIS, not on the raw decoded
 * values: a value that round-trips as data but not as the literal written into the file
 * (a decimal string field emitted as `123n` and re-encoded as a string type) would pass
 * the emit gate and then fail in the verifier — the file must be re-encodable exactly as
 * it stands.
 */
export function parseLiteral(text) {
  const raw = String(text).trim();
  if (/^-?\d+n$/.test(raw)) return BigInt(raw.slice(0, -1));
  try {
    return JSON.parse(raw);
  } catch {
    return { __unparsed: raw };
  }
}

/**
 * Parse the constants a recipe file declares back into `{ name -> value }`.
 *
 * Only the `IX<n>_<INSTRUCTION>_<FIELD> = <literal>` lines are read; account-role and
 * transaction constants are ignored. Values are parsed as JSON when possible, and a
 * BigInt literal (`123n`) is converted to a BigInt so the encoder sees the exact value.
 */
export function parseRecipeParams(src) {
  const params = new Map();
  const re = /export const (IX\d+_[A-Z0-9_]+)\s*=\s*([^;]+);/g;
  let match;
  while ((match = re.exec(src))) {
    const value = parseLiteral(match[2]);
    if (value && typeof value === "object" && "__unparsed" in value) continue; // not a literal we can re-encode (e.g. an expression) — skip it
    params.set(match[1], value);
  }
  return params;
}
