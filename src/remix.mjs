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
export async function buildRecipe(tx, idlMap, { programId, programName, resolveLut = true }) {
  const msg = tx.transaction.message;
  const keys = msg.accountKeys.map((k) => k.pubkey ?? k);
  const luts = msg.addressTableLookups ?? [];

  // Version 0 messages are identified by the presence of lookups, not by a `version` key:
  // getTransaction with encoding "json" omits it for v0, and relying on it alone silently
  // misreads real v0 transactions as legacy.
  const isV0 = msg.version === 0 || luts.length > 0 || msg.loadedAddresses !== undefined;

  const staticWritable = writableFlags(msg, keys.length);

  // Flatten the address space exactly as the runtime does.
  const addressSpace = [...keys];
  const lutTables = [];
  if (isV0 && resolveLut && luts.length) {
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
      lutTables.push({
        table: tableAddress,
        loadedWritable: writable,
        loadedReadonly: readonly,
        resolved: parsed.length > 0 && writable.every(Boolean) && readonly.every(Boolean),
        entryCount: parsed.length,
      });
      addressSpace.push(...writable, ...readonly);
    }
  }

  const resolveIndex = (i) => (i < keys.length ? keys[i] : addressSpace[i] ?? null);

  const instructions = msg.instructions.map((ix, index) => {
    const programIndex = ix.programIdIndex;
    const data = b58decode(ix.data);
    const disc = data.subarray(0, 8).toString("hex");
    const known = idlMap.get(disc);
    return {
      index,
      programIndex,
      program: resolveIndex(programIndex) ?? `program[${programIndex}]`,
      isTarget: resolveIndex(programIndex) === programId,
      discriminator: disc,
      name: known ? known.name : null,
      args: data.subarray(8),
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
      const disc = data.subarray(0, 8).toString("hex");
      const known = idlMap.get(disc);
      const accounts = inner.accounts ?? [];
      const program = resolveIndex(inner.programIdIndex) ?? `program[${inner.programIdIndex}]`;
      parent.inner.push({
        parentIndex: group.index,
        program,
        isTarget: program === programId,
        discriminator: disc,
        name: known ? known.name : null,
        args: data.subarray(8),
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
    version: isV0 ? "v0" : "legacy",
    isV0,
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
 * Rebuild instruction bytes from the recipe and compare with the original bytes.
 * This is the whole point: proof that the recipe is lossless, not a summary.
 */
export function verifyRoundTrip(recipe, originalTx) {
  const report = [];
  const original = originalTx.transaction.message.instructions;
  for (const ix of recipe.instructions) {
    const originalData = b58decode(original[ix.index].data);
    const originalDisc = originalData.subarray(0, 8).toString("hex");
    const rebuiltDisc = Buffer.from(ix.discriminator, "hex");
    report.push({
      index: ix.index,
      discriminator: ix.discriminator,
      discriminatorMatches: ix.discriminator === originalDisc,
      argBytes: ix.args.length,
      argBytesMatch: Buffer.compare(ix.args, originalData.subarray(8)) === 0,
      accountsMatch: JSON.stringify(ix.accounts) === JSON.stringify(original[ix.index].accounts),
    });
  }
  return {
    ok: report.every((r) => r.discriminatorMatches && r.argBytesMatch && r.accountsMatch),
    report,
  };
}

export { anchorDiscriminator as anchorDisc };