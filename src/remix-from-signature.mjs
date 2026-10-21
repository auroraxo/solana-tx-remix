/**
 * remix-from-signature.mjs — one public signature in, one editable recipe out.
 *
 *   node src/remix-from-signature.mjs <signature> [--idl <dir>] [--out <dir>]
 *
 * No private keys, no wallet, no signing: the transaction is public data, and we treat it
 * as such. The output is a TS file a developer can edit (amounts, slippage, account roles)
 * plus a machine check that the recipe still reproduces the original bytes.
 */
import fs from "node:fs";
import path from "node:path";
import {
  b58decode,
  b58encode,
  fetchTransaction,
  buildRecipe,
  verifyRoundTrip,
  loadIdlFromGenerated,
  renderInnerBytes,
  rpc,
} from "./remix.mjs";
import { decodeArgs, schemaForInstruction } from "./args.mjs";
import { decodeNative } from "./native.mjs";

const args = process.argv.slice(2);
const signature = args.find((a) => !a.startsWith("--"));
if (!signature) {
  console.error("usage: remix-from-signature.mjs <signature> [--idl <dir>] [--out <dir>]");
  process.exit(2);
}
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const WHIRLPOOL_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
// Resolve the Whirlpool-generated codec directory: an explicit --idl wins, then IDL_GEN_DIR
// (the same env var verify-recipe.mjs reads), then a hard-coded sibling-repo path kept for
// the author's local machine. A fresh clone has none of these by default; running with
// the default then crashes with ENOENT, which reads as "the tool is broken on a fresh
// machine". The error message below names IDL_GEN_DIR so the reader can recover.
const idlDir = flag(
  "--idl",
  process.env.IDL_GEN_DIR ||
    path.resolve(process.env.HOME, "github_repos/orca-whirlpools-recon/ts-sdk/client/src/generated/instructions"),
);
const outDir = flag("--out", path.resolve("out"));

if (!fs.existsSync(idlDir)) {
  console.error(`Whirlpool codec directory not found: ${idlDir}`);
  console.error(`Set IDL_GEN_DIR to a directory of Codama-generated <NAME>_DISCRIMINATOR .ts files`);
  console.error(`(e.g. a fork of orca-so/whirlpools ts-sdk/client/src/generated/instructions),`);
  console.error(`or pass --idl <dir>. Multi-program recipes in out/remix-multi-* do not need this.`);
  process.exit(2);
}

const tx = await fetchTransaction(signature);
const idlMap = loadIdlFromGenerated(idlDir);
if (idlMap.size === 0) throw new Error(`no instruction discriminators found in ${idlDir}`);

const programId = flag("--program", WHIRLPOOL_PROGRAM);
const programName = programId === WHIRLPOOL_PROGRAM ? "whirlpool" : programId.slice(0, 8);
// Native programs (ComputeBudget, System) are named too, not just the target program.
// Without this the fee-budget and account-funding instructions came out as "(unknown)"
// while the Whirlpool ones resolved — a transaction whose own accounting instructions are
// unlabelled reads as "nothing else to name", when in fact the names were simply not
// being looked up. buildRecipe's idlMap fallback still handles the Anchor target, so
// passing nameFor here only adds the native scheme.
const recipe = await buildRecipe(tx, idlMap, {
  programId,
  programName,
  nameFor: decodeNative,
});
const roundTrip = verifyRoundTrip(recipe, tx);

// Fetch one piece of real on-chain state so the recipe can describe what the pool is,
// not just what the transaction said.
const poolIx = recipe.instructions.find((i) => i.isTarget && i.name?.includes("SWAP"));
let poolContext = null;
if (poolIx) {
  const poolAddress = poolIx.accountAddresses?.[4] ?? recipe.accountKeys[poolIx.accounts[4]];
  try {
    const acc = await rpc("getAccountInfo", [poolAddress, { encoding: "base64" }]);
    poolContext = {
      address: poolAddress,
      owner: acc?.value?.owner ?? null,
      dataSize: acc?.value?.data?.[0]?.length ? Buffer.from(acc.value.data[0], "base64").length : null,
    };
  } catch (e) {
    poolContext = { address: poolAddress, error: String(e.message) };
  }
}

fs.mkdirSync(outDir, { recursive: true });
const stem = `remix-${recipe.signature.slice(0, 8)}`;
const recipePath = path.join(outDir, `${stem}.ts`);
const jsonPath = path.join(outDir, `${stem}.json`);

/**
 * Read account role names straight from the generated codec's type parameters, so the
 * recipe says "WHIRLPOOL" instead of "account[4]".
 */
function accountRoles(genDir, name) {
  if (!name) return [];
  const camel = name.toLowerCase().replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  const file = path.join(genDir, `${camel}.ts`);
  try {
    const src = fs.readFileSync(file, "utf8");
    const names = [...src.matchAll(/TAccount([A-Za-z0-9]+)\s+extends/g)].map((m) => m[1]);
    return names;
  } catch {
    return [];
  }
}

const lines = [];
lines.push(`/**`);
lines.push(` * Remixed from a public Solana transaction. No private key was used or needed.`);
lines.push(` *`);
lines.push(` * source signature : ${recipe.signature}`);
lines.push(` * slot / blockTime : ${recipe.slot} / ${new Date(recipe.blockTime * 1000).toISOString()}`);
lines.push(` * message version  : ${recipe.version}`);
lines.push(` * fee payer        : ${recipe.feePayer}`);
if (poolContext?.address) {
  lines.push(` * pool account     : ${poolContext.address}${poolContext.dataSize ? ` (${poolContext.dataSize} bytes, owner ${poolContext.owner})` : ""}`);
}
lines.push(` *`);
lines.push(` * This file is generated, then meant to be edited. Verification:`);
lines.push(` *   node src/verify-recipe.mjs out/${stem}.ts`);
lines.push(` * verifies the encoded bytes still match the chain byte for byte.`);
lines.push(` */`);
lines.push(``);

// ---- Parameters: named, editable fields decoded with the program's own generated codecs.
lines.push(`// ------------------------------------------------------------- editable parameters`);
for (const ix of recipe.instructions) {
  if (!ix.isTarget || !ix.name) continue;
  const schema = schemaForInstruction(idlDir, ix.name);
  const decoded = decodeArgs(schema, ix.args);
  lines.push(``);
  lines.push(`/** ix ${ix.index}: ${ix.name} — ${ix.accountCount} accounts */`);
  for (const [k, v] of Object.entries(decoded)) {
    if (k.startsWith("__")) continue;
    if (v !== null && typeof v === "object") {
      lines.push(`export const IX${ix.index}_${ix.name}_${k.toUpperCase()} = ${JSON.stringify(v)}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing`);
    } else if (typeof v === "boolean") {
      lines.push(`export const IX${ix.index}_${ix.name}_${k.toUpperCase()} = ${v};`);
    } else if (typeof v === "string" && /^\d+$/.test(v)) {
      lines.push(`export const IX${ix.index}_${ix.name}_${k.toUpperCase()} = ${v}n; // ${k}`);
    } else if (v === null) {
      lines.push(`export const IX${ix.index}_${ix.name}_${k.toUpperCase()} = null;`);
    } else {
      lines.push(`export const IX${ix.index}_${ix.name}_${k.toUpperCase()} = ${JSON.stringify(v)};`);
    }
  }
  // Account roles: resolve each static index to a real address, named from the IDL type.
  const roles = accountRoles(idlDir, ix.name);
  ix.accounts.forEach((a, n) => {
    const addr = (ix.accountAddresses?.[n] ?? recipe.accountKeys[a] ?? `UNRESOLVED[${a}]`);
    const role = roles[n] ? roles[n].toUpperCase() : `ACCOUNT_${n}`;
    const writable = ix.accountsWritable?.[n] ? "w" : "r";
    lines.push(`export const IX${ix.index}_${role.padEnd(28)} = ${JSON.stringify(addr)}; // [${n}] ${writable}`);
  });
  lines.push(`export const IX${ix.index}_PROGRAM = ${JSON.stringify(ix.program)};`);
}

lines.push(``);
lines.push(`// ---------------------------------------------------------------- transaction`);
lines.push(``);
lines.push(`export const SOURCE_SIGNATURE = "${recipe.signature}";`);
lines.push(`export const SOURCE_SLOT = ${recipe.slot};`);
lines.push(`export const FEE_PAYER = "${recipe.feePayer}";`);
lines.push(`export const RECIPE_VERSION = "${recipe.version}";`);
lines.push(``);
lines.push(`/** ${recipe.accountKeys.length} static account keys, in message order. */`);
lines.push(`export const ACCOUNTS = [`);
recipe.accountKeys.forEach((a, i) => lines.push(`  ${JSON.stringify(a)}, // [${i}]`));
lines.push(`] as const;`);
lines.push(``);
lines.push(`/**`);
lines.push(` * Flat address space: static keys, then each lookup table's writable entries, then`);
lines.push(` * its readonly entries. Instruction account indexes address this array, which is why`);
lines.push(` * ${recipe.version === "v0" ? "this transaction" : "a legacy transaction"} needs the table contents.`);
lines.push(` */`);
lines.push(`export const LOOKUP_TABLE_ADDRESSES = [`);
// Flat runtime order: all tables' writable addresses, then all tables' readonly.
// This must mirror buildRecipe's addressSpace or every index past table 0 misresolves.
recipe.lookupTables.forEach((t, ti) => {
  if (!t.resolved) {
    lines.push(`  /* table ${ti} ${t.table ?? "unknown"}: NOT RESOLVED — indexes past the static keys cannot be verified */`);
    return;
  }
  t.loadedWritable.forEach((a, i) => lines.push(`  ${JSON.stringify(a)}, // table ${ti} writable[${i}]`));
});
recipe.lookupTables.forEach((t, ti) => {
  if (!t.resolved) return;
  t.loadedReadonly.forEach((a, i) => lines.push(`  ${JSON.stringify(a)}, // table ${ti} readonly[${i}]`));
});
lines.push(`] as const;`);
lines.push(``);
lines.push(`export const ADDRESS_SPACE_SIZE = ${recipe.addressSpaceSize};`);
lines.push(``);
lines.push(`export const INSTRUCTION_BYTES = {`);
recipe.instructions.forEach((ix) => {
  const data = Buffer.concat([Buffer.from(ix.discriminator, "hex"), ix.args]);
  lines.push(`  /** ${ix.name ?? "(unknown)"} */`);
  lines.push(`  ${ix.index}: {`);
  lines.push(`    program: ${JSON.stringify(ix.program)},`);
  lines.push(`    accounts: [${ix.accounts.join(", ")}],`);
  lines.push(`    data: "${data.toString("base64")}",`);
  lines.push(`  },`);
});
lines.push(`} as const;`);
lines.push(``);
lines.push(...renderInnerBytes(recipe));
lines.push(`/** Flat address space: static keys, then each table's writable, then readonly entries. */`);
lines.push(`const ADDRESSES = [...ACCOUNTS, ...LOOKUP_TABLE_ADDRESSES] as const;`);
lines.push(``);
lines.push(`/**`);
lines.push(` * Reassemble the message the original transaction carried.`);
lines.push(` *`);
lines.push(` * Instruction account indexes address the FLAT address space, not ACCOUNTS alone, so`);
lines.push(` * a v0 recipe would silently reference undefined accounts if it used ACCOUNTS directly.`);
lines.push(` * That exact bug is what ADDRESS_SPACE_SIZE and the verifier exist to prevent.`);
lines.push(` */`);
lines.push(`export function buildRemixedTransaction() {`);
lines.push(`  let message = setTransactionMessageFeePayer(createTransactionMessage({ version: "${recipe.version}" }), FEE_PAYER as any);`);
lines.push(`  for (const key of Object.keys(INSTRUCTION_BYTES)) {`);
lines.push(`    const ix = INSTRUCTION_BYTES[key as keyof typeof INSTRUCTION_BYTES];`);
lines.push(`    for (const index of ix.accounts) {`);
lines.push(`      if (index >= ADDRESS_SPACE_SIZE) {`);
lines.push(`        throw new Error(\`instruction \${key} references address index \${index}, beyond the resolved address space \${ADDRESS_SPACE_SIZE}\`);`);
lines.push(`      }`);
lines.push(`    }`);
lines.push(`    message = appendTransactionMessageInstruction(message, {`);
lines.push(`      programAddress: ix.program,`);
lines.push(`      accounts: ix.accounts.map((i) => ({ address: ADDRESSES[i], role: 0 as any })),`);
lines.push(`      data: Uint8Array.from(atob(ix.data), (c) => c.charCodeAt(0)),`);
lines.push(`    } as any);`);
lines.push(`  }`);
lines.push(`  return message;`);
lines.push(`}`);

fs.writeFileSync(recipePath, lines.join("\n") + "\n");

const jsonOut = {
  signature: recipe.signature,
  slot: recipe.slot,
  blockTime: recipe.blockTime,
  program: { id: programId, name: recipe.programName },
  poolContext,
  roundTrip,
  accountKeys: recipe.accountKeys,
  addressSpaceSize: recipe.addressSpaceSize,
  version: recipe.version,
  lookupTables: recipe.lookupTables.map((t) => ({
    table: t.table,
    resolved: t.resolved,
    loadedWritable: t.loadedWritable.length,
    loadedReadonly: t.loadedReadonly.length,
  })),
  instructions: recipe.instructions.map((ix) => ({
    index: ix.index,
    isTarget: ix.isTarget,
    name: ix.name,
    discriminator: ix.discriminator,
    argBytes: ix.args.length,
    accounts: ix.accounts.length,
    accountsResolved: ix.accountAddresses ?? [],
    unresolvedAccounts: ix.unresolvedAccounts,
    inner: (ix.inner ?? []).map((inn) => ({
      program: inn.program,
      isTarget: inn.isTarget,
      name: inn.name,
      discriminator: inn.discriminator,
      argBytes: inn.args.length,
      accountCount: inn.accountCount,
      accountsResolved: inn.accountAddresses,
      unresolved: inn.unresolvedAccounts,
    })),
  })),
};
fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2) + "\n");

const named = recipe.instructions.filter((i) => i.name).length;
const targetIxs = recipe.instructions.filter((i) => i.isTarget).length;
const innerAll = recipe.instructions.flatMap((i) => i.inner ?? []);
const innerTarget = innerAll.filter((i) => i.isTarget).length;
console.log(`signature   : ${recipe.signature}`);
console.log(`slot/time   : ${recipe.slot} / ${new Date(recipe.blockTime * 1000).toISOString()}`);
console.log(`version     : ${recipe.version}, ${recipe.accountKeys.length} static accounts`);
console.log(`instructions: ${recipe.instructions.length} total, ${targetIxs} on ${recipe.programName}`);
console.log(`decoded     : ${named}/${recipe.instructions.length} recognized from IDL discriminators`);
if (innerAll.length) {
  console.log(`inner       : ${innerAll.length} CPI instructions, ${innerTarget} on ${recipe.programName}`);
  innerAll.filter((i) => i.isTarget).slice(0, 6).forEach((i) => {
    console.log(`   ↳ ${i.name ?? `disc=${i.discriminator}`} args=${i.args.length}B accounts=${i.accountCount}`);
  });
}
console.log(`round-trip  : ${roundTrip.ok ? "BYTE-IDENTICAL (all accounts + args)" : "MISMATCH"}`);
if (!roundTrip.ok) {
  roundTrip.report.filter((r) => !(r.discriminatorMatches && r.argBytesMatch && r.accountsMatch))
    .forEach((r) => console.log(`   ix ${r.index}: disc=${r.discriminatorMatches} args=${r.argBytesMatch} accounts=${r.accountsMatch}`));
}
recipe.instructions.filter((i) => i.isTarget).forEach((i) => {
  console.log(`   [${i.index}] ${i.name ?? "?"} args=${i.args.length}B accounts=${i.accountCount}`);
});
console.log(`wrote       : ${recipePath}`);
console.log(`wrote       : ${jsonPath}`);
process.exit(roundTrip.ok ? 0 : 1);