# Transaction Remix

[![acceptance](https://github.com/auroraxo/solana-tx-remix/actions/workflows/acceptance.yml/badge.svg)](https://github.com/auroraxo/solana-tx-remix/actions/workflows/acceptance.yml)

One public transaction signature in, one editable, verifiable recipe out.

**Status:** early, run from source. No npm package, no dependencies — a recipe is a plain
TypeScript file you can read, edit and re-verify.

## Quick start

Requires **Node.js 24+**. There is nothing to install: every import is a `node:` builtin.

    git clone https://github.com/auroraxo/solana-tx-remix.git
    cd solana-tx-remix
    node src/verify-recipe.mjs out/remix-multi-4HZWSH28.ts

The last command re-fetches a real mainnet transaction and fails unless the recipe in
`out/` reproduces it byte for byte. Set `SOLANA_RPC` to use your own RPC endpoint instead
of the public `api.mainnet-beta.solana.com`.

    node src/remix-from-signature.mjs <signature> [--program <programId>] [--idl <dir>]
    node src/remix-multi.mjs <signature> [--multi-idl <dir>] [--gen-idl <dir>]
    node src/verify-recipe.mjs out/<recipe>.ts
    node src/make-negatives.mjs   # regenerate the negative controls from out/

No private key, no wallet, no signing is involved at any point.

## Continuous integration

`node ci/acceptance.mjs` is the whole verdict, and GitHub Actions runs it on every push
(`.github/workflows/acceptance.yml`). It asserts three things, each of which can fail:

1. **`neg/` is reproducible from `out/`** — regenerating the controls must change nothing.
   If it does, a control on disk is a mutation of a recipe that is no longer there: it still
   fails, but it no longer proves what its declaration says it proves.
2. **Every recipe in `out/` reproduces its transaction** byte for byte against a fresh RPC
   fetch. A recipe that only fails because the Whirlpool codecs are absent (they are not
   vendored) is reported as `SKIP`, never as a pass.
3. **Every control fails for its own mutation** — the source recipe is run first and its
   failures become the baseline; a control must exceed it. A control that fails only for
   reasons its source already fails for proves nothing, and an unreachable RPC is reported
   as "no verdict" rather than mistaken for a pass.

The same script runs in CI and by hand, so a green badge and a local run are the same
claim. The `no control may go unjudged` step fails the build if the control table and the
`neg/` directory ever disagree, so a control cannot quietly go untested.

`remix-from-signature.mjs` targets one program (Whirlpool) and names its fields from the
program's generated codecs. It needs those codecs on disk — they are not shipped here —
via `--idl <dir>` or `IDL_GEN_DIR`; without them it exits with a message naming the
variable rather than failing mid-run. `remix-multi.mjs` is the common Solana case — an
aggregator reaching a swap through several programs — and dispatches each instruction
(top-level and CPI) against the directory of per-program IDLs **shipped in `idl/multi/`**
in this repo, so it works on a fresh clone with no extra setup.

## What the recipe contains

- every instruction's encoded bytes (base64), byte-identical to the chain
- every **inner (CPI) instruction**'s bytes, keyed `[parent][slot]` — in an aggregator
  transaction the instruction that matters is usually a CPI, and a recipe without them is
  a summary of the transaction rather than the transaction
- instruction names resolved from the program's own generated IDL codecs
- argument fields decoded into named constants (`IX6_SWAP_V2_AMOUNT = 1n`)
- account roles named from the IDL (`WHIRLPOOL`, `TICKARRAY0`, `TOKENVAULTA`)
- the flat address space: static keys plus lookup-table entries, in runtime order

## The acceptance criterion

A recipe is only useful if it *is* the transaction. `verify-recipe.mjs` re-fetches the
transaction from an RPC and fails unless:

1. instruction count matches,
2. every program address matches,
3. every account index list matches,
4. every instruction byte matches,
5. every account index resolves to a real address inside the declared address space,
6. every lookup-table entry matches what the runtime actually loaded,
7. every **inner (CPI)** instruction's program, account list and bytes match
   `meta.innerInstructions`.

The format the emitters write and the verifier reads is defined once (`renderInnerBytes` /
`parseInnerBytes` in `src/remix.mjs`). It was previously defined twice, in two files: the
verifier demanded a block no emitter produced, so all three positive controls failed with
cpi mismatches against instructions the recipes never claimed to hold. A check and the
artifact it checks must not drift independently — that failure mode is invisible in the
check itself, which reports it as a defect in the recipe.

### Negative controls

`neg/` is generated from `out/` by `src/make-negatives.mjs`, so each control differs from a
passing recipe in exactly one declared way. Controls that fail for an unrelated reason are
evidence of nothing; the earlier hand-copied set did exactly that (they failed on a missing
`ADDRESS_SPACE_SIZE`, not on their mutation).

| control | mutation | expected failure |
|---|---|---|
| `arg-flip` | one instruction byte flipped | byte mismatch (1) |
| `dropped` | last instruction removed | instruction count (1) |
| `no-lut` | lookup-table contents stripped | unresolvable account index (83) + LUT ground truth (1) |
| `wrong-sig` | recipe re-labelled as another signature | instructions absent on chain (13) + address space (1) |
| `multi-arg-flip` | same flip on a multi-program recipe | byte mismatch (1) |
| `inner-flip` | one CPI byte flipped | cpi byte mismatch (1) |
| `inner-dropped` | one CPI removed | cpi present in chain, missing from recipe (1) |
| `native-name-swap` | two real native names swapped (bytes untouched) | bytes decode as a different instruction (2) |
| `native-name-crossprogram` | ComputeBudget label placed on the System instruction | bytes decode as a different instruction (1) |
| `idl-name-swap2` | dflow `swap2` relabelled `swap` (bytes untouched) | named instruction has no codec (1) |
| `idl-name-cpi` | one CPI relabelled `transferChecked` (bytes are `transfer`) | named inner has no codec (1) |
| `single-cpi-name` | same relabel on a **single-program** recipe, where CPIs were unlabelled | bytes resolve to `transferChecked`, recipe claims `transfer` (1) |

All twelve fail. Nine fail with exactly one reported failure, attributable to the
mutation alone. The other three carry larger counts for specific reasons:
`native-name-swap` reports 2 — the swap wrong-labels both instructions it touches, which
is one declared mutation with two affected rows; `no-lut` reports 84 (83 unresolved
indexes — every index past the static keys, once the table contents are gone — plus the
LUT ground-truth check that can now see the gap); `wrong-sig` reports 14 (instruction
count, one mismatch per instruction against a transaction with a different shape, and
the declared address space). The last two rows of that count only became reachable
after the early-exit fix described above: criteria 6 and 7 used to be skipped whenever a
top-level check had already failed, so a control whose mutation is in the LUT or a CPI
reported nothing about it. The `single-cpi-name` control exists for the same reason one
level over: as long as the single-program emitter wrote every CPI as `(unknown)`, a false
CPI label on that recipe was untestable — the verifier's label branch was gated on
`isMultiProgram`, so it skipped the entry point entirely. Checked against the released
code, the old verifier **passes** this control and the current one fails it with exactly
one attributable failure. Three of the four recipes in `out/` pass on a fresh clone;
the fourth
(`out/remix-6754RLWd.ts`, single-program Whirlpool) passes once the Whirlpool codec
directory is supplied via `--idl` or `IDL_GEN_DIR`.

The `native-name-*` controls exist because byte identity cannot see a wrong name: in
both, every byte matches the chain, and only the label is false. Until native decoding was
added to the verifier, each passed. The `idl-name-*` controls are the same defect shape
one level up — relabel a multi-program instruction as another of the same program's
instructions, or relabel a CPI's name: bytes are intact, only the label is false. Until
`dispatch.mjs` was shared between emitter and verifier (so the verifier re-resolves the
label through the same IDL tables), each passed.

## How this compares to `@solana/transaction-introspection@8.5.0`

Measured on the same signature (`6754RLWd…YT6`, v0, 10 outer + 14 inner instructions),
not guessed. The fetch/decode layer is commodity and this tool should not pretend
otherwise; the table says where the boundary actually is.

| | `transaction-introspection@8.5.0` + kit clients | this repository |
|---|---|---|
| program / bytes / account lists agree | 24/24, 24/24, 24/24 | 24/24, 24/24, 24/24 |
| wire bytes re-encodable | yes — recomposes the 793-byte RPC transaction exactly | n/a (it verifies, it does not rebuild) |
| resolved accounts incl. lookup tables | yes | yes |
| instructions named, kit clients only | 17/24 — all 7 Whirlpool instructions stay **unnamed**, because `@solana-program/whirlpool` does not exist on npm | 24/24, zero dependencies |
| instructions named, Orca's own client added | 24/24 (needs `@orca-so/whirlpools-client`) | 24/24 |
| editable artifact | no — returns an in-memory object | yes — a plain TypeScript file |
| acceptance check + negative controls | no | 7 checks, 12 generated controls |

So: adopt the commodity layer for what it does (decoding, wire round-trip, native and SPL
naming where a kit client exists), and keep the rest. Naming the **target** program is the
line — Whirlpool has no auto-generated kit client, and a hand-maintained third-party
client is a dependency the Quick-Start deliberately does not have. This repository names
all 24 instructions of its flagship example from shipped IDL tables with no `npm install`.

The same 24/24 byte agreement is also cross-validation: two implementations that never
share a line of code produce identical instruction bytes, account lists and loaded
addresses for this transaction. If either side is wrong, one of them is wrong in the
other's presence.

## Known limits (measured, not guessed)

- Instruction names and argument layouts come from a supplied IDL directory, plus a pinned
  table for the native Solana programs (`src/native.mjs`). Without a source, bytes still
  round-trip but names stay `null` — the tool reports `0/N decoded` rather than inventing
  labels. On `3yB9Q1pq…` the multi-program path names 9 of 10: 4 top-level (ComputeBudget
  `SetComputeUnitLimit`, `SetComputeUnitPrice`, `RequestHeapFrame`, System `Transfer`) and
  all 5 CPI. The one unnamed instruction is Titan (`T1TANpTe…`), an aggregator with no
  published IDL — deliberately left as `(unknown)` rather than guessed from byte position.
  The single-program path names 10 of 10 top-level and 14 of 14 CPI on `6754RLWd…` — it
  used to name 10 of 24, leaving every Token CPI `(unknown)`, because it resolved names
  through `decodeNative` alone (ComputeBudget and System) instead of the dispatch table
  the multi-program emitter writes from. Both entry points now resolve through
  `dispatch.mjs`, so a label means the same thing in either.
- Native programs do not share a selector width: ComputeBudget writes a one-byte
  discriminator (`data[0]`), System uses a four-byte u32 LE bincode tag. Reading either
  with the other's width fails silently — it never errors, it just names nothing. The two
  enums in `src/native.mjs` are pinned to `anza-xyz/solana-sdk@8db406e` and each is
  corroborated by a second independent source, recorded alongside the pin.
- Per-program IDLs ship without addresses (`Aquifer`, `Solfi`, SPL Token). Those are bound
  in `PROGRAM_NAME_ALIASES` in `src/idl-bitquery.mjs`, each a verified executable mainnet
  program. Any new address goes through the same check, not a guess — a wrong binding
  mislabels bytes silently, which is the failure mode the tool exists to catch elsewhere.
- Account roles come from the IDL's account order. Where an IDL's order differs from the
  program's real one, labels are wrong even though the bytes are right.
- `remainingAccountsInfo` is reported as raw base64 rather than decoded.
- Compile fees, prioritization fees and blockhash are captured, not remixed.
- Inner (CPI) instructions are recorded for verification only. Rebuilding the message must
  not append them — they are the parent program's effects, not parts of the signed message.

## Data provenance

- **`idl/multi/*.json`** — instruction IDLs for the programs the recipes in `out/` call
  (Jupiter, DFlow, BisonFi, Token-2022, Aquifer, Solfi, …). These describe deployed
  mainnet programs; the loader in `src/idl-bitquery.mjs` follows the shape shipped by
  `bitquery/solana-idl-lib`.
- **`out/*.ts`, `out/*.json`** — generated from public mainnet RPC. Everything in them is
  already public chain data: real signatures, real program addresses, real instruction
  bytes.
- **`neg/*.ts`** — generated from `out/` by `src/make-negatives.mjs`; mutated copies of the
  passing recipes, not independent transactions.

No Whirlpool-generated codecs are vendored here. The Orca repository relicensed in
February 2025, so the single-program path asks you to point `IDL_GEN_DIR` at codecs you
generated yourself rather than shipping someone else's.

## License

MIT — see `LICENSE`. The programs named in the recipes and IDLs are third-party code;
this repository does not claim them.
