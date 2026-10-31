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
import {
  WHIRLPOOL_PROGRAM,
  BROKEN,
  decodeWithSememe,
  sememeStatus,
} from "./sememe-idl.mjs";
import { encodeNative, decodeNative, isNativeProgram, isNativeName, nativeProgramLabel } from "./native.mjs";
import { decodeParams, encodeParams, parseRecipeParams, constantName } from "./params.mjs";
import { buildStoredResolver, multiIdlDirPresent, multiIdlProgramCount } from "./dispatch.mjs";

const recipePath = process.argv[2];
if (!recipePath) {
  console.error("usage: verify-recipe.mjs <recipe.ts>");
  process.exit(2);
}

const GEN_DIR =
  process.env.IDL_GEN_DIR ||
  `${process.env.HOME}/github_repos/orca-whirlpools-recon/ts-sdk/client/src/generated/instructions`;

/**
 * The second decoder: the program's own on-chain IDL, pulled by sememe and stored
 * content-addressed with a receipt that records program, source account, slot and
 * fingerprint. The fingerprint is RE-CHECKED against the object's own bytes before it is
 * used (see src/sememe-idl.mjs) — the receipt is a claim, the recomputed digest is the
 * check.
 *
 * Why a second, independent decoder at all: the emitter writes argument names from the
 * generated codecs, and the verifier used to read them back with the SAME generated codecs.
 * A wrong argument layout in the generated code would therefore be invisible — both sides
 * agreed with each other and with nothing else. The stored IDL comes from the chain by
 * different code, so agreement between the two is evidence, not tautology.
 *
 * When only one decoder is available the check still runs, from the one that is. Which one
 * ran is printed, so a report can never be read as "both agreed" when only one was asked.
 */
const sememe = await sememeStatus(WHIRLPOOL_PROGRAM);
const sememeUsable = sememe.usable;
// The failure list is declared here rather than further down: the stored-artifact check
// below can fail on its own, before a single instruction is looked at.
const failures = [];
if (sememeUsable) {
  console.log(
    `sememe      : ${sememe.fingerprint} (slot ${sememe.receipt.slot}, ${sememe.receipt.source}) — fingerprint re-verified against the stored bytes`,
  );
} else if (sememe.reason === BROKEN) {
  // A store that EXISTS and does not verify is a defect in the artifact, not an absent
  // dependency. Falling back to the generated codecs here would turn tampering into a
  // green run: the check finds the damage, declines to use the result, and then reports
  // success on half a verification. So it is recorded as a failure for the whole recipe,
  // before any instruction is looked at.
  failures.push(
    `stored sememe artifact for ${WHIRLPOOL_PROGRAM} is present but does not verify: ${sememe.error}`,
  );
  console.log(`sememe      : BROKEN — ${sememe.error}`);
} else {
  console.log(`sememe      : unavailable — ${sememe.error}`);
}

const src = fs.readFileSync(recipePath, "utf8");

/**
 * A multi-program recipe names instructions from IDL JSONs (Aquifer, SolFi, Token-2022)
 * for which no Codama-generated codec directory exists. Those recipes carry an explicit
 * marker and opt out of the generated-codec expansion check above — byte-identity remains
 * the binding acceptance criterion for them. Single-program recipes keep the strict
 * check: a name without a codec means the arg fields can drift silently.
 */
const isMultiProgram = /export const MULTI_PROGRAM = true;/.test(src);

/**
 * For multi-program recipes the labels are re-derived from the shipped IDL tables instead of
 * being taken on trust. The count in the named-field section below used to be unconditional
 * (`decodedCount++`) on the reasoning that "byte identity is the binding check" — true for the
 * BYTES, and irrelevant for the LABEL. Relabelling a dflow `swap2` as `swap` left every byte
 * identical and every check green: the recipe then reads as a different transaction with the
 * same payload, which is the exact class of defect this tool exists to catch. Both sides of
 * the label now come from dispatch.mjs, so emitter and verifier cannot disagree about what a
 * name means.
 *
 * Since the second migration BOTH sides are the STORED resolver: the emitter
 * (src/remix-multi.mjs) layers the fingerprint-verified on-chain artifacts over the
 * checked-in copies in idl/multi/, and this side does the same, so the label is re-derived
 * from the same authoritative source the label was written from. A single-program recipe
 * keeps the sync resolver for its `(unknown)` sweep below — it is not labelled from the
 * multi tables in the first place.
 *
 * A stored artifact that cannot be used is reported here as a failure, not as "fall back
 * to the vendored copy": the vendored copy is exactly what the migration exists to
 * replace, and it is stale (measured 2026-10-30 — see sememe's
 * research/vendored-drift-tx-remix-2026-10-30.json).
 */
const storedResolver = await buildStoredResolver();
const multiNameFor = storedResolver.nameFor;
for (const problem of storedResolver.problems) {
  failures.push(
    `stored artifact for ${problem.program ?? "the store"} is unusable (${problem.reason}): ${problem.error}` +
      ` — labels for that program would fall back to the stale vendored copy, which is not acceptable`,
  );
}
let multiProgramCount = 0;
if (isMultiProgram) {
  if (!multiIdlDirPresent()) {
    console.log(`FAIL (1):`);
    console.log(`  - multi-program recipe claims instruction names, but the IDL table is missing; labels cannot be checked`);
    process.exit(1);
  }
  multiProgramCount = multiIdlProgramCount();
}

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

// 0z. The recipe's own message-version claim, checked against the chain.
//
// RECIPE_VERSION is written by both emitters and was read by nothing. Two of the four shipped
// recipes carried a false one: out/remix-multi-4HZWSH28.ts declared `legacy` for a message that
// is v0, and every v1 transaction (~37% of mainnet) is reported `legacy` by a classifier that
// keys on `msg.version === 0` — a field `getTransaction` omits for all three versions (measured
// on 1730 mainnet transactions, `msg.version !== undefined` for 0 of them).
//
// The claim is part of what a recipe asserts about the transaction, and a recipe that names the
// wrong message version is a recipe describing a different wire format from the one verified.
// Byte-identity does not see it: the instructions are identical either way.
//
// The rule is field-presence, deliberately not a length test — an empty `addressTableLookups`
// array is still a v0 message, and 467 of 813 sampled v0 messages have exactly that.
{
  const m = tx.transaction.message;
  const chainVersion =
    m.transactionConfig !== undefined ? "v1" : m.addressTableLookups !== undefined ? "v0" : "legacy";
  const claimed = src.match(/export const RECIPE_VERSION = "([^"]+)"/)?.[1] ?? null;
  if (claimed === null) {
    failures.push(`recipe declares no RECIPE_VERSION, so its message version is unverified`);
  } else if (claimed !== chainVersion) {
    failures.push(
      `recipe claims message version ${claimed}, chain is ${chainVersion} ` +
        `(${chainVersion === "v1" ? "transactionConfig present" : chainVersion === "v0" ? "addressTableLookups key present" : "neither v0 nor v1 field present"})`,
    );
  }
}

// 0. Address resolution: a v0 instruction's account indexes address a flat space that
//    includes lookup-table entries. If any index fails to resolve to a real address the
//    recipe contains placeholders, and a byte-compare of the raw indexes will still pass.
const unresolved = fromRecipe.flatMap((ix) =>
  (ix.accounts ?? [])
    .filter((a) => a !== 0 && !recipeAddresses[a])
    .map((a) => `ix ${ix.index}: account index ${a} does not resolve to an address`),
);
failures.push(...unresolved);

// 0b. Labelled (unknown) where the shipped IDL set knows better.
//
// Every check below starts from `if (!ix.name) continue;`, so an `(unknown)` label asks the
// verifier nothing and cannot be wrong. That is correct for a program with no IDL we hold,
// and it is a hole for one whose IDL sits in the tree: out/remix-3yB9Q1pq.ts shipped six
// `(unknown)` labels (four SPL Token CPIs, one Aquifer CPI, one aggregator) while idl/multi
// bound the programs those CPIs belong to, and `node ci/acceptance.mjs` printed
// ACCEPTANCE PASSED for the stale tree just as it did for the broken loader.
//
// Emitter and verifier build the same resolver (dispatch.mjs), so "resolver can name these
// bytes and the recipe did not" is not a content disagreement — it is a stale artifact,
// which is what happens when an emitter fix lands and the recipe it writes is not
// regenerated. Byte-identity cannot see it: the bytes never changed.
//
// A null resolver result stays skipped here, unlike the checks below it: null means "no IDL
// covers this program", which is a real state and must not be reported as a defect.
for (const ix of fromRecipe) {
  if (ix.name) continue;
  const hit = multiNameFor(ix.program, ix.data);
  if (hit) {
    failures.push(
      `ix ${ix.index}: labelled (unknown) on ${ix.program}, but the shipped IDL set resolves these bytes to ${hit.name}`,
    );
  }
}

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
//
//    Since the migration it is TWO decoders when both are present: the generated codecs and
//    the fingerprint-verified on-chain IDL from the sememe store. `crossChecked` counts the
//    instructions both asked about and agreed on; printed per instruction above.
let decodedCount = 0;
let crossChecked = 0;
let crossFields = 0;
let crossRefused = 0;
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
    // identity above remains the binding check for the PAYLOAD; the LABEL is checked
    // separately here by re-resolving the same discriminator through dispatch.mjs and
    // requiring the same name back.
    const hit = multiNameFor(ix.program, ix.data);
    if (!hit) {
      failures.push(
        `ix ${ix.index}: claims ${ix.name} on ${ix.program}, but its bytes match no known instruction of that program`,
      );
      continue;
    }
    if (hit.name !== ix.name) {
      failures.push(
        `ix ${ix.index}: bytes resolve to ${hit.name} on ${ix.program}, recipe claims ${ix.name}`,
      );
      continue;
    }
    decodedCount++;
    continue;
  }
  const schema = schemaForInstruction(GEN_DIR, ix.name);
  const hasGenerated = Boolean(schema);

  /**
   * The migration: decode these bytes from the stored, fingerprint-verified on-chain IDL
   * instead of from generated codecs that are not in this repository.
   *
   * Three things are checked, in the order they fail:
   *  1. the IDL names its own discriminator, and that name must be the recipe's label
   *     (the check the generated path could not make: it looked the layout up BY the label,
   *     so a wrong label found a wrong layout and decoded it happily);
   *  2. the decode must produce named fields;
   *  3. every byte must be accounted for — bytes beyond what the IDL describes mean the
   *     recipe is shipping an argument this decoder does not explain, which is a claim the
   *     recipe cannot support.
   */
  let decodedCounted = false;
  if (sememeUsable) {
    const viaStore = await decodeWithSememe(ix.data, ix.program);
    if (viaStore.error) {
      failures.push(`ix ${ix.index}: stored IDL cannot decode ${ix.name}: ${viaStore.error}`);
      continue;
    }
    if (viaStore.idlName.toUpperCase() !== ix.name.toUpperCase()) {
      failures.push(
        `ix ${ix.index}: stored IDL names these bytes ${viaStore.idlName}, recipe claims ${ix.name}`,
      );
      continue;
    }
    const namedKeys = Object.keys(viaStore.args);
    if (namedKeys.length === 0) {
      failures.push(`ix ${ix.index}: ${ix.name} decoded to zero named fields`);
      continue;
    }
    if (viaStore.trailing.count > 0) {
      failures.push(
        `ix ${ix.index}: ${ix.name} has ${viaStore.trailing.count} byte(s) the stored IDL does not describe ` +
          `(offset ${viaStore.consumed} of ${viaStore.bytes}) — the recipe ships arguments it cannot explain`,
      );
      continue;
    }

    // Second opinion, when the generated codecs are also on this machine. The two decoders
    // are independent — different code, different provenance for the layout — so agreement
    // is evidence. Snake/camel is a naming convention on each side; values are compared
    // after mapping, and the fields one side cannot decode are counted, not counted as
    // disagreements (the generated path refuses `option`/`defined` args outright).
    if (hasGenerated) {
      const viaGenerated = decodeArgs(schema, ix.data.subarray(8));
      const toSnake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      const refusal = (v) =>
        v && typeof v === "object" &&
        ("__optionRemaining" in v || "__unsupportedDecoder" in v || "__truncated" in v);
      const generatedNamed = Object.fromEntries(
        Object.entries(viaGenerated).filter(([k]) => !k.startsWith("__")).map(([k, v]) => [toSnake(k), v]),
      );
      const disagreements = [];
      let compared = 0;
      let refusedByGenerated = 0;
      let onlySememe = [];
      let onlyGenerated = [];
      for (const key of new Set([...Object.keys(generatedNamed), ...Object.keys(viaStore.args)])) {
        const inGenerated = key in generatedNamed;
        const inStore = key in viaStore.args;
        if (!inGenerated) { onlySememe.push(key); continue; }
        if (!inStore) { onlyGenerated.push(key); continue; }
        compared++;
        if (refusal(generatedNamed[key])) { refusedByGenerated++; continue; }
        if (JSON.stringify(generatedNamed[key]) !== JSON.stringify(viaStore.args[key])) {
          disagreements.push(
            `${key}: generated=${JSON.stringify(generatedNamed[key])} stored=${JSON.stringify(viaStore.args[key])}`,
          );
        }
      }
      if (disagreements.length) {
        failures.push(
          `ix ${ix.index}: decoders disagree on ${ix.name} — ${disagreements.join("; ")} ` +
            `(stored IDL ${sememe.fingerprint})`,
        );
        continue;
      }
      if (onlySememe.length || onlyGenerated.length) {
        failures.push(
          `ix ${ix.index}: decoders disagree on the FIELD SET of ${ix.name} — ` +
            `only in stored IDL: [${onlySememe.join(", ")}]; only in generated: [${onlyGenerated.join(", ")}]`,
        );
        continue;
      }
      crossChecked++;
      crossFields += compared;
      crossRefused += refusedByGenerated;
      console.log(
        `  ix ${ix.index} ${ix.name}: both decoders agree — ${compared} field(s), ` +
          `${refusedByGenerated} refused by the generated path, 0 disagreements`,
      );
    } else {
      console.log(
        `  ix ${ix.index} ${ix.name}: decoded from the stored IDL only (${namedKeys.length} field(s)) — generated codecs not present, no second opinion`,
      );
    }
    decodedCounted = true;
  }

  // Fall-through to the generated-codec path when the stored artifact is unavailable —
  // the historical behaviour, kept so a machine with neither still reports SKIP rather
  // than a spurious failure.
  if (!decodedCounted) {
    if (!hasGenerated) {
      failures.push(`ix ${ix.index}: named ${ix.name} but no generated codec found`);
      continue;
    }
    const decoded = decodeArgs(schema, ix.data.subarray(8));
    const namedKeys = Object.keys(decoded).filter((k) => !k.startsWith("__"));
    if (namedKeys.length === 0) {
      failures.push(`ix ${ix.index}: ${ix.name} decoded to zero named fields`);
      continue;
    }
  }
  decodedCount++;
}

console.log(`on chain    : ${onChain.length} instructions, ${keys.length} static accounts`);
console.log(`decoded     : ${decodedCount}/${fromRecipe.length} named instructions`);

/**
 * 2b. The recipe's OWN editable constants must be the bytes they sit next to.
 *
 * The README calls this file "editable", and every emitter writes `export const
 * IX<n>_<INSTRUCTION>_<FIELD> = ...` lines above the wire bytes. NOTHING checked them
 * against those bytes: byte-identity compares INSTRUCTION_BYTES with the chain, which is
 * untouched by editing a constant. So the most likely edit a reader makes - change an
 * amount, add slippage - could silently disagree with the payload the verifier calls
 * "byte for byte". The recipe would verify green and rebuild to something else, or to
 * nothing at all.
 *
 * The rule is claim-conditional, because absence of constants is not a false claim:
 *
 *   - No constants for an instruction -> nothing is claimed, no check (single-program
 *     recipes only write constants for the target program's instructions).
 *   - SOME constants for an instruction but not all of its fields -> failure: a partial
 *     set cannot rebuild the payload, so the file promises an editability it cannot
 *     deliver.
 *   - A constant naming a field the bytes' own interface does not declare -> failure: the
 *     constant answers to nothing.
 *   - All constants present -> re-encode through the program's OWN stored interface
 *     (native tables for System/ComputeBudget) and require byte equality with the
 *     recipe's INSTRUCTION_BYTES entry - the same bytes byte-identity just compared to
 *     the chain. The values ARE the bytes, or the recipe says so.
 *
 * Absence of the interface is a documented state (note, not failure - same rule as the
 * SKIP path: a machine with no sememe checkout cannot fail a recipe for being
 * unverifiable). A present-but-broken or contradicting interface is a failure: that is
 * where a green run over a tampered artifact used to live.
 */
{
  const declared = parseRecipeParams(src);
  const byIndex = new Map();
  for (const [name, value] of declared) {
    const m = name.match(/^IX(\d+)_/);
    if (!m) continue;
    const index = Number(m[1]);
    if (!byIndex.has(index)) byIndex.set(index, new Map());
    byIndex.get(index).set(name, value);
  }
  // Constants for instructions this recipe no longer carries are claims about an absent
  // transaction - the dropped-instruction control class.
  for (const index of byIndex.keys()) {
    if (!fromRecipe.some((ix) => ix.index === index)) {
      failures.push(`constants IX${index}_* declare arguments for instruction ${index}, which is not in this recipe`);
    }
  }
  let paramSets = 0;
  let paramFields = 0;
  for (const ix of fromRecipe) {
    const declaredHere = byIndex.get(ix.index);
    if (!declaredHere || declaredHere.size === 0) continue; // no claim -> no check
    if (!ix.name) {
      failures.push(
        `ix ${ix.index}: declares argument constants but is labelled (unknown) - constants for an unnamed instruction cannot be checked against anything`,
      );
      continue;
    }
    const decoded = await decodeParams(ix.program, ix.data);
    if (decoded.error || !decoded.args) {
      if (decoded.reason === "absent") {
        console.log(
          `  ix ${ix.index} ${ix.name}: ${declaredHere.size} constant(s) not verified - ${decoded.error} (interface absent here, documented state)`,
        );
        continue;
      }
      failures.push(
        `ix ${ix.index}: declares argument constants, but its program's own interface cannot decode these bytes ` +
          `(${decoded.error}) - the constants contradict the bytes or the store is damaged`,
      );
      continue;
    }
    if (decoded.name.toUpperCase() !== ix.name.toUpperCase()) {
      // The label check above already reports this; deriving constant names from a label
      // the bytes contradict would pile "missing field" noise on top of the real failure.
      continue;
    }
    const expected = new Map(); // constant name -> field name
    for (const field of Object.keys(decoded.args)) {
      if (field.startsWith("__")) continue;
      expected.set(constantName(ix.index, ix.name, field), field);
    }
    const prefix = `IX${ix.index}_${String(ix.name).toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_`;
    const argConstants = [...declaredHere].filter(([name]) => name.startsWith(prefix));
    if (argConstants.length === 0) continue; // only role/program constants - not a value claim
    const unknown = argConstants.filter(([name]) => !expected.has(name)).map(([name]) => name);
    if (unknown.length) {
      failures.push(
        `ix ${ix.index}: constant(s) ${unknown.join(", ")} name field(s) that ${ix.name} does not declare ` +
          `(its interface has: ${[...expected.values()].join(", ")})`,
      );
      continue;
    }
    const args = {};
    const missing = [];
    for (const [name, field] of expected) {
      if (declaredHere.has(name)) args[field] = declaredHere.get(name);
      else missing.push(field);
    }
    if (missing.length) {
      failures.push(
        `ix ${ix.index}: partial constants for ${ix.name} - missing ${missing.join(", ")}; ` +
          `an incomplete argument set cannot rebuild the payload it sits above`,
      );
      continue;
    }
    const rebuilt = await encodeParams(ix.program, decoded.name, args);
    if (rebuilt.error || Buffer.compare(rebuilt.bytes, ix.data) !== 0) {
      const at = rebuilt.bytes
        ? [...rebuilt.bytes].findIndex((b, i) => ix.data[i] !== b)
        : -1;
      failures.push(
        rebuilt.error
          ? `ix ${ix.index}: constants of ${ix.name} cannot be re-encoded: ${rebuilt.error}`
          : `ix ${ix.index}: constants of ${ix.name} re-encode to a different payload - ` +
              `first difference at offset ${at} (constants ${rebuilt.bytes.subarray(Math.max(0, at - 4), at + 4).toString("hex")} vs ` +
              `recipe ${ix.data.subarray(Math.max(0, at - 4), at + 4).toString("hex")})`,
      );
      continue;
    }
    paramSets++;
    paramFields += Object.keys(args).length;
    console.log(
      `  ix ${ix.index} ${ix.name}: ${Object.keys(args).length} constant(s) re-encode to the chain bytes (${decoded.source})`,
    );
  }
  console.log(
    `constants   : ${paramSets} instruction set(s), ${paramFields} field(s) verified against INSTRUCTION_BYTES`,
  );
}
if (sememeUsable) {
  console.log(
    `cross-check : ${crossChecked} instruction(s), ${crossFields} field(s) compared, ` +
      `${crossRefused} refused by the generated decoder, 0 disagreements (stored IDL ${sememe.fingerprint})`,
  );
}

// No early exit here. Every acceptance check below must run before any verdict is printed:
// this block used to `process.exit(1)` whenever a top-level check had already failed, which
// meant criteria 6 (LUT ground truth) and 7 (CPI) were never reached. A control whose only
// mutation is a dropped CPI then reported nothing about that CPI once any unrelated failure
// existed — it failed for a reason unrelated to its mutation, the exact failure mode this
// tool exists to rule out. Collect all failures, then report once at the end.

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
      // Label check, same rule as the top-level loop: bytes prove the payload, the resolver
      // proves the name. An inner instruction carries no other evidence — it is not in the
      // message — so a mislabelled CPI is invisible unless the same dispatch table is asked
      // to name it again here.
      //
      // Not gated on `isMultiProgram`: the single-program emitter names its CPIs too now.
      // They used to be written as `(unknown)`, which skipped this branch and left every
      // Token CPI unverified by name — the emitter's resolver covered only ComputeBudget
      // and System, so a wrong SPL label would have had nothing to catch it.
      if (match.name) {
        const hit = multiNameFor(match.program, match.data);
        if (!hit || hit.name !== match.name) {
          failures.push(
            `cpi (parent ix ${group.index}, slot ${i}): bytes resolve to ${hit ? hit.name : "(no known instruction)"}, recipe claims ${match.name}`,
          );
          cpiFailures++;
        }
      } else {
        // The other half of the label check. `if (match.name)` above skips every
        // `(unknown)` CPI, and before 6e17cba every CPI the single-program emitter wrote
        // was `(unknown)` — so the branch that proves a label was unreachable for exactly
        // the labels most likely to be wrong. Four Token CPIs of out/remix-3yB9Q1pq.ts sat
        // in that state, nameable from the shipped idl/multi table and never asked.
        // Same rule as 0b at top level: a null result means no IDL covers the program and
        // is left alone; a hit means the recipe withheld a name it had.
        const hit = multiNameFor(match.program, match.data);
        if (hit) {
          failures.push(
            `cpi (parent ix ${group.index}, slot ${i}): labelled (unknown) on ${match.program}, but the shipped IDL set resolves these bytes to ${hit.name}`,
          );
          cpiFailures++;
        }
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
