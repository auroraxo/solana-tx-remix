# Transaction Remix — prototype

One public transaction signature in, one editable, verifiable recipe out.

    node src/remix-from-signature.mjs <signature> [--program <programId>] [--idl <dir>]
    node src/remix-multi.mjs <signature> [--multi-idl <dir>] [--gen-idl <dir>]
    node src/verify-recipe.mjs out/<recipe>.ts
    node src/make-negatives.mjs   # regenerate the negative controls from out/

No private key, no wallet, no signing is involved at any point.

`remix-from-signature.mjs` targets one program (Whirlpool) and names its fields from the
program's generated codecs. `remix-multi.mjs` is the common Solana case — an aggregator
reaching a swap through several programs — and dispatches each instruction (top-level and
CPI) against a directory of per-program IDLs instead of assuming one program's tags.

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
| `arg-flip` | one instruction byte flipped | byte mismatch |
| `dropped` | last instruction removed | instruction count |
| `no-lut` | lookup-table contents stripped | unresolvable account index |
| `wrong-sig` | recipe re-labelled as another signature | instructions absent on chain |
| `multi-arg-flip` | same flip on a multi-program recipe | byte mismatch |
| `inner-flip` | one CPI byte flipped | cpi byte mismatch |
| `inner-dropped` | one CPI removed | cpi present in chain, missing from recipe |
| `native-name-swap` | two real native names swapped (bytes untouched) | bytes decode as a different instruction |
| `native-name-crossprogram` | ComputeBudget label placed on the System instruction | bytes decode as a different instruction |

All nine fail. Six fail with exactly one failure, attributable to the mutation alone:
`arg-flip`, `dropped`, `multi-arg-flip`, `inner-flip`, `inner-dropped`, and
`native-name-crossprogram`. The other three need their count read carefully:
`native-name-swap` reports 2 — the swap wrong-labels both instructions it touches, which
is one declared mutation with two affected rows; `no-lut` reports 83 unresolved indexes
(every index past the static keys, once the table contents are gone); `wrong-sig` reports
13 (instruction count plus one mismatch per instruction, against a transaction with a
different shape). The three recipes in `out/` pass.

The two `native-name-*` controls exist because byte identity cannot see a wrong name: in
both, every byte matches the chain, and only the label is false. Until native decoding was
added to the verifier, each passed.

## Known limits (measured, not guessed)

- Instruction names and argument layouts come from a supplied IDL directory, plus a pinned
  table for the native Solana programs (`src/native.mjs`). Without a source, bytes still
  round-trip but names stay `null` — the tool reports `0/N decoded` rather than inventing
  labels. On `3yB9Q1pq…` the multi-program path names 9 of 10: 4 top-level (ComputeBudget
  `SetComputeUnitLimit`, `SetComputeUnitPrice`, `RequestHeapFrame`, System `Transfer`) and
  all 5 CPI. The one unnamed instruction is Titan (`T1TANpTe…`), an aggregator with no
  published IDL — deliberately left as `(unknown)` rather than guessed from byte position.
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
