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

const ANCHOR_DISC_SIZE = 8;

/**
 * bitquery's `spl_token_2022.json` (and its classic-token siblings) ship without an
 * `address` field. The instruction numbering of the original SPL Token instructions is
 * preserved verbatim by Token-2022 (it is a strict superset), so binding that single
 * IDL to both program addresses is accurate for every tag it declares — including
 * transfer=3, transferChecked=12, mintTo=7, burn=8 used in real transactions today.
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
  // bitquery's per-program files for these ship without `address`; the program IDs are
  // public constants (also listed in solana-foundation/solana-com slot200 and
  // DefiLlama adapters), verified executable on mainnet at the time of wiring.
  Aquifer: ["AQU1FRd7papthgdrwPTTq5JacJh8YtwEXaBfKU3bTz45"],
  aquifer: ["AQU1FRd7papthgdrwPTTq5JacJh8YtwEXaBfKU3bTz45"],
  Solfi: ["SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe"],
  solfi: ["SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe"],
};

/** Parse one bitquery IDL JSON into { addresses, instructions:[{name, scheme, tag, entry}] }. */
export function parseIdlJson(file) {
  const raw = fs.readFileSync(file, "utf8");
  const j = JSON.parse(raw);
  const programName = j.name ?? j.metadata?.name ?? path.basename(file, ".json");

  const addresses = [];
  if (typeof j.address === "string" && j.address) addresses.push(j.address);
  for (const alias of PROGRAM_NAME_ALIASES[programName] ?? []) addresses.push(alias);

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
  return { addresses, programName, instructions };
}

/**
 * Recursively walk a directory, parse every *.json, and build a per-program dispatch
 * table: address → { anchor: Map<hex8, entry>, tag: Map<hexTag, {entry, tagLen}> }.
 *
 * Programs whose IDL declares no address are silently dropped here; callers that need
 * them must extend PROGRAM_NAME_ALIASES with a verified address.
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

  for (const file of files) {
    let parsed;
    try {
      parsed = parseIdlJson(file);
    } catch (e) {
      continue;
    }
    if (parsed.addresses.length === 0) continue;
    for (const address of parsed.addresses) {
      const p = ensure(address);
      p.sources.add(file);
      for (const ix of parsed.instructions) {
        if (ix.scheme === "anchor") p.anchor.set(ix.tag.toString("hex"), ix);
        else p.tag.set(ix.tag.toString("hex"), ix);
      }
    }
  }
  return byProgram;
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
    if (!p) return null;
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
    return null;
  };
}
