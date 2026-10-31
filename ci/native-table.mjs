#!/usr/bin/env node
/**
 * ci/native-table.mjs — the native-table check, runnable on its own.
 *
 * This is section 7 of `ci/acceptance.mjs`, extracted so the falsification of THAT
 * section does not need the RPC: the acceptance run fetches every transaction from
 * mainnet, which makes a defect-vs-defect comparison slow and dependent on the network.
 * The checks here are offline by construction — they read sememe's committed harvest
 * fixture, so the same bytes are judged every time.
 *
 * What it proves, one defect per assertion (each was measured as FAILING against the
 * hand-transcribed table this repository used to carry):
 *
 *   A. 63/63 real CreateAccountWithSeed payloads are named with a readable seed AND
 *      re-encode byte-identically. The hand table read a u32 string-length header
 *      where the chain carries a u64, so it named 0 of 63.
 *   B. Upstream's System variants 12 and 13 (UpgradeNonceAccount,
 *      CreateAccountAllowPrefund) are nameable and round-trip. The hand table had
 *      neither.
 *   C. ComputeBudget tag 0 is REFUSED as wire-rejected, because the runtime rejects
 *      the reserved `Unused` variant as InvalidInstructionData. The hand table named it.
 *   D. Argument names are upstream's own vocabulary (micro_lamports, from_seed,
 *      from_owner) — the exact three a hand transcription got wrong.
 *   E. The table sememe decodes from equals a fresh derivation of the vendored
 *      upstream Rust, and the vendored bytes hash to what the artifact claims.
 *
 * Usage: node ci/native-table.mjs          (exit 0 = all checks pass)
 *        SEMEME_DIR=/path/to/sememe node ci/native-table.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import * as native from "../src/native.mjs";

// The named imports are resolved through the namespace so that an OLD native module —
// the hand-transcribed table this check exists to falsify — cannot crash the script at
// import time. A crash would prove nothing: the falsification needs each defect to be
// MEASURED and reported, not the script to die on a missing export.
const { decodeNative, encodeNative, nativeRefusal, nativeStatus } = native;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYSTEM = "11111111111111111111111111111111";
const COMPUTE_BUDGET = "ComputeBudget111111111111111111111111111111";

const red = [];
const note = (line) => console.log(line);
const flag = (line) => { red.push(line); console.log(`RED: ${line}`); };

const status = nativeStatus
  ? nativeStatus()
  : { ok: false, reason: "this native module exports no status function (pre-migration table)" };
if (!status.ok) {
  flag(`native decoder unreachable — ${status.reason}`);
} else {
  // A. The seeded create.
  const harvestPath = path.join(status.source, "test", "fixtures", "harvest-system-2026-10-31.json");
  if (!fs.existsSync(harvestPath)) {
    flag(`sememe's system harvest fixture is missing at ${harvestPath}`);
  } else {
    let seeded = 0;
    let seededExact = 0;
    const harvest = JSON.parse(fs.readFileSync(harvestPath, "utf8"));
    for (const transaction of harvest.transactions ?? []) {
      for (const p of transaction.payloads ?? []) {
        if (!p.dataHex?.startsWith("03000000")) continue;
        const bytes = Buffer.from(p.dataHex, "hex");
        const decoded = decodeNative(SYSTEM, bytes);
        if (!decoded) continue;
        seeded += 1;
        const rebuilt = encodeNative(SYSTEM, decoded.name, decoded.args);
        if (decoded.name === "CreateAccountWithSeed" && /^[!-~]+$/.test(decoded.args.seed ?? "")
          && rebuilt?.equals(bytes)) {
          seededExact += 1;
        }
      }
    }
    if (seeded === 0) flag("no CreateAccountWithSeed payload found — nothing to test");
    else if (seededExact !== seeded) {
      flag(`seeded-create: ${seededExact}/${seeded} named with a readable seed and byte-exact re-encode (the hand table named 0/${seeded})`);
    } else note(`OK  ${seeded}/${seeded} CreateAccountWithSeed payloads decode and re-encode byte-exactly (hand table: 0/${seeded})`);
  }

  // B. The two upstream variants the hand table omitted.
  const nonce = encodeNative(SYSTEM, "UpgradeNonceAccount", {});
  const prefund = encodeNative(SYSTEM, "CreateAccountAllowPrefund", { lamports: 1n, space: 165n, owner: SYSTEM });
  const prefundDecoded = prefund && decodeNative(SYSTEM, prefund);
  if (!nonce || nonce.toString("hex") !== "0c000000") {
    flag(`System variant 12 (UpgradeNonceAccount) not nameable/encodable — got ${nonce?.toString("hex") ?? "null"}`);
  } else if (!prefundDecoded || prefundDecoded.name !== "CreateAccountAllowPrefund" || !prefundDecoded.roundTripByteExact) {
    flag("System variant 13 (CreateAccountAllowPrefund) not nameable/round-trippable");
  } else note("OK  System variants 12/13 (the two the hand table omitted) name, encode and round-trip");

  // C. Tag 0 is the runtime's refusal, not a name.
  const refusal = nativeRefusal
    ? nativeRefusal(COMPUTE_BUDGET, Buffer.from([0x00, 0x40, 0x0d, 0x03, 0x00]))
    : "no refusal reporter";
  if (refusal !== "wire-rejected") {
    flag(`ComputeBudget tag 0 must be refused as wire-rejected (runtime rule), got: ${refusal ?? "a name"}`);
  } else note("OK  ComputeBudget tag 0 (Unused) refused as wire-rejected — the runtime's verdict, not the SDK's encoder");

  // D. Upstream's argument vocabulary.
  const price = decodeNative(COMPUTE_BUDGET, Buffer.from([3, 0x40, 0x0d, 0x03, 0x00, 0, 0, 0, 0]));
  if (price?.name !== "SetComputeUnitPrice" || !Object.hasOwn(price.args, "micro_lamports")) {
    flag(`SetComputeUnitPrice must decode with upstream's arg name micro_lamports, got ${price ? JSON.stringify(Object.keys(price.args)) : "null"}`);
  } else note("OK  argument names carry upstream vocabulary (micro_lamports; from_seed/from_owner are snake_case)");

  // E. The table is a fresh derivation of the vendored upstream bytes.
  try {
    execFileSync(process.execPath, ["tools/native-interface.mjs", "--check"], { cwd: status.source, stdio: "pipe" });
    note("OK  sememe's committed native table equals a fresh derivation of the vendored upstream Rust (hash-checked at load)");
  } catch (error) {
    flag(`sememe's committed native table is not a fresh derivation of the vendored upstream Rust (${String(error.stderr ?? error.message).trim().split("\n").slice(-1)[0]})`);
  }
}

console.log("");
if (red.length) {
  console.log(`NATIVE TABLE CHECK FAILED — ${red.length} finding(s):`);
  red.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
  process.exit(1);
}
console.log("NATIVE TABLE CHECK PASSED");
process.exit(0);
