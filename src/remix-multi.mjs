/**
 * remix-multi.mjs — multi-program transaction remix.
 *
 * The single-program entry (`remix-from-signature.mjs`) hard-codes one IDL directory and
 * one target program, which works for a one-program instruction like a Whirlpool swap but
 * reports zero decodes for any transaction that goes through 3-5 programs (an aggregator
 * calling a swap that needs to token-transfer in two legs) — the common shape on Solana.
 *
 * This entry collects every program address the message references, walks a directory of
 * bitquery-formatted IDLs (.json) and a directory of Codama-generated IDL (.ts) and
 * dispatches each instruction to the right IDL on the fly. Discriminator tag lengths
 * are per-program: 8 for Anchor (.ts), 1 for many SPL/BGL-style IDLs (.json).
 *
 *   node src/remix-multi.mjs <signature> --multi-idl <dir> [--gen-idl <dir>] [--out <dir>]
 *
 * No private key, no wallet, no signing: same contract as the single-program path.
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
import { loadProgramDispatch, makeNameResolver, parseIdlJson } from "./idl-bitquery.mjs";
import { buildMultiResolver, defaultMultiIdlDir } from "./dispatch.mjs";

const args = process.argv.slice(2);
const signature = args.find((a) => !a.startsWith("--"));
if (!signature) {
  console.error(
    "usage: remix-multi.mjs <signature> [--multi-idl <dir>] [--gen-idl <dir>] [--out <dir>]",
  );
  process.exit(2);
}
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const multiIdlDir = flag("--multi-idl", defaultMultiIdlDir());
const genIdlDir = flag(
  "--gen-idl",
  path.resolve(
    process.env.HOME,
    "github_repos/orca-whirlpools-recon/ts-sdk/client/src/generated/instructions",
  ),
);
const outDir = flag("--out", path.resolve("out"));

const tx = await fetchTransaction(signature);

// Build a per-program dispatch table for the bitquery JSON IDLs we ship, then layer
// Anchor Codama modules (Whirlpool) on top per program. Tag length is recorded with each
// match so `buildRecipe` slices the right number of bytes off the data buffer; doing
// this per-program is what keeps a Token-2022 `initializeAccount` (tag=0x01) from being
// read as an Aquifer `swap` (also tag=0x01) when both appear in the same transaction.
// Build a per-program dispatch table over the bitquery JSON IDLs we ship, layered with
// Anchor Codama modules (Whirlpool) per program. The resolver comes from dispatch.mjs so
// that verify-recipe.mjs re-derives labels from the SAME tables this emitter wrote them
// from — the verifier used to count multi-program names without checking them, and a
// label changed after the fact sailed through.
const nameFor = buildMultiResolver({
  multiIdlDir,
  genIdlDir: flag("--gen-idl", process.env.IDL_GEN_DIR ||
    path.resolve(process.env.HOME, "github_repos/orca-whirlpools-recon/ts-sdk/client/src/generated/instructions")),
});

// Programs this transaction actually CALLS (top-level + CPI), derived from instructions
// rather than accountKeys: accountKeys includes fee payer and accounts, and for v0
// messages the CPI targets often live only in lookup tables.
const recipe = await buildRecipe(tx, null, {
  programId: "__multi__",
  programName: "multi",
  nameFor,
});
recipe.programId = "__multi__";
recipe.programName = "multi";
{
  const { programs, counts } = collectPrograms(recipe);
  recipe.txPrograms = programs;
  recipe.programCounts = counts;
}

const roundTrip = verifyRoundTrip(recipe, tx);

fs.mkdirSync(outDir, { recursive: true });
const stem = `remix-multi-${recipe.signature.slice(0, 8)}`;
const recipePath = path.join(outDir, `${stem}.ts`);
const jsonPath = path.join(outDir, `${stem}.json`);
const lines = recipeHeader(recipe);
appendInstructionBlock(lines, recipe);
appendAddressLines(lines, recipe);
lines.push(`export const ADDRESS_SPACE_SIZE = ${recipe.addressSpaceSize};`);
lines.push(``);
lines.push(`export const INSTRUCTION_BYTES = {`);
for (const ix of recipe.instructions) {
  const data = Buffer.concat([Buffer.from(ix.discriminator, "hex"), ix.args]);
  lines.push(`  /** ${ix.name ?? "(unknown)"} on ${shortAddr(ix.program)} */`);
  lines.push(`  ${ix.index}: {`);
  lines.push(`    program: ${JSON.stringify(ix.program)},`);
  lines.push(`    accounts: [${ix.accounts.join(", ")}],`);
  lines.push(`    data: "${data.toString("base64")}",`);
  lines.push(`  },`);
}
lines.push(`} as const;`);
lines.push(``);
lines.push(...renderInnerBytes(recipe));
lines.push(`export const VERIFY = {`);
lines.push(`  signature: ${JSON.stringify(recipe.signature)},`);
lines.push(`  slot: ${recipe.slot},`);
lines.push(`  programIds: [${recipe.txPrograms.map((p) => JSON.stringify(p)).join(", ")}],`);
lines.push(`};`);
lines.push(`export const MULTI_PROGRAM = true;`);

fs.writeFileSync(recipePath, lines.join("\n") + "\n");

const jsonOut = {
  signature: recipe.signature,
  slot: recipe.slot,
  blockTime: recipe.blockTime,
  txPrograms: recipe.txPrograms,
  programCounts: recipe.programCounts,
  accountKeys: recipe.accountKeys,
  addressSpaceSize: recipe.addressSpaceSize,
  version: recipe.version,
  lookupTables: recipe.lookupTables.map((t) => ({
    table: t.table, resolved: t.resolved,
    writable: t.loadedWritable.length, readonly: t.loadedReadonly.length,
  })),
  instructions: recipe.instructions.map((ix) => ({
    index: ix.index,
    program: ix.program,
    isTarget: ix.isTarget,
    name: ix.name,
    discriminator: ix.discriminator,
    tagLen: ix.tagLen ?? null,
    argBytes: ix.args.length,
    accounts: ix.accounts.length,
    accountsResolved: ix.accountAddresses ?? [],
    unresolvedAccounts: ix.unresolvedAccounts,
    inner: (ix.inner ?? []).map((inn) => ({
      program: inn.program,
      isTarget: inn.isTarget,
      name: inn.name,
      discriminator: inn.discriminator,
      tagLen: inn.tagLen ?? null,
      argBytes: inn.args.length,
      accountCount: inn.accountCount,
      accountsResolved: inn.accountAddresses,
      unresolved: inn.unresolvedAccounts,
    })),
  })),
};
fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2) + "\n");

const named = recipe.instructions.filter((i) => i.name).length;
const innerAll = recipe.instructions.flatMap((i) => i.inner ?? []);
const innerNamed = innerAll.filter((i) => i.name).length;
console.log(`signature   : ${recipe.signature}`);
console.log(`slot/time   : ${recipe.slot} / ${new Date(recipe.blockTime * 1000).toISOString()}`);
console.log(`version     : ${recipe.version}, ${recipe.accountKeys.length} static accounts`);
console.log(`programs    : ${recipe.txPrograms.length} called (top-level + CPI)`);
recipe.txPrograms.forEach((p, i) => {
  const c = recipe.programCounts[p] ?? { top: 0, inner: 0 };
  console.log(`   ${i.toString().padStart(2)}. ${shortAddr(p)} top=${c.top} inner=${c.inner}`);
});
console.log(`decoded     : ${named}/${recipe.instructions.length} top-level + ${innerNamed}/${innerAll.length} inner = ${named + innerNamed}/${recipe.instructions.length + innerAll.length}`);
console.log(`round-trip  : ${roundTrip.ok ? "BYTE-IDENTICAL" : "MISMATCH"}`);
console.log(`wrote       : ${recipePath}`);
console.log(`wrote       : ${jsonPath}`);

function collectPrograms(recipe) {
  const seen = new Map();
  const add = (program) => {
    if (!seen.has(program)) seen.set(program, { top: 0, inner: 0 });
  };
  for (const ix of recipe.instructions) {
    add(ix.program);
    seen.get(ix.program).top++;
  }
  for (const inner of recipe.instructions.flatMap((i) => i.inner ?? [])) {
    add(inner.program);
    seen.get(inner.program).inner++;
  }
  return {
    programs: [...seen.keys()],
    counts: Object.fromEntries([...seen]),
  };
}

function shortAddr(addr) {
  if (addr.length < 8) return addr;
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

function recipeHeader(recipe) {
  return [
    "/**",
    ` * Multi-program remix of a public Solana transaction.`,
    ` * source signature : ${recipe.signature}`,
    ` * slot / blockTime : ${recipe.slot} / ${new Date(recipe.blockTime * 1000).toISOString()}`,
    ` * message version  : ${recipe.version}`,
    ` * fee payer         : ${recipe.feePayer}`,
    ` *`,
    ` * Programs in this transaction:`,
    ...recipe.txPrograms.map((p, i) => ` *   ${i}. ${p}`),
    " *",
    " * Verification:",
    ` *   node src/verify-recipe.mjs ${stem}.ts`,
    " * verifies the encoded bytes still match the chain byte for byte.",
    " */",
    "",
  ];
}

function appendInstructionBlock(lines, recipe) {
  lines.push(`// ------------------------------------------------------ editable parameters`);
  lines.push(``);
  for (const ix of recipe.instructions) {
    if (!ix.name) continue;
    const schema = schemaForInstruction(genIdlDir, ix.name);
    const decoded = decodeArgs(schema, ix.args);
    lines.push(`/** ix ${ix.index}: ${ix.name} on ${shortAddr(ix.program)} (tagLen=${ix.tagLen ?? 8}) — ${ix.accountCount} accounts */`);
    for (const [k, v] of Object.entries(decoded)) {
      if (k.startsWith("__")) continue;
      const label = k.toUpperCase();
      if (v !== null && typeof v === "object") {
        lines.push(`export const IX${ix.index}_${label} = ${JSON.stringify(v)};`);
      } else if (typeof v === "boolean") lines.push(`export const IX${ix.index}_${label} = ${v};`);
      else if (/^-?\d+$/.test(String(v))) lines.push(`export const IX${ix.index}_${label} = ${v}n;`);
      else lines.push(`export const IX${ix.index}_${label} = ${JSON.stringify(v)};`);
    }
  }
  lines.push(``);
}

function appendAddressLines(lines, recipe) {
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
  lines.push(`/** Flat address space: static keys, then each lookup table in runtime order. */`);
  lines.push(`export const LOOKUP_TABLE_ADDRESSES = [`);
  // Flat runtime order across tables: all writable, then all readonly (see buildRecipe).
  recipe.lookupTables.forEach((t, ti) => {
    if (!t.resolved) {
      lines.push(`  /* table ${ti} ${t.table ?? "unknown"}: NOT RESOLVED */`);
      return;
    }
    t.loadedWritable.forEach((a, i) => lines.push(`    ${JSON.stringify(a)}, // table ${ti} writable[${i}]`));
  });
  recipe.lookupTables.forEach((t, ti) => {
    if (!t.resolved) return;
    t.loadedReadonly.forEach((a, i) => lines.push(`    ${JSON.stringify(a)}, // table ${ti} readonly[${i}]`));
  });
  lines.push(`] as const;`);
  lines.push(``);
}
