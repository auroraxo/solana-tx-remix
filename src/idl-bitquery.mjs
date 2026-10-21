/**
 * bitquery IDL loader.
 *
 * bitquery/solana-idl-lib ships raw IDL JSONs that look like
 *   { instructions: [{ name, accounts:[…], args:…, discriminator:[…bytes…] }] }
 * or the BGL-style variant
 *   { instructions: [{ name, discriminant: { type: "u8", value: 1 } }] }
 *
 * Two encodings, one dispatch rule: a program's discriminator scheme is fixed per
 * program — Anchor programs use a sha256-truncated 8-byte discriminator, BGL/SPL-style
 * programs use a 1-4 byte tag followed directly by args. Therefore lookup is keyed BY
 * PROGRAM ADDRESS first, scheme second. A global tag map would mislabel: tag 0x01 is
 * Aquifer's `swap` and Token-2022's `initializeAccount`, and both appear in one
 * transaction's CPI set routinely.
 *
 * Entries return { anchor: Map<hex8, entry>, tag: Map<hexTag, {entry, tagLen}> } per
 * program. Callers match data.slice(0,8) against `anchor`, then data[0..tagLen) against
 * `tag`.
 */
import fs from "node:fs";
import path from "node:path";
import { decodeNative } from "./native.mjs";

const ANCHOR_DISC_SIZE = 8;

/**
 * bitquery's shank-origin IDLs declare the program address in two places, and which one
 * they use is per file: `spl_token_2022.json` carries Token-2022 under `metadata.address`
 * but carries the classic SPL Token program nowhere at all. The numbering of the original
 * SPL Token instructions is preserved verbatim by Token-2022 (it is a strict superset),
 * so binding that single IDL to both program addresses is accurate for every tag it
 * declares — including transfer=3, transferChecked=12, mintTo=7, burn=8 used in real
 * transactions today. This alias supplies the binding `metadata.address` cannot; it is not
 * a workaround for a key the loader failed to read.
 */
const PROGRAM_NAME_ALIASES = {
  spl_token_2022: [
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // SPL Token
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // Token-2022
  ],
  token: [
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  ],
  // These carry the address under `metadata.address`, which `parseIdlJson` reads directly,
  // so the aliases are redundant as bindings. They stay as a cross-check of identity: a
  // mismatch between an alias and the file's own declared address would be a misbinding
  // of a verified executable program, which is the exact failure mode to catch.
  Aquifer: ["AQU1FRd7papthgdrwPTTq5JacJh8YtwEXaBfKU3bTz45"],
  aquifer: ["AQU1FRd7papthgdrwPTTq5JacJh8YtwEXaBfKU3bTz45"],
  Solfi: ["SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe"],
  solfi: ["SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe"],
  BisonFi: ["BiSoNHVpsVZW2F7rx2eQ59yQwKxzU5NvBcmKshCSUypi"],
  bisonfi: ["BiSoNHVpsVZW2F7rx2eQ59yQwKxzU5NvBcmKshCSUypi"],
};

/** Parse one bitquery IDL JSON into { addresses, instructions:[{name, scheme, tag, entry}] }. */
export function parseIdlJson(file) {
  const raw = fs.readFileSync(file, "utf8");
  const j = JSON.parse(raw);
  const programName = j.name ?? j.metadata?.name ?? path.basename(file, ".json");

  const addresses = [];
  if (typeof j.address === "string" && j.address) addresses.push(j.address);
  // shank-origin IDLs (`metadata.origin: "shank"`) declare the program under
  // `metadata.address`. Four of the eight IDLs in idl/multi are shank-origin, and reading
  // only the top-level key bound none of them: `metadata` was already being parsed one line
  // up to reach `programName`, so the address was in the object and never looked at.
  //
  // An unbound program does not fail. It misses the dispatch table, misses the native
  // fallback, returns null, and the emitters render null as `(unknown)` — a loader that
  // cannot reach a table it is already carrying reports "nothing to name" instead of
  // "could not reach the names". The two look identical from outside, which is the whole
  // failure mode this file exists to avoid.
  const metaAddress = j.metadata?.address;
  if (typeof metaAddress === "string" && metaAddress) addresses.push(metaAddress);
  for (const alias of PROGRAM_NAME_ALIASES[programName] ?? []) addresses.push(alias);
  const deduped = [...new Set(addresses)];

  const instructions = [];
  for (const ix of j.instructions ?? []) {
    const entry = {
      name: ix.name,
      snake: ix.name.toLowerCase(),
      file,
      programName,
      accounts: (ix.accounts ?? []).map((a) => a.name),
      args: (ix.args ?? []).map((a) => ({ name: a.name, type: a.type })),
    };
    if (Array.isArray(ix.discriminator) && ix.discriminator.length >= ANCHOR_DISC_SIZE) {
      instructions.push({ ...entry, scheme: "anchor", tag: Buffer.from(ix.discriminator.slice(0, ANCHOR_DISC_SIZE)) });
    } else if (ix.discriminant && typeof ix.discriminant.value === "number") {
      const type = ix.discriminant.type;
      const tag = Buffer.alloc(4);
      let len = 1;
      if (type === "u8") tag.writeUInt8(ix.discriminant.value, 0);
      else if (type === "u16") { tag.writeUInt16LE(ix.discriminant.value, 0); len = 2; }
      else if (type === "u32") { tag.writeUInt32LE(ix.discriminant.value, 0); len = 4; }
      else tag.writeUInt8(ix.discriminant.value & 0xff, 0);
      instructions.push({ ...entry, scheme: "tag", tag: tag.subarray(0, len), tagLen: len });
    }
    // No discriminator AND no discriminant: skip — a name guessed from position alone
    // would be a label, not a decode.
  }
  return { addresses: deduped, programName, instructions };
}

/**
 * What the most recent {@link loadProgramDispatch} could not use. Declared before the
 * loader so this module never reads a binding it initialized after the function that
 * writes it.
 */
let LAST_LOAD = { dropped: [], files: 0 };
export function lastLoadReport() {
  return { ...LAST_LOAD, dropped: [...LAST_LOAD.dropped] };
}

/**
 * Recursively walk a directory, parse every *.json, and build a per-program dispatch
 * table: address → { anchor: Map<hex8, entry>, tag: Map<hexTag, {entry, tagLen}> }.
 *
 * A file that declares no address at any supported location, or that declares
 * instructions but no discriminator of any kind, is dropped — and the reason is recorded
 * in `lastLoadReport().dropped` rather than discarded. Both cases used to be `continue`
 * with no record, which is how an IDL could sit in the tree and bind nothing.
 */
export function loadProgramDispatch(dir) {
  const byProgram = new Map();
  if (!fs.existsSync(dir)) return byProgram;

  const files = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const f of fs.readdirSync(cur)) {
      const full = path.join(cur, f);
      if (fs.statSync(full).isDirectory()) stack.push(full);
      else if (f.endsWith(".json")) files.push(full);
    }
  }

  const ensure = (address) => {
    let p = byProgram.get(address);
    if (!p) {
      p = { anchor: new Map(), tag: new Map(), sources: new Set() };
      byProgram.set(address, p);
    }
    return p;
  };

  const dropped = [];
  for (const file of files) {
    let parsed;
    try {
      parsed = parseIdlJson(file);
    } catch (e) {
      dropped.push(`${path.basename(file)}: ${e.message}`);
      continue;
    }
    if (parsed.addresses.length === 0) {
      dropped.push(`${path.basename(file)}: declares no program address`);
      continue;
    }
    if (parsed.instructions.length === 0) {
      dropped.push(
        `${path.basename(file)}: binds ${parsed.addresses.length} program(s) but declares no usable discriminator`,
      );
      continue;
    }
    for (const address of parsed.addresses) {
      const p = ensure(address);
      p.sources.add(file);
      for (const ix of parsed.instructions) {
        if (ix.scheme === "anchor") p.anchor.set(ix.tag.toString("hex"), ix);
        else p.tag.set(ix.tag.toString("hex"), ix);
      }
    }
  }
  byProgram.dropped = dropped;
  LAST_LOAD = { dropped, files: files.length };
  return byProgram;
}

/**
 * Files in `dir` that parsed but bound nothing.
 *
 * This exists because one did. `bisonfi.json` sat in idl/multi declaring three
 * instructions with explicit discriminants, bound ZERO programs (its address lives under
 * `metadata.address`, which the loader did not read), and every recipe that touched
 * BisonFi printed `(unknown)` for it — while `node ci/acceptance.mjs` printed
 * `ACCEPTANCE PASSED`. Nothing between a shipped IDL and a passing verdict looked at
 * whether the IDL was reachable at all.
 *
 * The failure has no other symptom: an unbound program returns null from the resolver,
 * null renders as `(unknown)`, and `(unknown)` is a legal label. So the check cannot be
 * "the recipe named it" — that is exactly what is broken. It has to ask the loader
 * directly, which is what this does.
 */
export function unusableIdlFiles(dir) {
  loadProgramDispatch(dir);
  return lastLoadReport().dropped;
}

/**
 * Build the nameFor() resolver: (programAddress, data) → { name, tagLen, … } | null.
 * Per-program dispatch, scheme order: exact 8-byte Anchor discriminator first (statistically
 * cannot collide with a short tag because the upper bytes of a sha256 truncation are dense),
 * then the program's own short-tag table (SPL/BGL).
 */
export function makeNameResolver(byProgram, extraByProgram = new Map()) {
  return function nameFor(program, data) {
    const p = byProgram.get(program) ?? extraByProgram.get(program);
    if (!p) {
      // Native Solana programs ship no usable discriminants in bitquery's IDL set:
      // compute-budget declares an empty instruction list, system omits discriminants
      // entirely. Their selector scheme is fixed per program and lives in native.mjs.
      // Tried first because a known-width selector beats an absent table — and because
      // reading either one with the other's width silently decodes nothing.
      return decodeNative(program, data);
    }
    if (data.length >= ANCHOR_DISC_SIZE) {
      const hit = p.anchor.get(data.subarray(0, ANCHOR_DISC_SIZE).toString("hex"));
      if (hit) return { ...hit, tagLen: ANCHOR_DISC_SIZE };
    }
    for (const [hex, v] of p.tag) {
      const tagBuf = Buffer.from(hex, "hex");
      if (tagBuf.length <= data.length && Buffer.compare(data.subarray(0, tagBuf.length), tagBuf) === 0) {
        return { ...v, tagLen: v.tagLen ?? tagBuf.length };
      }
    }
    return decodeNative(program, data) ?? null;
  };
}
