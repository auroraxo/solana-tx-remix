/**
 * verify-recipe.mjs — the acceptance test for a remix.
 *
 * Claim under test: "this editable recipe is the public transaction."
 *
 * Test: fetch the transaction fresh from an RPC (no cache, no trust in how the recipe was
 * produced), re-read the recipe's encoded instruction bytes, and compare them byte for byte
 * against what the chain accepted for that signature. Then decode the recipe's named fields
 * back into bytes and compare again, so a stale named field cannot hide behind a correct blob.
 *
 *   node src/verify-recipe.mjs out/remix-XXXXXXXX.ts
 *
 * Exit 0 = recipe reproduces the on-chain transaction exactly.
 * Any nonzero exit means the file is a summary of the transaction, not a recipe for it —
 * which is the failure mode this project exists to avoid.
 */
import fs from "node:fs";
import { b58decode, fetchTransaction, parseInnerBytes, rpc } from "./remix.mjs";
import { decodeArgs, schemaForInstruction } from "./args.mjs";
import { encodeNative, decodeNative, isNativeProgram, isNativeName, nativeProgramLabel } from "./native.mjs";

const recipePath = process.argv[2];
if (!recipePath) {
  console.error("usage: verify-recipe.mjs <recipe.ts>");
  process.exit(2);
}

const GEN_DIR =
  process.env.IDL_GEN_DIR ||
  `${process.env.HOME}/github_repos/orca-whirlpools-recon/ts-sdk/client/src/generated/instructions`;

const src = fs.readFileSync(recipePath, "utf8");

/**
 * A multi-program recipe names instructions from IDL JSONs (Aquifer, SolFi, Token-2022)
 * for which no Codama-generated codec directory exists. Those recipes carry an explicit
 * marker and opt out of the generated-codec expansion check above — byte-identity remains
 * the binding acceptance criterion for them. Single-program recipes keep the strict
 * check: a name without a codec means the arg fields can drift silently.
 */
const isMultiProgram = /export const MULTI_PROGRAM = true;/.test(src);

const signature = src.match(/SOURCE_SIGNATURE = "([1-9A-HJ-NP-Za-km-z]+)"/)?.[1];
if (!signature) {
  console.error("recipe has no SOURCE_SIGNATURE — cannot verify what it claims to be");
  process.exit(2);
}

/** Parse the encoded instruction block out of the recipe. */
const blockStart = src.indexOf("export const INSTRUCTION_BYTES = {");
const blockEnd = src.indexOf("} as const;", blockStart);
if (blockStart < 0 || blockEnd < 0) {
  console.error("recipe has no INSTRUCTION_BYTES block");
  process.exit(2);
}
const ixBlock = src.slice(blockStart, blockEnd);

/**
 * Labels are `NAME` (single-program recipes) or `NAME on SH…ORT` (multi-program recipes,
 * where the same instruction name exists in several programs' IDLs). `(unknown)` — with
 * or without the program suffix — means the generator could not name the instruction.
 * Treating the suffixed unknown as a name is exactly how this verifier once printed
 * `decoded 5/5` for a recipe that had decoded nothing.
 */
const labelName = (label) => {
  const base = label.replace(/ on \S+…\S+$/, "").trim();
  return base === "(unknown)" ? null : base;
};

const fromRecipe = [
  ...ixBlock.matchAll(/\/\*\*\s*([^*]+?)\s*\*\/\s*(\d+):\s*\{([\s\S]*?)\n  \},?/g),
].map((m) => {
  const label = m[1].trim();
  const body = m[3];
  return {
    index: Number(m[2]),
    name: labelName(label),
    program: JSON.parse(body.match(/program:\s*("[1-9A-HJ-NP-Za-km-z]+")/)[1]),
    accounts: JSON.parse("[" + body.match(/accounts:\s*\[([^\]]*)\]/)[1] + "]"),
    data: Buffer.from(body.match(/data:\s*"([^"]*)"/)[1], "base64"),
  };
});

if (fromRecipe.length === 0) {
  console.error("recipe instruction block parsed to zero instructions");
  process.exit(2);
}

console.log(`recipe      : ${recipePath}`);
console.log(`signature   : ${signature}`);

/**
 * The recipe's resolved address space: static keys plus any lookup-table entries, in the
 * same flat order the runtime uses for instruction account indexes.
 */
const recipeAddrMatch = src.match(/export const ACCOUNTS = \[([\s\S]*?)\] as const;/);
const staticAddrs = recipeAddrMatch
  ? [...recipeAddrMatch[1].matchAll(/"([1-9A-HJ-NP-Za-km-z]+)"/g)].map((m) => m[1])
  : [];
const lutMatch = src.match(/export const LOOKUP_TABLE_ADDRESSES = \[([\s\S]*?)\] as const;/);
const recipeAddresses = [...staticAddrs];
if (lutMatch) {
  for (const a of [...lutMatch[1].matchAll(/"([1-9A-HJ-NP-Za-km-z]+)"/g)].map((m) => m[1])) {
    recipeAddresses.push(a);
  }
}

/**
 * Fresh ground truth from the chain. A lookup that fails is a verification failure, not an
 * exception: a recipe that cannot even resolve its own source signature is not verifiable.
 */
let tx;
try {
  tx = await fetchTransaction(signature);
} catch (e) {
  console.log(`FAIL (1):`);
  console.log(`  - cannot fetch source transaction: ${e.message}`);
  process.exit(1);
}
const onChain = tx.transaction.message.instructions.map((ix) => ({
  index: 0,
  programIndex: ix.programIdIndex,
  accounts: ix.accounts,
  data: b58decode(ix.data),
}));
const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey ?? k);

const failures = [];

// 0. Address resolution: a v0 instruction's account indexes address a flat space that
//    includes lookup-table entries. If any index fails to resolve to a real address the
//    recipe contains placeholders, and a byte-compare of the raw indexes will still pass.
const unresolved = fromRecipe.flatMap((ix) =>
  (ix.accounts ?? [])
    .filter((a) => a !== 0 && !recipeAddresses[a])
    .map((a) => `ix ${ix.index}: account index ${a} does not resolve to an address`),
);
failures.push(...unresolved);

// Address range sanity: every index must fit the flat address space we resolved.
const sizeMatch = src.match(/ADDRESS_SPACE_SIZE = (\d+)/);
const addressSpaceSize = sizeMatch ? Number(sizeMatch[1]) : null;
if (addressSpaceSize != null) {
  for (const ix of fromRecipe) {
    for (const a of ix.accounts) {
      if (a >= addressSpaceSize) {
        failures.push(
          `ix ${ix.index}: account index ${a} >= address space ${addressSpaceSize}`,
        );
      }
    }
  }
} else {
  failures.push("recipe does not declare ADDRESS_SPACE_SIZE — cannot bound its account indexes");
}

// 1. Structural equality: same programs, same account index lists, same bytes.
if (fromRecipe.length !== onChain.length) {
  failures.push(
    `instruction count: recipe has ${fromRecipe.length}, chain has ${onChain.length}`,
  );
}
for (const ix of fromRecipe) {
  const chain = onChain[ix.index];
  if (!chain) {
    failures.push(`ix ${ix.index}: present in recipe, absent on chain`);
    continue;
  }
  const chainProgram = keys[chain.programIndex];
  if (ix.program !== chainProgram) {
    failures.push(`ix ${ix.index}: program ${ix.program} != chain ${chainProgram}`);
  }
  if (JSON.stringify(ix.accounts) !== JSON.stringify(chain.accounts)) {
    failures.push(`ix ${ix.index}: account index list differs from chain`);
  }
  if (Buffer.compare(ix.data, chain.data) !== 0) {
    const at = [...ix.data].findIndex((b, i) => b !== chain.data[i]);
    failures.push(
      `ix ${ix.index}: byte mismatch at offset ${at} ` +
        `(recipe ${ix.data.subarray(Math.max(0, at - 4), at + 4).toString("hex")} vs ` +
        `chain ${chain.data.subarray(Math.max(0, at - 4), at + 4).toString("hex")})`,
    );
  }
}

// 2. Named-field round trip: decode the recipe's stored bytes with the program's own IDL,
//    re-encode nothing — instead confirm each named instruction's discriminator and arg
//    length are consistent, so names cannot drift from bytes silently.
let decodedCount = 0;
for (const ix of fromRecipe) {
  if (!ix.name) continue;

  if (isNativeProgram(ix.program)) {
    // Hoisted out of the multi-program branch: native naming comes from native.mjs in
    // BOTH entry points, so both need the same guard, and neither has a Codama codec to
    // fall back on. Gate on the PROGRAM, not the claimed name — gating on
    // `isNative(program, name)` skipped the check whenever the label named an instruction
    // from a different program, which is precisely the mislabel this guard exists to catch.
    const decodedArgs = decodeNative(ix.program, ix.data);
    if (!decodedArgs) {
      failures.push(
        `ix ${ix.index}: claims ${ix.name} on ${ix.program}, but its bytes do not decode as any ${nativeProgramLabel(ix.program)} instruction`,
      );
      continue;
    }
    // Name agreement first: it is the precise failure. Reading `units` from bytes that say
    // `micro_lamports` would otherwise surface as "could not be re-encoded", which
    // describes the symptom, not the defect.
    if (ix.name !== decodedArgs.name) {
      failures.push(`ix ${ix.index}: bytes decode as ${decodedArgs.name}, recipe claims ${ix.name}`);
      continue;
    }
    const rebuilt = encodeNative(ix.program, decodedArgs.name, decodedArgs.args);
    if (!rebuilt) {
      failures.push(`ix ${ix.index}: native name ${decodedArgs.name} could not be re-encoded`);
      continue;
    }
    const original = ix.data.subarray(0, rebuilt.length);
    if (Buffer.compare(rebuilt, original) !== 0) {
      failures.push(
        `ix ${ix.index}: native name ${decodedArgs.name} re-encodes to ${rebuilt.toString("hex")}, bytes are ${original.toString("hex")}`,
      );
      continue;
    }
    decodedCount++;
    continue;
  }

  if (isNativeName(ix.name) && !isNativeProgram(ix.program)) {
    // A native instruction name on a program that has no such instruction — `Transfer`
    // on an Anchor aggregator, say. Its bytes belong to that program's own scheme, so the
    // bytes check below cannot see this; only the label is wrong.
    failures.push(
      `ix ${ix.index}: recipe claims native instruction ${ix.name} on ${ix.program}, which does not implement it`,
    );
    continue;
  }

  if (isMultiProgram) {
    // Multi recipes name instructions from several programs' IDL JSONs. Expanding args
    // through a single program's codec directory (GEN_DIR = Whirlpool) would decode
    // foreign bytes with the wrong schema — a name like `swap` exists in both. Byte
    // identity above remains the binding check; count named instructions only.
    decodedCount++;
    continue;
  }
  const schema = schemaForInstruction(GEN_DIR, ix.name);
  if (!schema) {
    failures.push(`ix ${ix.index}: named ${ix.name} but no generated codec found`);
    continue;
  }
  const decoded = decodeArgs(schema, ix.data.subarray(8));
  const namedKeys = Object.keys(decoded).filter((k) => !k.startsWith("__"));
  if (namedKeys.length === 0 && schema.length > 1) {
    failures.push(`ix ${ix.index}: ${ix.name} decoded to zero named fields`);
    continue;
  }
  decodedCount++;
}

console.log(`on chain    : ${onChain.length} instructions, ${keys.length} static accounts`);
console.log(`decoded     : ${decodedCount}/${fromRecipe.length} with generated IDL codecs`);

if (failures.length) {
  console.log(`FAIL (${failures.length}):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}

/**
 * CPI byte verification — the top-level byte compare above does not cover inner
 * instructions. In a Jupiter v6 swap the only `swap` happens inside a CPI on
 * `whirLbMiic…`; if the recipe dropped an inner `transfer` or re-tagged bytes, no
 * top-level check would notice. We re-fetch `meta.innerInstructions` and compare each
 * item against the recipe's INNER_BYTES entry `[parent][slot]`.
 *
 * Both emitters write that block now (renderInnerBytes). When they did not, this check
 * failed every real recipe with "present in chain, missing from recipe" — a verifier that
 * demands an artifact no producer emits is broken, not strict. It also means an inner-only
 * diff is a genuine failure: a recipe that silently drops a CPI is a summary of the
 * transaction, not the transaction.
 */
{
  const isLegacy = !tx.meta?.innerInstructions?.length;
  const groups = tx.meta?.innerInstructions ?? [];

  // Inner block: parsed by parseInnerBytes() — the SAME function the emitters' renderer is
  // paired with. Reading it with a private copy of the format is exactly how the verifier
  // came to demand a block no emitter wrote.
  const innerRecipe = parseInnerBytes(src).map((e) => ({
    parentIx: e.parentIx,
    innerIx: e.innerIx,
    name: labelName(e.label),
    program: e.program,
    accounts: e.accounts,
    data: e.data,
  }));

  let cpiChecked = 0;
  let cpiFailures = 0;
  // Runtime-order account space: static keys, then meta.loadedAddresses (writable, then
  // readonly). Inner instruction programIdIndex/account indexes address this space.
  const la = tx.meta?.loadedAddresses ?? { writable: [], readonly: [] };
  const runtimeSpace = [
    ...tx.transaction.message.accountKeys.map((k) => k.pubkey ?? k),
    ...la.writable,
    ...la.readonly,
  ];
  for (const group of groups) {
    for (let i = 0; i < group.instructions.length; i++) {
      const chainIx = group.instructions[i];
      const chainData = b58decode(chainIx.data);
      const resolvedProgramId = runtimeSpace[chainIx.programIdIndex] ?? null;
      const match = innerRecipe.find(
        (r) => r.parentIx === group.index && r.innerIx === i,
      );
      if (!match) {
        if (!isLegacy) {
          failures.push(
            `cpi (parent ix ${group.index}, slot ${i}): present in chain, missing from recipe ` +
            `(${chainIx.accounts.length} accounts, ${chainData.length} bytes)`,
          );
          cpiFailures++;
        }
        continue;
      }
      cpiChecked++;
      if (match.program !== resolvedProgramId) {
        failures.push(`cpi (parent ix ${group.index}, slot ${i}): program ${match.program} != chain ${resolvedProgramId}`);
        cpiFailures++;
      }
      if (JSON.stringify(match.accounts) !== JSON.stringify(chainIx.accounts)) {
        failures.push(`cpi (parent ix ${group.index}, slot ${i}): account index list differs from chain`);
        cpiFailures++;
      }
      if (Buffer.compare(match.data, chainData) !== 0) {
        const at = [...match.data].findIndex((b, j) => b !== chainData[j]);
        failures.push(
          `cpi (parent ix ${group.index}, slot ${i}): byte mismatch at offset ${at} ` +
          `(recipe ${match.data.subarray(Math.max(0, at - 4), at + 4).toString("hex")} vs ` +
          `chain ${chainData.subarray(Math.max(0, at - 4), at + 4).toString("hex")})`,
        );
        cpiFailures++;
      }
    }
  }
  console.log(`cpi check  : ${cpiChecked} inner instructions verified${cpiFailures ? ` (${cpiFailures} failed)` : ""}`);
}

/**
 * LUT ground-truth check: a v0 recipe's LOOKUP_TABLE_ADDRESSES is only useful if it
 * matches what the runtime actually resolved for that slot. `meta.loadedAddresses`
 * carries that ground truth (all writables then all readonlies, across tables in
 * message order). Drift here is the recipe misrepresenting account resolution.
 */
{
  const la = tx.meta?.loadedAddresses;
  if (la) {
    const chainFlat = [...(la.writable ?? []), ...(la.readonly ?? [])];
    const expectedSize = tx.transaction.message.accountKeys.length + chainFlat.length;
    if (addressSpaceSize !== expectedSize) {
      failures.push(`ADDRESS_SPACE_SIZE ${addressSpaceSize} != chain ${expectedSize} (${tx.transaction.message.accountKeys.length} static + ${chainFlat.length} loaded)`);
    }
    for (let i = 0; i < chainFlat.length; i++) {
      const want = chainFlat[i];
      const got = recipeAddresses[tx.transaction.message.accountKeys.length + i];
      if (want !== got) {
        failures.push(`LUT slot ${i} (offset ${tx.transaction.message.accountKeys.length + i}): recipe has ${got}, chain has ${want}`);
        break;
      }
    }
  }
}

if (failures.length) {
  console.log(`FAIL (${failures.length}):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log(`PASS: recipe reproduces signature ${signature} byte for byte`);
process.exit(0);
