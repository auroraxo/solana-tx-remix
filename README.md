# Transaction Remix — prototype

One public transaction signature in, one editable, verifiable recipe out.

    node src/remix-from-signature.mjs <signature> [--program <programId>] [--idl <dir>]
    node src/verify-recipe.mjs out/<recipe>.ts

No private key, no wallet, no signing is involved at any point.

## What the recipe contains

- every instruction's encoded bytes (base64), byte-identical to the chain
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
5. every account index resolves to a real address inside the declared address space.

Verified against mutations: flipped argument byte, dropped instruction, wrong signature,
and stripped lookup-table contents all fail; the unmodified recipe passes.

## Known limits (measured, not guessed)

- Instruction names and argument layouts come from a supplied IDL directory. Without the
  right IDL, bytes still round-trip but names stay `null` — the tool reports `0/N decoded`
  rather than inventing labels.
- Account roles come from the IDL's account order. Where an IDL's order differs from the
  program's real one, labels are wrong even though the bytes are right.
- `remainingAccountsInfo` is reported as raw base64 rather than decoded.
- Compile fees, prioritization fees and blockhash are captured, not remixed.
