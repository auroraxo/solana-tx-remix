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
 * the Codama-generated Anchor modules for GENERATED_IDL_PROGRAM.
 *
 * A missing generated directory is tolerated (empty map): recipes whose programs are all
 * covered by the bitquery set — the common multi-program case — must still be verifiable
 * on a machine that does not have the Whirlpool workspace checked out. A missing multi IDL
 * directory is NOT tolerated by callers that intend to check labels; loadProgramDispatch
 * returns an empty map for it, and the verifier reports that as an unverifiable claim
 * rather than as a pass.
 */
export function buildMultiResolver({ multiIdlDir, genIdlDir } = {}) {
  const byProgram = loadProgramDispatch(multiIdlDir ?? defaultMultiIdlDir());

  const anchorExtra = new Map();
  const genDir = genIdlDir ?? defaultGeneratedIdlDir();
  let generated = new Map();
  try {
    generated = loadIdlFromGenerated(genDir);
  } catch {
    generated = new Map();
  }
  if (generated.size > 0) {
    const p = { anchor: new Map(), tag: new Map(), sources: new Set([genDir]) };
    for (const [k, v] of generated) p.anchor.set(k, { ...v, scheme: "anchor", tagLen: 8, args: [] });
    anchorExtra.set(GENERATED_IDL_PROGRAM, p);
  }

  return makeNameResolver(byProgram, anchorExtra);
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
