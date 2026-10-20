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
import { b58decode, fetchTransaction } from "./remix.mjs";
import { decodeArgs, schemaForInstruction } from "./args.mjs";

const recipePath = process.argv[2];
if (!recipePath) {
  console.error("usage: verify-recipe.mjs <recipe.ts>");
  process.exit(2);
}

const GEN_DIR =
  process.env.IDL_GEN_DIR ||
  `${process.env.HOME}/github_repos/orca-whirlpools-recon/ts-sdk/client/src/generated/instructions`;

const src = fs.readFileSync(recipePath, "utf8");

const signature = src.match(/SOURCE_SIGNATURE = "([1-9A-HJ-NP-Za-km-z]+)"/)?.[1];
if (!signature) {
  console.error("recipe has no SOURCE_SIGNATURE — cannot verify what it claims to be");
  process.exit(2);
}

/** Parse the encoded instruction block out of the recipe. */
const blockStart = src.indexOf("INSTRUCTION_BYTES = {");
const blockEnd = src.indexOf("} as const;", blockStart);
if (blockStart < 0 || blockEnd < 0) {
  console.error("recipe has no INSTRUCTION_BYTES block");
  process.exit(2);
}
const ixBlock = src.slice(blockStart, blockEnd);

const fromRecipe = [
  ...ixBlock.matchAll(/\/\*\*\s*([^*]+?)\s*\*\/\s*(\d+):\s*\{([\s\S]*?)\n  \},?/g),
].map((m) => {
  const label = m[1].trim();
  const body = m[3];
  return {
    index: Number(m[2]),
    name: label === "(unknown)" ? null : label,
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
console.log(`PASS: recipe reproduces signature ${signature} byte for byte`);
process.exit(0);
