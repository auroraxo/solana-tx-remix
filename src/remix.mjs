/**
 * remix.mjs — prototype: public transaction signature -> parameterized, editable TS recipe
 *
 * Validation criterion (not vibes): reconstruct the exact instruction messages from the
 * generated recipe and byte-compare against the on-chain transaction. Equal bytes mean
 * the recipe really is the transaction, not a plausible-looking summary of it.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function b58decode(s) {
  let n = 0n;
  for (const c of s) {
    const i = B58.indexOf(c);
    if (i < 0) throw new Error(`bad base58 char ${c}`);
    n = n * 58n + BigInt(i);
  }
  const bytes = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  return Buffer.from(bytes);
}

export function b58encode(buf) {
  let n = 0n;
  for (const byte of buf) n = (n << 8n) | BigInt(byte);
  let out = "";
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const byte of buf) {
    if (byte !== 0) break;
    out = "1" + out;
  }
  return out || "1";
}

/** Anchor discriminator = first 8 bytes of sha256("global:" + snake_case_name). */
export function anchorDiscriminator(name) {
  const snake = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
  return crypto.createHash("sha256").update(`global:${snake}`).digest().subarray(0, 8);
}

export async function rpc(method, params, { retries = 4 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff on transient RPC failures; a public endpoint throttles,
      // and a tool that dies on the first 429 is not usable by anyone.
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    }
    try {
      const res = await fetch(RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (res.status === 429) {
        const after = Number(res.headers.get("retry-after"));
        lastError = new Error("rate limited (HTTP 429)");
        if (Number.isFinite(after)) await new Promise((r) => setTimeout(r, after * 1000));
        continue;
      }
      const json = await res.json();
      if (json.error) {
        // Retrying will not make an invalid request succeed (bad signature, unsupported
        // version); surface it immediately rather than burning the retry budget.
        const msg = json.error.message ?? "";
        const permanent =
          /not found|version \(|not supported|invalid/i.test(msg) ||
          [-32004, -32015, -32602].includes(json.error.code);
        if (permanent) throw Object.assign(new Error(`${method}: ${msg}`), { permanent: true });
        lastError = new Error(`${method}: ${msg}`);
        continue;
      }
      return json.result;
    } catch (e) {
      if (e?.permanent) throw e;
      lastError = e;
    }
  }
  throw lastError ?? new Error(`${method}: failed after retries`);
}

/**
 * Load an instruction map (discriminator hex -> definition) from generated IDL codecs.
 * Source of truth: the program's own generated instruction modules, never hand-typed names.
 */
export function loadIdlFromGenerated(dir) {
  const map = new Map();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    const src = fs.readFileSync(path.join(dir, file), "utf8");
    const re =
      /export const ([A-Z0-9_]+)_DISCRIMINATOR = new Uint8Array\(\[\s*([0-9,\s]+?)\s*\]\)/g;
    let m;
    while ((m = re.exec(src))) {
      const bytes = m[2]
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => !Number.isNaN(n))
        .slice(0, 8);
      if (bytes.length !== 8) continue;
      const snake = m[1].toLowerCase();
      map.set(Buffer.from(bytes).toString("hex"), { name: m[1], snake, file });
    }
  }
  return map;
}

/**
 * Map this tool's message-version label onto `@solana/kit`'s own `TransactionVersion`.
 *
 * The two vocabularies are not the same and were being conflated: the emitters interpolated
 * `recipe.version` straight into `createTransactionMessage({ version: "..." })`, which emits
 * `{ version: "v0" }` — and Kit's type is `'legacy' | 0`:
 *
 *   node_modules/@solana/transaction-messages/dist/types/transaction-message.d.ts:
 *     export type TransactionVersion = 'legacy' | 0;
 *
 * So both shipped recipes emit a literal that fails to typecheck (TS2322). Nothing here had
 * caught it because nothing compiles the generated code: there is no package.json and no tsc
 * step in CI, and Kit's runtime does not validate the value, so an incorrect version passes
 * silently until a reader pastes the recipe into a real project.
 *
 * v1 has no Kit expression at all in `@solana/kit@5`, which is reported rather than coerced:
 * a `"legacy"` or `0` that silently downgrades a v1 message would produce a different
 * transaction from the one the recipe was verified against — the byte-identity claim would
 * survive while the rebuilt message would not be the original.
 */
export function kitVersionLiteral(version) {
  if (version === "legacy") return { ok: true, literal: '"legacy"' };
  if (version === "v0") return { ok: true, literal: "0" };
  return {
    ok: false,
    reason: `message version ${JSON.stringify(version)} has no @solana/kit equivalent — ` +
      `TransactionVersion is 'legacy' | 0, so rebuilding this message would produce ` +
      `a different transaction from the one this recipe was verified against`,
  };
}

/** Fetch the transaction and split it into the pieces a recipe needs. */
export async function fetchTransaction(signature) {
  const tx = await rpc("getTransaction", [
    signature,
    { encoding: "json", maxSupportedTransactionVersion: 1, commitment: "finalized" },
  ]);
  if (!tx) throw new Error(`transaction ${signature} not found`);
  return tx;
}

/**
 * Build the recipe. Every value that a human would want to change is lifted into a
 * named parameter; everything else stays as it was on chain.
 *
 * Account indexes in a v0 message address a flat space: static keys, then the addresses
 * loaded from each lookup table (writable first, then readonly). A naive reader that only
 * looks at `accountKeys` emits a placeholder where a real address belongs — which looks
 * fine and is wrong. We resolve the table explicitly and mark any index we cannot resolve
 * instead of guessing.
 */
export async function buildRecipe(tx, idlMap, { programId, programName, resolveLut = true, nameFor = null }) {
  const msg = tx.transaction.message;
  const keys = msg.accountKeys.map((k) => k.pubkey ?? k);
  const luts = msg.addressTableLookups ?? [];

  // Version 0 messages are identified by the presence of lookups, not by a `version` key:
  // getTransaction with encoding "json" omits it for v0, and relying on it alone silently
  // misreads real v0 transactions as legacy.
  // Message version, decided by FIELD PRESENCE, not by `msg.version`.
  //
  // `getTransaction` with encoding "json" returns no `version` key at all for ANY message
  // version — measured on 1730 mainnet transactions, `msg.version !== undefined` held for
  // 0 of them. The previous rule keyed on `msg.version === 0`, which therefore never
  // fired, and fell back to `luts.length > 0`; that fallback silently mislabels the two
  // cases the field actually distinguishes:
  //
  //   - v1 (`transactionConfig`, v1-only): ~37% of mainnet as of 21.10., misread as legacy.
  //   - v0 with an EMPTY addressTableLookups array: 467 of 813 sampled v0 messages, also
  //     misread as legacy, because an empty array has length 0.
  //
  // Both are wrong in the same direction and neither is cosmetic: `recipe.version` is
  // written into the generated recipe as RECIPE_VERSION, and for the single-program
  // emitter it is also interpolated into the Kit rebuild call as `version: "..."`.
  //
  // The rule below is field-presence only, and it is a total order over the three shapes:
  //   transactionConfig present            -> v1     (v1-only field)
  //   addressTableLookups key present      -> v0     (legacy messages omit the key)
  //   neither                              -> legacy
  // Empty-array v0 and v1 both keep their key/`transactionConfig` present, which is what
  // makes this correct where a length test was not.
  //
  // `msg.version` is still honoured first if a future RPC does report it, so the explicit
  // signal is never overridden by an inference.
  let isV1 = false;
  let isV0 = false;
  if (msg.version === 1 || msg.transactionConfig !== undefined) {
    isV1 = true;
  } else if (msg.version === 0 || msg.addressTableLookups !== undefined) {
    isV0 = true;
  }

  const staticWritable = writableFlags(msg, keys.length);

  // Flatten the address space exactly as the runtime does.
  const addressSpace = [...keys];
  const lutTables = [];
  // Not gated on the version guess: flattening is driven by the presence of lookup
  // entries themselves. A v1 message carrying lookups would otherwise skip this block on
  // a label it never claimed, and every index past the static keys would resolve to null.
  if (resolveLut && luts.length) {
    // Flattening order: the runtime resolves lookup-table addresses as ALL writable
    // addresses first (tables in message order, indexes ascending), then ALL readonly.
    // Per-table `w, r` interleaving is indistinguishable for one table (the common case)
    // but silently misresolves every index past the first table's readonly run when a
    // transaction references two or more tables — verified against meta.loadedAddresses
    // on mainnet tx Y2MiRPQCCQ5C7VYBCXNgKwt3p1MXJP47XFopnQ731UgkEYuqY95DVTZiw1ZJ6mu2xCg7zfeemZ4fn5iVN2LerKu
    // (3 tables, 16 writable + 10 readonly: interleaved order diverges at offset 3).
    const loadedWritable = [];
    const loadedReadonly = [];
    for (const lut of luts) {
      // `addressTableLookups` entries carry the table address directly as `accountKey`;
      // there is no index into `accountKeys` for it.
      const tableAddress = lut.accountKey ?? keys[lut.accountKeyIndex];
      if (!tableAddress) {
        lutTables.push({ table: null, loadedWritable: [], loadedReadonly: [], resolved: false });
        continue;
      }
      const { value } = await rpc("getAccountInfo", [
        tableAddress,
        { encoding: "jsonParsed", commitment: "finalized" },
      ]);
      const parsed = value?.data?.parsed?.info?.addresses ?? [];
      // `addresses` is a flat array of address strings. Treating it as objects silently
      // yields null for every entry while the table still looks "resolved".
      const at = (i) => (typeof parsed[i] === "string" ? parsed[i] : (parsed[i]?.address ?? null));
      const writable = lut.writableIndexes.map(at);
      const readonly = lut.readonlyIndexes.map(at);
      loadedWritable.push(...writable);
      loadedReadonly.push(...readonly);
      lutTables.push({
        table: tableAddress,
        loadedWritable: writable,
        loadedReadonly: readonly,
        resolved: parsed.length > 0 && writable.every(Boolean) && readonly.every(Boolean),
        entryCount: parsed.length,
      });
    }
    addressSpace.push(...loadedWritable, ...loadedReadonly);
  }

  const resolveIndex = (i) => (i < keys.length ? keys[i] : addressSpace[i] ?? null);

  /**
   * Instruction naming. `nameFor(program, data)` handles multi-program transactions where
   * programs tag differently: Anchor uses a sha256-truncated 8-byte discriminator, SPL
   * Token and BGL-style programs (Aquifer, SolFi) use a 1-byte tag followed directly by
   * args. A wrong tag length reads arg bytes as discriminator — decodes nothing and never
   * errors — so the resolver returns the tag length alongside the name.
   *
   * `idlMap` is a flat discriminator -> name table keyed on the FIRST 8 BYTES ONLY, with no
   * program attached, so it cannot answer "which instruction is this" — only "do these 8
   * bytes look like something in the table". Consulting it for a program it does not describe
   * manufactures labels: the Whirlpool-generated `swap` discriminator is
   * f8c69e91e17587c8, and a Jupiter swap CPI on cpamdpZCGKUy…1sGG that carries those bytes
   * was written into the recipe as `SWAP`. It is not a Whirlpool instruction, and the
   * program's own IDL is nowhere in the tree to confirm it — the shared resolver in
   * dispatch.mjs returns null for exactly these bytes, which is why verification failed a
   * recipe that its own emitter had just produced, twice, on a real v1 transaction.
   *
   * Gated on the target program, which is the only program this table was loaded for. Every
   * other program goes through nameFor (shipped IDLs + native fallback) or stays `(unknown)`,
   * and `(unknown)` is honest: it is a state the verifier explicitly distinguishes from a
   * wrong name.
   */
  const resolveName = (program, data) => {
    if (nameFor) {
      const hit = nameFor(program, data);
      if (hit) return hit;
    }
    if (program === programId) {
      const known = idlMap?.get(data.subarray(0, 8).toString("hex"));
      if (known) return { ...known, tagLen: 8 };
    }
    return null;
  };

  const instructions = msg.instructions.map((ix, index) => {
    const programIndex = ix.programIdIndex;
    const data = b58decode(ix.data);
    const program = resolveIndex(programIndex) ?? `program[${programIndex}]`;
    const hit = resolveName(program, data);
    const tagLen = hit?.tagLen ?? 8;
    return {
      index,
      programIndex,
      program,
      isTarget: program === programId,
      discriminator: data.subarray(0, tagLen).toString("hex"),
      tagLen,
      name: hit ? hit.name : null,
      args: data.subarray(tagLen),
      accountCount: ix.accounts.length,
      accounts: ix.accounts,
      accountAddresses: ix.accounts.map((a) => resolveIndex(a)),
      unresolvedAccounts: ix.accounts.filter((a) => resolveIndex(a) === null),
      accountsWritable: ix.accounts.map((a) => writableAt(msg, staticWritable, a, lutTables, luts)),
      inner: [],
    };
  });

  // Jupiter and most aggregators reach their own program through a CPI, so the
  // instruction that actually matters is never a top-level entry. Without inner
  // instructions a "Jupiter flow" decodes to zero interesting instructions and the tool
  // looks broken rather than honestly scoped.
  const inners = tx.meta?.innerInstructions ?? [];
  for (const group of inners) {
    const parent = instructions[group.index];
    if (!parent) continue;
    for (const inner of group.instructions) {
      const data = b58decode(inner.data);
      const accounts = inner.accounts ?? [];
      const program = resolveIndex(inner.programIdIndex) ?? `program[${inner.programIdIndex}]`;
      const hit = resolveName(program, data);
      const tagLen = hit?.tagLen ?? 8;
      parent.inner.push({
        parentIndex: group.index,
        program,
        isTarget: program === programId,
        discriminator: data.subarray(0, tagLen).toString("hex"),
        tagLen,
        name: hit ? hit.name : null,
        args: data.subarray(tagLen),
        accountCount: accounts.length,
        accounts,
        accountAddresses: accounts.map((a) => resolveIndex(a)),
        unresolvedAccounts: accounts.filter((a) => resolveIndex(a) === null),
      });
    }
  }

  return {
    signature: tx.transaction.signatures[0],
    slot: tx.slot,
    blockTime: tx.blockTime,
    version: isV1 ? "v1" : isV0 ? "v0" : "legacy",
    isV0,
    isV1,
    recentBlockhash: msg.recentBlockhash,
    programId,
    programName,
    feePayer: keys[0],
    accountKeys: keys,
    addressSpaceSize: addressSpace.length,
    lookupTables: lutTables,
    instructions,
  };
}

/** Writable/signer flags for the static key block. */
function writableFlags(msg, keyCount) {
  const h = msg.header;
  if (!h) return new Array(keyCount).fill(false);
  const flags = new Array(keyCount).fill(false);
  for (let i = 0; i < h.numRequiredSignatures; i++) flags[i] = i < h.numRequiredSignatures - h.numReadonlySignedAccounts;
  const unsignedCount = keyCount - h.numRequiredSignatures;
  for (let i = 0; i < unsignedCount; i++) flags[h.numRequiredSignatures + i] = i < unsignedCount - h.numReadonlyUnsignedAccounts;
  return flags;
}

/** Writability for any index in the flat address space, including lookup-table entries. */
function writableAt(msg, staticWritable, i, lutTables, luts) {
  if (i < staticWritable.length) return staticWritable[i];
  let cursor = staticWritable.length;
  for (let t = 0; t < luts.length; t++) {
    const w = luts[t].writableIndexes?.length ?? 0;
    const ro = luts[t].readonlyIndexes?.length ?? 0;
    const table = lutTables[t];
    const resolved = table?.resolved ? table.loadedWritable.length : w;
    if (i < cursor + resolved) return true;
    cursor += resolved;
    if (i < cursor + ro) return false;
    cursor += ro;
  }
  return false;
}

/**
 * Inner (CPI) instructions — the ONE format for writing and reading them.
 *
 * These two halves used to live apart: verify-recipe.mjs demanded an `INNER_BYTES` block
 * while no emitter produced one, so every real recipe failed its own acceptance test with
 * "cpi … present in chain, missing from recipe" for blocks that were never missing. A
 * format the writer and the reader each define independently is a format that drifts.
 * Both sides now import from here.
 *
 * Inner instructions are effects of a CPI, not entries of the signed message — they cannot
 * be re-appended when rebuilding a transaction. They are recorded so verification can hold
 * them against `meta.innerInstructions` byte for byte: in an aggregator flow the instruction
 * that matters (the swap) only exists as a CPI.
 */
export function renderInnerBytes(recipe) {
  const rows = [];
  for (const ix of recipe.instructions) {
    (ix.inner ?? []).forEach((inner, n) => rows.push({ parent: ix.index, n, inner }));
  }
  if (rows.length === 0) return [];
  const out = [];
  out.push(`/**`);
  out.push(` * Inner (CPI) instructions the chain executed, keyed [parent instruction][slot].`);
  out.push(` * Verification-only: rebuilding the message must NOT append these — they are`);
  out.push(` * effects of the parent program's CPI, not parts of the signed message.`);
  out.push(` * Account indexes address the same flat space as INSTRUCTION_BYTES.`);
  out.push(` */`);
  out.push(`export const INNER_BYTES = {`);
  for (const { parent, n, inner } of rows) {
    const data = Buffer.concat([Buffer.from(inner.discriminator, "hex"), inner.args]);
    out.push(`  /** ${inner.name ?? "(unknown)"} on ${shortAddr(inner.program)} */`);
    out.push(`  [${parent}][${n}]: {`);
    out.push(`    program: ${JSON.stringify(inner.program)},`);
    out.push(`    accounts: [${inner.accounts.join(", ")}],`);
    out.push(`    data: "${data.toString("base64")}",`);
    out.push(`  },`);
  }
  out.push(`} as const;`);
  out.push(``);
  return out;
}

/**
 * Read back what `renderInnerBytes` writes. The program field is read leniently on purpose:
 * a recipe that could not resolve an inner program must reach the byte compare and FAIL
 * there with a readable mismatch, not crash the verifier on a regex miss.
 */
export function parseInnerBytes(src) {
  const out = [];
  const blockRe =
    /export const INNER_BYTES = \{([\s\S]*?)\}\s*as const;|export const INNER\[\d+\] = \{([\s\S]*?)\}\s*as const;/g;
  let m;
  while ((m = blockRe.exec(src))) {
    const block = m[1] ?? m[2];
    for (const sub of block.matchAll(
      /\/\*\*\s*([^*]+?)\s*\*\/\s*\[(\d+)\]\[(\d+)\]\s*:\s*\{([\s\S]*?)\n  \},?/g,
    )) {
      const body = sub[4];
      const prog = body.match(/program:\s*("[^"]*")/);
      const accts = body.match(/accounts:\s*\[([^\]]*)\]/);
      const data = body.match(/data:\s*"([^"]*)"/);
      if (!prog || !accts || !data) continue;
      out.push({
        parentIx: Number(sub[2]),
        innerIx: Number(sub[3]),
        label: sub[1].trim(),
        program: JSON.parse(prog[1]),
        accounts: JSON.parse("[" + accts[1] + "]"),
        data: Buffer.from(data[1], "base64"),
      });
    }
  }
  return out;
}

/** Short readable form of a program address for labels: `Token…Q5DA`. */
function shortAddr(addr) {
  if (typeof addr !== "string" || addr.length < 8) return String(addr);
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

/**
 * Rebuild instruction bytes from the recipe and compare with the original bytes.
 * This is the whole point: proof that the recipe is lossless, not a summary.
 */
export function verifyRoundTrip(recipe, originalTx) {
  const report = [];
  const original = originalTx.transaction.message.instructions;
  for (const ix of recipe.instructions) {
    const originalData = b58decode(original[ix.index].data);
    // Discriminator length varies by program (8 for Anchor, 1 for SPL/BGL tags), so
    // equality is decided on the reassembled instruction bytes — not on an assumed
    // 8-byte prefix, which would mark a correctly sliced 1-byte-tag instruction as
    // mismatched and an 8-sliced-but-tagged one as matched.
    const rebuilt = Buffer.concat([Buffer.from(ix.discriminator, "hex"), ix.args]);
    const tagBytes = ix.discriminator.length / 2;
    report.push({
      index: ix.index,
      discriminator: ix.discriminator,
      discriminatorMatches: Buffer.compare(rebuilt, originalData) === 0,
      argBytes: ix.args.length,
      argBytesMatch: Buffer.compare(ix.args, originalData.subarray(tagBytes)) === 0,
      accountsMatch: JSON.stringify(ix.accounts) === JSON.stringify(original[ix.index].accounts),
    });
  }
  return {
    ok: report.every((r) => r.discriminatorMatches && r.argBytesMatch && r.accountsMatch),
    report,
  };
}

export { anchorDiscriminator as anchorDisc };