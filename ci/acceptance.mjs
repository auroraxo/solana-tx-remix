#!/usr/bin/env node
/**
 * ci/acceptance.mjs — the CI verdict for Transaction Remix.
 *
 * The README claims six things. This script is the executable form of exactly those
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
 *   5. Two claims a recipe makes about its own transaction are re-derived from the chain
 *      inside src/verify-recipe.mjs, so they apply to out/ and to neg/ alike: the
 *      instruction name the bytes actually carry, and the message version the fields
 *      actually describe.
 *
 *   6. A stored artifact that does not verify is reported, not silently dropped. The
 *      verifier once found that the object did not re-hash to its receipt, declined to
 *      use it, and then passed on the strength of the other decoder alone — a green run
 *      over a tampered artifact. The tampering is now performed deliberately here.
 *
 * Run from the repository root:  node ci/acceptance.mjs
 *
 * Environment: no IDL_GEN_DIR, so no Whirlpool-generated codecs are present. That is the
 * state of a fresh clone and of CI, and the README documents it. A recipe whose only
 * failures are missing-codec failures is reported SKIP, not PASS and not FAIL — it is
 * unverifiable here rather than wrong. If someone sets IDL_GEN_DIR and the recipe then
 * fails for any other reason, that is a real FAIL.
 *
 * Since the sememe migration the flagship recipe is no longer in that category: its
 * arguments are decoded from the vendored, fingerprint-verified on-chain IDL
 * (idl/sememe-store/), so it verifies here instead of reporting SKIP. The SKIP path stays
 * for a machine with neither the generated codecs nor the sememe checkout — but where a
 * sememe store IS reachable, a SKIP for that recipe means the migration silently stopped
 * working, and check 3 below reports it as a failure rather than letting CI look green
 * over an unverified flagship.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unusableIdlFiles } from "../src/idl-bitquery.mjs";
import { sememeStatus, WHIRLPOOL_PROGRAM } from "../src/sememe-idl.mjs";

// Whether the second decoder is reachable on this machine. Resolved once, before the
// recipe loop, so the SKIP verdict below can tell "nothing to verify with" (documented,
// unchanged) from "the migration stopped working" (a finding).
const sememeState = await sememeStatus(WHIRLPOOL_PROGRAM);
const sememeUsable = sememeState.usable;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MULTI_IDL = path.join(ROOT, "idl", "multi");
const VERIFY = path.join(ROOT, "src", "verify-recipe.mjs");
const NEGATIVES = path.join(ROOT, "src", "make-negatives.mjs");
const RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const FETCH_RE = /cannot fetch source transaction|fetch failed|ECONNREFUSED|ECONNRESET|ENOTFOUND|429|502|503|504/i;
const CODEC_RE = /but no generated codec found/;
// A recipe that CAN be verified without the generated codecs: its arguments come from the
// vendored on-chain IDL instead. Before the sememe migration this list was empty and the
// flagship recipe reported SKIP in CI.
const SEMEME_CAPABLE = /^remix-6754RLWd\.ts$/;
const FETCH_ATTEMPTS = 3;

const red = [];
const note = (line) => console.log(line);

// Which decoder state this run is in, printed once so a SKIP and a PASS can be compared
// from the same log.
note(sememeUsable
  ? `sememe store : reachable — ${sememeState.fingerprint}`
  : `sememe store : not usable (${sememeState.reason}) — ${sememeState.error}`);
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
      // Only a finding when the migration could have applied. A machine with no sememe
      // checkout has nothing to migrate TO — that is the documented fresh-clone state and
      // it must keep reporting SKIP rather than turning a missing optional dependency into
      // a red run. When sememe IS reachable and the recipe still SKIPs, the vendored store
      // is missing or unreadable, and the flagship recipe would silently be back to
      // unverified while CI looked green.
      if (SEMEME_CAPABLE.test(r) && sememeUsable) {
        flag(
          `out/${r} has a reachable sememe store and still reports SKIP — ` +
            `the migration is not in effect (is idl/sememe-store/ present?)`,
        );
      }
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

// 5. A tampered store must be reported, never silently fallen back from. This is the
// regression control for a real defect: the verifier used to detect that the stored object
// did not re-hash to its receipt, decline to use it, and then carry on with the other
// decoder — printing PASS. "The check found the damage and the run went green anyway" is
// the exact failure mode this repository exists to catch, so the tampering is now performed
// deliberately, in CI, on every push.
note("\n== 5. a tampered stored artifact is a failure, not a fallback ==");
if (!sememeUsable) {
  // No intact store to tamper with. Same rule as above: absence is a documented state, not
  // a finding — the control simply cannot run here.
  note(`SKIP  no intact store to tamper (sememe ${sememeState.reason}: ${sememeState.error})`);
} else {
  const tampered = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "remix-tamper-")), "store");
  fs.cpSync(path.dirname(sememeState.object), path.join(tampered, "objects"), { recursive: true });
  fs.cpSync(path.join(path.dirname(sememeState.object), "..", "receipts"), path.join(tampered, "receipts"), {
    recursive: true,
  });
  // Valid JSON, different bytes: the object still parses and still has instructions, so
  // the only thing that can catch this is the fingerprint re-check. Cosmetic tampering
  // would otherwise be caught by the parser and would prove nothing about the digest.
  const objectPath = path.join(tampered, "objects", path.basename(sememeState.object));
  const idl = JSON.parse(fs.readFileSync(objectPath, "utf8"));
  const target = idl.instructions.find((i) => Array.isArray(i.args) && i.args.length > 0);
  if (!target) {
    note("SKIP  stored IDL has no instruction with args to tamper with");
  } else {
    target.args[0].type = "tampered";
    fs.writeFileSync(objectPath, JSON.stringify(idl));
    const res = run("node", [VERIFY, "out/remix-6754RLWd.ts"], {
      env: { ...process.env, SEMEME_STORE: tampered },
    });
    const reported = /does not verify/.test(res.out);
    if (res.status === 0) {
      flag(
        "a tampered sememe store object was accepted: verify-recipe.mjs exited 0. " +
          "The verifier detected the damage and fell back — this is the defect 5f31e7a fixed.",
      );
    } else if (!reported) {
      flag(
        `a tampered sememe store object failed verification but was not reported as such ` +
          `(expected "does not verify" in the output):\n      ${res.out.trim().split("\n").slice(0, 3).join("\n      ")}`,
      );
    } else {
      note("FAIL-AS-DECLARED  tampered store object — reported, not fallen back from");
    }

    // The SAME tampering, through the MULTI-program path, which reads the store by a
    // different loader (src/sememe-multi.mjs). This is a separate check because it was a
    // separate defect: that loader read the object the receipt named and never re-hashed
    // it, so a renamed instruction was accepted while the single-program path refused the
    // identical damage. One store with two readers must verify with one strength — the
    // measured failure this check now exists to prevent.
    const multiRes = run("node", [VERIFY, "out/remix-multi-2Wti3kFM.ts"], {
      env: { ...process.env, SEMEME_STORE: tampered },
    });
    const multiReported = /object and receipt disagree|is unusable \(broken\)/.test(multiRes.out);
    if (multiRes.status === 0) {
      flag(
        "a tampered sememe store object was accepted by the MULTI-program path: " +
          "verify-recipe.mjs exited 0 for out/remix-multi-2Wti3kFM.ts. src/sememe-multi.mjs " +
          "does not re-hash the object against its receipt.",
      );
    } else if (!multiReported) {
      flag(
        `the multi-program path failed on the tampered store but did not report it ` +
          `(expected "object and receipt disagree"):\n      ${multiRes.out.trim().split("\n").slice(0, 3).join("\n      ")}`,
      );
    } else {
      note("FAIL-AS-DECLARED  tampered store object on the multi-program path — reported, not fallen back from");
    }
    fs.rmSync(path.dirname(tampered), { recursive: true, force: true });
  }
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
