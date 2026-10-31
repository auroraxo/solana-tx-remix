/**
 * make-negatives.mjs — derive the negative controls from the real recipes.
 *
 * A negative control is only evidence if the mutation is the ONLY difference between it and
 * a recipe that passes. The controls this replaces were hand-copied from an earlier snapshot,
 * so they failed verification for reasons unrelated to their mutation (missing
 * ADDRESS_SPACE_SIZE, unresolved `lookup[N]` placeholders) — a test that fails for the wrong
 * reason proves nothing about the check it is meant to exercise.
 *
 * Each control below is generated from `out/` and differs in exactly one declared way.
 *
 *   node src/make-negatives.mjs
 */
import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve("out");
const negDir = path.resolve("neg");
fs.mkdirSync(negDir, { recursive: true });

/** Find the first `data: "..."` inside the block starting at `export const NAME = {`. */
function firstDataIn(src, exportName) {
  const start = src.indexOf(`export const ${exportName} = {`);
  if (start < 0) throw new Error(`${exportName} block not found`);
  const end = src.indexOf("} as const;", start);
  const rel = src.slice(start, end).indexOf('data: "');
  if (rel < 0) throw new Error(`${exportName} has no data field`);
  const q = start + rel + 'data: "'.length;
  return { start: q, end: src.indexOf('"', q) };
}

/** Flip the last byte of a base64 payload — one byte, nothing else touched. */
function flipLastByte(src, range) {
  const b64 = src.slice(range.start, range.end);
  const buf = Buffer.from(b64, "base64");
  buf[buf.length - 1] ^= 0xff;
  return src.slice(0, range.start) + buf.toString("base64") + src.slice(range.end);
}

/** Remove the last top-level instruction entry from INSTRUCTION_BYTES. */
function dropLastInstruction(src) {
  const start = src.indexOf("export const INSTRUCTION_BYTES = {");
  const end = src.indexOf("} as const;", start);
  const block = src.slice(start, end);
  const last = block.lastIndexOf("\n  ");
  // remove through the trailing comma of that entry
  const trimmed = block.slice(0, last + 1);
  return src.slice(0, start) + trimmed + src.slice(end);
}

/** Replace the label immediately above a given `  <n>: {` entry in INSTRUCTION_BYTES. */
function relabelInstruction(src, index, newLabel) {
  const start = src.indexOf("export const INSTRUCTION_BYTES = {");
  const end = src.indexOf("} as const;", start);
  const block = src.slice(start, end);
  const re = new RegExp(`(\\/\\*\\*\\s*)([^*]+?)(\\s*\\*\\/\\s*\\n\\s*${index}:\\s*\\{)`);
  if (!re.test(block)) throw new Error(`no label found above instruction ${index}`);
  const mutated = block.replace(re, `$1${newLabel}$3`);
  if (mutated === block) throw new Error(`relabel of instruction ${index} changed nothing`);
  return src.slice(0, start) + mutated + src.slice(end);
}

/** Blank a label to `(unknown)` — the state every label check below skips. */
function unlabelInstruction(src, index) {
  const start = src.indexOf("export const INSTRUCTION_BYTES = {");
  const end = src.indexOf("} as const;", start);
  const block = src.slice(start, end);
  const re = new RegExp(`(\\/\\*\\*\\s*)([^*]+?)(\\s*\\*\\/\\s*\\n\\s*${index}:\\s*\\{)`);
  if (!re.test(block)) throw new Error(`no label found above instruction ${index}`);
  const mutated = block.replace(re, `$1(unknown)$3`);
  if (mutated === block) throw new Error(`unlabel of instruction ${index} changed nothing`);
  return src.slice(0, start) + mutated + src.slice(end);
}

/** Blank a CPI label to `(unknown)`, keeping the bytes and the accounts untouched. */
function unlabelInner(src, parentIx, innerIx) {
  const start = src.indexOf("export const INNER_BYTES = {");
  if (start < 0) throw new Error("INNER_BYTES block not found");
  const end = src.indexOf("} as const;", start);
  const block = src.slice(start, end);
  const re = new RegExp(
    `(\\/\\*\\*\\s*)([^*]+?)(\\s*\\*\\/\\s*\\n\\s*\\[${parentIx}\\]\\[${innerIx}\\]:\\s*\\{)`,
  );
  if (!re.test(block)) throw new Error(`no label found above inner [${parentIx}][${innerIx}]`);
  const mutated = block.replace(re, `$1(unknown)$3`);
  if (mutated === block) throw new Error(`unlabel of inner [${parentIx}][${innerIx}] changed nothing`);
  return src.slice(0, start) + mutated + src.slice(end);
}

/** Replace the label immediately above a given `[p][s]: {` entry in INNER_BYTES. */
function relabelInner(src, parentIx, innerIx, newLabel) {
  const start = src.indexOf("export const INNER_BYTES = {");
  if (start < 0) throw new Error("INNER_BYTES block not found");
  const end = src.indexOf("} as const;", start);
  const block = src.slice(start, end);
  const re = new RegExp(
    `(\\/\\*\\*\\s*)([^*]+?)(\\s*\\*\\/\\s*\\n\\s*\\[${parentIx}\\]\\[${innerIx}\\]:\\s*\\{)`,
  );
  if (!re.test(block)) throw new Error(`no label found above inner [${parentIx}][${innerIx}]`);
  const mutated = block.replace(re, `$1${newLabel}$3`);
  if (mutated === block) throw new Error(`relabel of inner [${parentIx}][${innerIx}] changed nothing`);
  return src.slice(0, start) + mutated + src.slice(end);
}

const specs = [
  {
    from: "remix-6754RLWd.ts",
    to: "arg-flip.ts",
    why: "one instruction byte flipped",
    mutate: (s) => flipLastByte(s, firstDataIn(s, "INSTRUCTION_BYTES")),
  },
  {
    from: "remix-6754RLWd.ts",
    to: "dropped.ts",
    why: "last top-level instruction removed",
    mutate: dropLastInstruction,
  },
  {
    from: "remix-6754RLWd.ts",
    to: "no-lut.ts",
    why: "lookup-table contents stripped (indexes still claim to resolve)",
    mutate: (s) =>
      s.replace(
        /export const LOOKUP_TABLE_ADDRESSES = \[[\s\S]*?\] as const;/,
        "export const LOOKUP_TABLE_ADDRESSES = [ ] as const;",
      ),
  },
  {
    from: "remix-6754RLWd.ts",
    to: "wrong-sig.ts",
    why: "recipe re-labelled as a different signature",
    mutate: (s) =>
      s.replace(
        /export const SOURCE_SIGNATURE = "[1-9A-HJ-NP-Za-km-z]+";/,
        'export const SOURCE_SIGNATURE = "5yr3cjjNPu54MeRqYfSyTHfVUfSMwDAFgeyXNTRKRGtueWcCeLwVsBS4uBzFaeTeRgPpn9AVC7dCHWbQCHKNyvkA";',
      ),
  },
  {
    from: "remix-multi-3yB9Q1pq.ts",
    to: "multi-arg-flip.ts",
    why: "one top-level instruction byte flipped (multi-program recipe)",
    mutate: (s) => flipLastByte(s, firstDataIn(s, "INSTRUCTION_BYTES")),
  },
  {
    from: "remix-multi-3yB9Q1pq.ts",
    to: "inner-flip.ts",
    why: "one CPI byte flipped — exercises the inner-instruction check specifically",
    mutate: (s) => flipLastByte(s, firstDataIn(s, "INNER_BYTES")),
  },
  {
    from: "remix-multi-3yB9Q1pq.ts",
    to: "native-name-swap.ts",
    why: "two real native names swapped — bytes correct, label wrong",
    // Byte-identity alone cannot see this: both labels belong to the right program and
    // the payload is untouched. Only a decode-and-re-encode of the native bytes catches it.
    mutate: (s) => relabelInstruction(relabelInstruction(s, 0, "SetComputeUnitPrice"), 1, "SetComputeUnitLimit"),
  },
  {
    from: "remix-multi-3yB9Q1pq.ts",
    to: "native-name-crossprogram.ts",
    why: "ComputeBudget label placed on the System instruction",
    // The name is a real ComputeBudget instruction, so a name-only validity check passes;
    // the program's own scheme is what makes it wrong.
    mutate: (s) => relabelInstruction(s, 2, "RequestHeapFrame"),
  },
  {
    from: "remix-6754RLWd.ts",
    to: "inner-dropped.ts",
    why: "one CPI removed — a recipe that silently drops inner instructions is a summary",
    mutate: (s) => {
      const start = s.indexOf("export const INNER_BYTES = {");
      const end = s.indexOf("} as const;", start);
      const block = s.slice(start, end);
      const last = block.lastIndexOf("\n  ");
      return s.slice(0, start) + block.slice(0, last + 1) + s.slice(end);
    },
  },
  {
    from: "remix-6754RLWd.ts",
    to: "idl-name-top-whirlpool.ts",
    why: "top-level Whirlpool `SWAP_V2` relabelled `SWAP` — bytes untouched, only the label false",
    // The control the stored on-chain IDL exists to enable. `SWAP_V2` and `SWAP` are both
    // real Whirlpool instructions, so a label-only check that trusts the label is blind to
    // this — and the OLD verifier could not even ask: it looked the argument layout up BY
    // the label (`schemaForInstruction(GEN_DIR, name)`), so a false label found a false
    // layout and decoded it happily, then reported named fields as proof. The stored IDL is
    // keyed the other way round: the bytes name their own discriminator, and the name must
    // be the label the recipe ships. Different key order is the whole point — it is what
    // makes this mutation detectable.
    mutate: (s) => relabelInstruction(s, 6, "SWAP"),
  },
  {
    from: "remix-multi-2Wti3kFM.ts",
    to: "idl-name-stored-only.ts",
    why: "an instruction named ONLY by the stored on-chain IDL relabelled from a vendored-only name — bytes untouched",
    // The control for the second migration. `create_idempotent_associated_token_account`
    // is missing from the vendored copy in idl/multi/jupiter-amm/amm.json, so before the
    // stored artifact was layered in, this instruction was emitted as `(unknown)` — and
    // `(unknown)` is a state every name check deliberately skips. Two mutations in one:
    // the label is now false relative to the bytes, AND it is a name the stale vendored
    // copy does not even carry. If the verifier ever falls back to the vendored copy for
    // Jupiter (store absent, or a broken artifact silently replaced), it cannot resolve
    // either label and this control passes — acceptance then goes red, which is the point.
    mutate: (s) => relabelInstruction(s, 0, "create_token_account on JUP6…TaV4"),
  },
  {
    from: "remix-multi-4HZWSH28.ts",
    to: "idl-name-swap2.ts",
    why: "dflow `swap2` relabelled `swap` — bytes untouched, only the label false",
    // Byte identity cannot see this: both names belong to the same program and no payload
    // changed. Before dispatch.mjs was shared, the verifier passed it — the count of named
    // instructions was unconditional for multi-program recipes.
    mutate: (s) => relabelInstruction(s, 2, "swap on DF1o…7QBH"),
  },
  {
    from: "remix-multi-4HZWSH28.ts",
    to: "idl-name-cpi.ts",
    why: "one CPI relabelled `transferChecked` — its bytes are an ordinary `transfer`",
    // The inner entry carries no message-level evidence of its own; only the shared resolver
    // asked to re-name these bytes catches it. Exactly one of the two identical `transfer`
    // labels is mutated so the failure count stays attributable to the single edit.
    mutate: (s) => relabelInner(s, 2, 1, "transferChecked on Toke…Q5DA"),
  },
  {
    from: "remix-6754RLWd.ts",
    to: "single-cpi-name.ts",
    why: "one CPI of a single-program recipe relabelled `transfer` — bytes are `transferChecked`",
    // Same defect shape as idl-name-cpi, one entry point over. The single-program emitter
    // wrote every CPI as `(unknown)` until it was pointed at the same dispatch table the
    // multi emitter uses, and while they were `(unknown)` no relabelled CPI existed to
    // test: the verifier's `isMultiProgram && match.name` guard skipped the branch
    // entirely, so a false SPL label on this recipe would have had nothing to catch it.
    // Once the emitter names them, this control proves the check runs here too.
    mutate: (s) => relabelInner(s, 2, 0, "transfer on Toke…Q5DA"),
  },
  {
    from: "remix-multi-4HZWSH28.ts",
    to: "idl-name-withheld-cpi.ts",
    why: "one CPI label deleted to `(unknown)` while its bytes remain nameable",
    // The other half of the label check, and the one with no coverage until now: every
    // name check is reached through `if (match.name)`, so withholding a name skipped all
    // of them. out/remix-3yB9Q1pq.ts shipped exactly this state for five CPIs and the
    // acceptance suite reported PASSED, because byte-identity is unaffected — the bytes
    // were always right. The mutation is the one an emitter/IDL drift produces in
    // practice: the recipe is not regenerated, the loader gets better, and the label
    // silently lags behind what the tree can now name.
    mutate: (s) => unlabelInner(s, 2, 1),
  },
  {
    from: "remix-multi-4HZWSH28.ts",
    to: "idl-name-withheld-top.ts",
    why: "one top-level label deleted to `(unknown)` while its bytes remain nameable",
    // Same blind spot on the outer loop, which is where `if (!ix.name) continue;` skips
    // every named-field and native check. The recipe under test names this instruction
    // `swap2`, which idl/multi/dflow resolves; blanking the label is not a smaller or
    // weaker statement of the same fact, it is a missing one.
    mutate: (s) => unlabelInstruction(s, 2),
  },
  {
    from: "remix-multi-4HZWSH28.ts",
    to: "event-name-withheld.ts",
    why: "one Anchor event self-CPI label deleted to `(unknown)` while its IDL declares the event",
    // The defect this repository shipped, as a permanent control: an emit_cpi! payload is
    // EVENT_IX_TAG ++ event_discriminator ++ body, so the emitter's instruction table has
    // no match for bytes 0..8 and it writes `(unknown)` — while the very same stored IDL
    // file it already loaded declares `SwapEvent` under those exact 8 bytes at offset 8.
    // The mutation is what the old emitter did on its own: blank the label and acceptance
    // must fail on the recipe's own names, which is what makes the event table in
    // dispatch.mjs a falsifiable claim rather than an assertion.
    mutate: (s) => unlabelInner(s, 2, 3),
  },
  {
    from: "remix-multi-4HZWSH28.ts",
    to: "event-name-wrong.ts",
    why: "an event self-CPI relabelled as an instruction of the emitting program",
    // The opposite direction: a label can be wrong and still look like a name, so it has
    // to be the name the bytes support. An event payload can never be a `swap`: no
    // instruction discriminator of this program can occupy offset 0 here, because the
    // constant EVENT_IX_TAG does. Bytes untouched, label false — and unlike
    // idl-name-swap2 this one must fail against the EVENT table, not the instruction one.
    mutate: (s) => relabelInner(s, 2, 3, "swap on DF1o…7QBH"),
  },
  {
    from: "remix-multi-4HZWSH28.ts",
    to: "wrong-version.ts",
    why: "message version mislabelled `legacy` while every instruction byte is correct",
    // This is the mutation the tool actually shipped. RECIPE_VERSION was written by both
    // emitters and read by nothing, and the classifier it came from keyed on
    // `msg.version === 0` — a field getTransaction omits for every version — so it fell
    // through to `addressTableLookups.length > 0` and called a v0 message with an empty
    // lookup array (and every v1 message) `legacy`.
    //
    // Byte-identity cannot see this: the instructions are identical whatever the message
    // version is called. The recipe then describes a different wire format from the one it
    // was verified against, which is the same class of defect as a withheld instruction
    // name — a true-sounding claim about the transaction that the chain does not support.
    mutate: (s) =>
      s.replace(
        /export const RECIPE_VERSION = "v0";/,
        'export const RECIPE_VERSION = "legacy";',
      ),
  },
  {
    from: "remix-2Apc8uSC.ts",
    to: "event-name-withheld-cpam.ts",
    why: "the cp-amm EvtSwap2 event label deleted to `(unknown)` while the stored IDL declares it",
    // First program of the 30.10 store extension whose EVENT table is pinned by a control.
    // The label was genuinely `(unknown)` in the shipped recipe until the cp-amm on-chain
    // IDL joined idl/sememe-store — this control keeps that gap from reopening silently:
    // if the artifact stops declaring EvtSwap2, the control's failure collapses onto the
    // source recipe's baseline and the no-control-may-go-unjudged gate goes red.
    mutate: (s) => unlabelInner(s, 4, 6),
  },
  {
    from: "remix-2Apc8uSC.ts",
    to: "event-name-withheld-pump.ts",
    why: "the pump.fun TradeEvent event label deleted to `(unknown)` while the stored IDL declares it",
    // Same gap, second program: TradeEvent on 6EF8...wF6P was honestly `(unknown)` in the
    // shipped recipe before its on-chain IDL was pulled. The claim that neither program
    // published an IDL was falsified by pulling both; these two controls are the wire-level
    // memory of that correction.
    mutate: (s) => unlabelInner(s, 4, 27),
  },
  {
    from: "remix-2Apc8uSC.ts",
    to: "v1-as-legacy.ts",
    why: "real SIMD-0385 v1 transaction re-labelled `legacy` — bytes identical, wire format claim false",
    // The v1 half of the same defect, and the one that carried ~37% of mainnet. The
    // classifier keyed on `msg.version === 0`, a field getTransaction omits for every
    // version, then fell through to `addressTableLookups.length > 0` — which is 0 for a
    // v1 message, so every v1 transaction was reported `legacy`. Nothing read the claim
    // back, so nothing noticed: the instructions are byte-identical under either name.
    //
    // wrong-version.ts covers the v0-with-empty-lookup-array side; this covers v1, whose
    // ground truth is the `transactionConfig` key that only a v1 message carries.
    mutate: (s) =>
      s.replace(
        /export const RECIPE_VERSION = "v1";/,
        'export const RECIPE_VERSION = "legacy";',
      ),
  },
  {
    from: "remix-2Apc8uSC.ts",
    to: "idl-name-foreign.ts",
    why: "a Whirlpool `swap` label stamped on a program no shipped IDL describes",
    // The mutation the single-program emitter itself produced on this transaction before
    // the idlMap fallback was gated on the target program: resolveName consulted a flat
    // discriminator -> name table with no program attached, found Whirlpool's
    // `swap` (f8c69e91e17587c8) against cpamdpZCGKUy…1sGG, and wrote `SWAP` into a recipe
    // it then failed to verify — twice, on a real v1 transaction, while acceptance stayed
    // green because no v1 recipe was in out/ for acceptance to run.
    //
    // Stamping it back is what makes the gate falsifiable: if the verifier ever starts
    // trusting a label it cannot re-derive from the program's own IDL, this control passes
    // and acceptance goes red.
    //
    // Note (30.10): cp-amm's on-chain IDL has since joined idl/sememe-store, so the program
    // IS described by a shipped IDL now. The control still fails — as a case-different name
    // (`SWAP` vs the IDL's `swap`) instead of an unresolvable label — and the mutation is
    // unchanged; only the reason acceptance reports for it moved.
    mutate: (s) => relabelInner(s, 4, 3, "SWAP on cpam…1sGG"),
  },
  {
    from: "remix-multi-2Wti3kFM.ts",
    to: "param-value-flip.ts",
    why: "one editable constant changed (slippage_bps 400 -> 401) - the wire bytes untouched",
    // The control for the claim the README makes first: "a plain TypeScript file" a
    // developer edits. Until 31.10. NOTHING compared the emitted constants with the
    // bytes above which they sit - byte-identity compares INSTRUCTION_BYTES with the
    // chain, which this mutation does not touch, so the edited recipe VERIFIED GREEN and
    // rebuilt to a different swap than the one it claims to reproduce.
    //
    // The verifier now re-encodes the recipe's own constants through the program's stored
    // interface and requires byte equality with INSTRUCTION_BYTES (src/params.mjs). This
    // control pins that check: if the re-encode silently stops running, or a value is
    // trusted instead of re-encoded, neg/param-value-flip.ts passes and acceptance goes red.
    mutate: (s) =>
      s.replace(
        "IX1_SHARED_ACCOUNTS_ROUTE_V2_SLIPPAGE_BPS = 400;",
        "IX1_SHARED_ACCOUNTS_ROUTE_V2_SLIPPAGE_BPS = 401;",
      ),
  },
  {
    from: "remix-multi-2Wti3kFM.ts",
    to: "param-field-renamed.ts",
    why: "a constant renamed to a field shared_accounts_route_v2 does not declare",
    // The other direction of the same check: a constant that answers to nothing. A
    // renamed field can no longer be re-encoded (the encoder refuses an unknown argument),
    // and the verifier reports it as naming a field the interface does not declare -
    // rather than skipping a name it happens not to recognise, which would let a typo
    // quietly opt out of the check.
    mutate: (s) =>
      s.replace(
        "IX1_SHARED_ACCOUNTS_ROUTE_V2_SLIPPAGE_BPS",
        "IX1_SHARED_ACCOUNTS_ROUTE_V2_SLIPPAGE_PERCENT",
      ),
  },
];

for (const spec of specs) {
  const srcPath = path.join(outDir, spec.from);
  if (!fs.existsSync(srcPath)) {
    console.error(`SKIP ${spec.to}: ${spec.from} not present (run the emitter first)`);
    continue;
  }
  const src = fs.readFileSync(srcPath, "utf8");
  const mutated = spec.mutate(src);
  if (mutated === src) throw new Error(`mutation for ${spec.to} changed nothing`);
  fs.writeFileSync(path.join(negDir, spec.to), mutated);
  console.log(`wrote neg/${spec.to}  <- ${spec.from}  (${spec.why})`);
}
