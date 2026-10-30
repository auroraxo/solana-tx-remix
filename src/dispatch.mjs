/**
 * dispatch.mjs — the ONE definition of how a multi-program recipe gets its instruction names.
 *
 * Both entry points resolve labels through this module: `remix-multi.mjs` writes them,
 * `verify-recipe.mjs` checks them. They previously did not share it — the verifier counted
 * every name in a multi-program recipe without ever asking whether the bytes support it, so
 * a label relabelled to a different instruction of the same program passed verification
 * unchanged (proved on out/remix-multi-4HZWSH28.ts before this file existed: `swap2` → `swap`
 * on DF1o…7QBH still printed PASS). Byte identity cannot see that: the bytes were never
 * touched. This is the same defect shape as the INNER_BYTES block being defined in two
 * files (fixed by renderInnerBytes/parseInnerBytes) — a check and the artifact it checks
 * must not drift independently, and the way to guarantee that is to have one of them.
 *
 *   import { buildMultiResolver, defaultMultiIdlDir } from "./dispatch.mjs";
 *   const nameFor = buildMultiResolver({ multiIdlDir, genIdlDir });
 *
 * The resolver is per-program: an Anchor 8-byte discriminator is matched before a program's
 * own short tag (a sha256 truncation cannot collide with a 1-byte tag; the reverse reads arg
 * bytes as a tag), native Solana programs fall back to native.mjs because bitquery ships
 * ComputeBudget with an empty instruction list and System with no discriminants at all.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadIdlFromGenerated } from "./remix.mjs";
import { loadProgramDispatch, makeNameResolver } from "./idl-bitquery.mjs";
import { loadStoredProgramTables } from "./sememe-multi.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Programs the Codama-generated codec directory targets one specific program for. */
export const GENERATED_IDL_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

export function defaultMultiIdlDir() {
  return path.resolve(HERE, "..", "idl", "multi");
}

/**
 * A default that does not depend on the caller's cwd: verification is run from wherever
 * the caller happens to be, and a label check that silently loaded an empty IDL set would
 * turn into "everything with a name fails" or, worse, pass by checking nothing.
 */
export function defaultGeneratedIdlDir() {
  return (
    process.env.IDL_GEN_DIR ||
    path.resolve(
      process.env.HOME,
      "github_repos/orca-whirlpools-recon/ts-sdk/client/src/generated/instructions",
    )
  );
}

/**
 * Build `nameFor(program, data)` over a directory of bitquery-formatted IDLs, layered with
 * the Codama-generated Anchor modules for GENERATED_IDL_PROGRAM, with the STORED artifacts
 * layered over both. See {@link buildStoredResolver}.
 *
 * Kept as the documented sync name because it is what callers ask for by shape; it is a
 * thin wrapper so that no caller can accidentally reach a resolver WITHOUT the stored
 * artifacts. The unconditional layering is deliberate: a caller that wants to skip the
 * store does not exist, because "skip the store and use the stale vendored copy" is the
 * failure this module exists to prevent.
 */
export async function buildMultiResolver(options = {}) {
  const { nameFor } = await buildStoredResolver(options);
  return nameFor;
}

/** Programs the dispatch table covers — used by the verifier to say WHY a claim is uncheckable. */
export function multiIdlProgramCount(multiIdlDir) {
  try {
    return loadProgramDispatch(multiIdlDir ?? defaultMultiIdlDir()).size;
  } catch {
    return 0;
  }
}

/** Whether the multi IDL directory is present at all (verifier reports its absence). */
export function multiIdlDirPresent(multiIdlDir) {
  return fs.existsSync(multiIdlDir ?? defaultMultiIdlDir());
}

/**
 * The resolver with the STORED artifacts layered over the vendored IDL copies.
 *
 * Why an overlay and not a replacement: the vendored copies still describe the programs
 * that publish no on-chain Anchor IDL at all (SPL Token, Aquifer, BisonFi, SolFi). For
 * those the checked-in file is the only description available, and pretending otherwise
 * would remove working naming. But for every program the store holds, the stored copy is
 * the fresher and verifiable one, so it wins.
 *
 * The overlay is ADDITIVE within a program: a stored instruction is added to that
 * program's table, and a stored discriminator that the vendored copy also knows keeps
 * the vendored copy's NAME unless the two disagree — and then the conflict is reported
 * rather than silently resolved. A name that changes is a recipe that changes, and the
 * reason has to be visible.
 *
 * Measured on 2026-10-30: over the four programs with an on-chain IDL, the stored and
 * vendored copies agree on every shared discriminator (0 name conflicts), and the stored
 * copies add 3 instructions the vendored copies lack — one of which
 * (`create_idempotent_associated_token_account` on Jupiter AMM v6) appears in real
 * mainnet traffic.
 *
 * Returns `{ nameFor, stored, problems }`. `problems` names every program whose stored
 * artifact could not be used and why; a BROKEN artifact is never quietly replaced by the
 * vendored copy.
 */
export async function buildStoredResolver({ multiIdlDir, genIdlDir, genIdlMap } = {}) {
  const byProgram = loadProgramDispatch(multiIdlDir ?? defaultMultiIdlDir());
  const { tables, problems, conflicts: derivedConflicts } = await loadStoredProgramTables();

  const conflicts = [];
  for (const [address, stored] of tables) {
    const existing = byProgram.get(address);
    if (!existing) {
      // Merged into the PRIMARY table, not into an extras layer consulted only on a miss.
      // CI caught the difference: out/remix-multi-2Wti3kFM.ts was emitted on a machine
      // WITH the generated Whirlpool codec directory and labelled its Whirlpool CPI
      // `SWAP_V2`; the same recipe in CI, with no generated directory, resolved
      // `swap_v2` from the stored artifact and failed its own label check. A label must
      // not depend on which machine emitted it, so the stored artifact wins
      // unconditionally and the generated layer below stays the fallback it always was.
      byProgram.set(address, stored);
      continue;
    }
    // The vendored copy already binds this program. Merge: the stored copy fills gaps
    // and is authoritative where the two disagree on the SAME discriminator.
    const merged = {
      anchor: new Map(existing.anchor),
      tag: new Map(existing.tag),
      sources: new Set([...existing.sources, ...stored.sources]),
    };
    for (const [disc, entry] of stored.anchor) {
      const mine = merged.anchor.get(disc);
      if (mine && mine.name !== entry.name) {
        conflicts.push({ program: address, discriminator: disc, vendored: mine.name, stored: entry.name });
      }
      merged.anchor.set(disc, entry);
    }
    for (const [disc, entry] of stored.tag) {
      const mine = merged.tag.get(disc);
      if (mine && mine.name !== entry.name) {
        conflicts.push({ program: address, discriminator: disc, vendored: mine.name, stored: entry.name });
      }
      merged.tag.set(disc, entry);
    }
    byProgram.set(address, merged);
  }

  const anchorExtra = new Map();
  let generated = genIdlMap instanceof Map ? genIdlMap : new Map();
  if (!(genIdlMap instanceof Map)) {
    const genDir = genIdlDir ?? defaultGeneratedIdlDir();
    try {
      generated = loadIdlFromGenerated(genDir);
    } catch {
      generated = new Map();
    }
  }
  if (generated.size > 0) {
    const p = { anchor: new Map(), tag: new Map(), sources: new Set(["stored IDL"]) };
    for (const [k, v] of generated) p.anchor.set(k, { ...v, scheme: "anchor", tagLen: 8, args: [] });
    anchorExtra.set(GENERATED_IDL_PROGRAM, p);
  }
  return {
    nameFor: makeNameResolver(byProgram, anchorExtra),
    stored: { programs: [...tables.keys()], tables },
    problems,
    conflicts: [...derivedConflicts, ...conflicts],
  };
}
