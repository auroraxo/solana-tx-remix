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
