#!/usr/bin/env node
/**
 * ci/acceptance.mjs — the CI verdict for Transaction Remix.
 *
 * The README claims three things. This script is the executable form of exactly those
 * claims, and nothing else:
 *
 *   1. Every shipped IDL file in idl/multi actually binds something.
 *
 *      Added because of a real green-while-broken: bisonfi.json declared three
 *      instructions with explicit discriminants and bound zero programs, because the loader
 *      read only `address` and that file carries its address under `metadata.address`. Its
 *      instructions rendered `(unknown)` on mainnet and this script still printed
 *      ACCEPTANCE PASSED — every check below looks at recipes, and a recipe whose labels
 *      are `(unknown)` passes the byte-identity check by construction. Nothing asked the
 *      loader whether its tables were reachable.
 *
 *      The check is on the loader, not on the recipes: "did the recipe name it" is
 *      exactly the question that is broken, and it would answer itself in the affirmative.
 *
 *   2. The committed negative controls are reproducible from the committed recipes.
 *      (`neg/` is derived from `out/` by src/make-negatives.mjs; if regenerating it changes
 *      anything, the controls on disk are mutations of a recipe that is no longer there —
 *      they still fail, but they no longer prove what their `why` says they prove. This was
 *      measured as true at 4b1022a: five controls had been left behind by a recipe update.)
 *
 *   3. Every recipe in `out/` reproduces its transaction byte for byte.
 *
 *   4. Every control in `neg/` FAILS, and fails because of its own mutation — not because
 *      the environment broke it. A control that fails only for reasons its source recipe
 *      already fails for is evidence of nothing: that is the exact defect this project
 *      exists to catch, and it is invisible from the exit code alone (rc=1 either way).
 *      The source recipe is therefore run first in the same environment, and its failures
 *      are the baseline the control must exceed.
 *
 * Run from the repository root:  node ci/acceptance.mjs
 *
 * Environment: no IDL_GEN_DIR, so no Whirlpool-generated codecs are present. That is the
 * state of a fresh clone and of CI, and the README documents it. A recipe whose only
 * failures are missing-codec failures is reported SKIP, not PASS and not FAIL — it is
 * unverifiable here rather than wrong. If someone sets IDL_GEN_DIR and the recipe then
 * fails for any other reason, that is a real FAIL.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unusableIdlFiles } from "../src/idl-bitquery.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MULTI_IDL = path.join(ROOT, "idl", "multi");
const VERIFY = path.join(ROOT, "src", "verify-recipe.mjs");
const NEGATIVES = path.join(ROOT, "src", "make-negatives.mjs");
const RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const FETCH_RE = /cannot fetch source transaction|fetch failed|ECONNREFUSED|ECONNRESET|ENOTFOUND|429|502|503|504/i;
const CODEC_RE = /but no generated codec found/;
const FETCH_ATTEMPTS = 3;

const red = [];
const note = (line) => console.log(line);
const flag = (line) => (red.push(line), console.log(`RED: ${line}`));

function run(cmd, argv, opts = {}) {
  const r = spawnSync(cmd, argv, { cwd: ROOT, encoding: "utf8", ...opts });
  return { status: r.status ?? 1, out: `${r.stdout || ""}${r.stderr || ""}` };
}

/** Run one verification, retrying only the failure mode that means "the network said no". */
function verify(recipePath, attempts = FETCH_ATTEMPTS) {
  let last;
  for (let i = 0; i < attempts; i++) {
    last = run("node", [VERIFY, recipePath]);
    if (!FETCH_RE.test(last.out)) return { ...last, fetchFailed: false };
    if (i < attempts - 1) {
      note(`  ... ${path.basename(recipePath)}: transport failure, retry ${i + 1}/${attempts - 1}`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
    }
  }
  return { ...last, fetchFailed: true };
}

/** The `  - ...` failure lines, minus the recipe/path header noise. */
const failureLines = (out) => out.split("\n").filter((l) => l.startsWith("  - "));

/** Controls are declared in src/make-negatives.mjs; read `from`/`to` from that table. */
function controlSources() {
  const src = fs.readFileSync(NEGATIVES, "utf8");
  const pairs = [...src.matchAll(/from:\s*"([^"]+)",\s*to:\s*"([^"]+)"/g)].map((m) => ({
    from: m[1],
    to: m[2],
  }));
  if (pairs.length === 0) throw new Error("no control specs parsed from src/make-negatives.mjs");
  return pairs;
}

// 1. Loader reachability: every shipped IDL must bind at least one program.
note("== 1. idl/multi reachability ==");
const dropped = unusableIdlFiles(MULTI_IDL);
if (dropped.length === 0) {
  note("OK  every shipped IDL binds a program");
} else {
  for (const d of dropped) flag(`idl/multi/${d} — shipped but unusable; its instructions render (unknown)`);
}

// 2. Provenance: regenerating neg/ from out/ must change nothing.
note("\n== 2. neg/ is reproducible from out/ ==");
const gen = run("node", [NEGATIVES]);
if (gen.status !== 0) {
  flag(`src/make-negatives.mjs exited ${gen.status}: ${gen.out.trim().split("\n").slice(-1)[0]}`);
} else {
  const dirty = run("git", ["status", "--porcelain", "--", "neg/"]).out.trim();
  if (dirty) {
    flag(`neg/ is not reproducible from out/ — regeneration changed:\n${dirty}`);
  } else {
    note("OK  controls regenerate byte-identically");
  }
}

// 3. Positives: every recipe in out/ must reproduce its transaction.
note("\n== 3. positive controls (out/) ==");
const recipes = fs.readdirSync(path.join(ROOT, "out")).filter((f) => f.endsWith(".ts")).sort();
if (recipes.length === 0) flag("out/ contains no recipes");
for (const r of recipes) {
  const res = verify(`out/${r}`);
  if (res.fetchFailed) {
    flag(`out/${r}: could not reach the RPC after ${FETCH_ATTEMPTS} attempts — no verdict, not a pass`);
  } else if (res.status === 0) {
    note(`PASS  out/${r}`);
  } else {
    const lines = failureLines(res.out);
    const codecOnly = lines.length > 0 && lines.every((l) => CODEC_RE.test(l));
    if (codecOnly) {
      note(`SKIP  out/${r} — needs IDL_GEN_DIR (Whirlpool codecs are not vendored; README documents this)`);
    } else {
      flag(`out/${r} does not reproduce its transaction:\n${lines.map((l) => `      ${l.trim()}`).join("\n")}`);
    }
  }
}

// 4. Negatives: each must fail beyond what its own source recipe already fails for.
note("\n== 4. negative controls (neg/) — must fail for their own reason ==");
const controls = controlSources();
const baselines = new Map(); // source recipe -> failure lines in this environment
for (const { from, to } of controls) {
  if (!baselines.has(from)) {
    const base = verify(`out/${from}`);
    if (base.fetchFailed) {
      flag(`baseline out/${from}: could not reach the RPC — cannot judge neg/${to}`);
      baselines.set(from, null);
      continue;
    }
    baselines.set(from, { rc: base.status, lines: failureLines(base.out) });
  }
  const baseline = baselines.get(from);
  if (baseline === null) continue;

  const res = verify(`neg/${to}`);
  if (res.fetchFailed) {
    flag(`neg/${to}: could not reach the RPC after ${FETCH_ATTEMPTS} attempts — no verdict`);
    continue;
  }
  if (res.status === 0) {
    flag(`neg/${to} PASSED verification — the check no longer exercises its mutation`);
    continue;
  }
  const lines = failureLines(res.out);
  const baselineSet = new Set(baseline.lines);
  const attributable = lines.filter((l) => !baselineSet.has(l));
  if (attributable.length === 0) {
    flag(
      `neg/${to} fails only for reasons out/${from} already fails for ` +
        `(baseline: ${baseline.lines.length} line(s)) — the mutation is unproven here`,
    );
    continue;
  }
  note(`FAIL-AS-DECLARED  neg/${to}  (+${attributable.length} beyond baseline: ${attributable[0].trim()})`);
}

// Verdict.
console.log("");
if (red.length) {
  console.log(`ACCEPTANCE FAILED — ${red.length} finding(s):`);
  red.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
  process.exit(1);
}
console.log("ACCEPTANCE PASSED");
process.exit(0);
