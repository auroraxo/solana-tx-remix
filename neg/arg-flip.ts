/**
 * Remixed from a public Solana transaction. No private key was used or needed.
 *
 * source signature : 6754RLWddRPsWvTV2eR6Bao9UA6jYi9FACKWtbdNWaYUsHZjskrjwko7caLrvWjZozpgg9YFVsmafktf6ebKrYT6
 * slot / blockTime : 459384503 / 2026-10-20T21:47:09.000Z
 * message version  : v0
 * fee payer        : 2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p
 * pool account     : CsftscgBmHuxc21r1FUCRXDFhfdzFJQTXTXSPwnGcZAa (653 bytes, owner whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc)
 *
 * This file is generated, then meant to be edited. Verification:
 *   node src/verify-recipe.mjs out/remix-6754RLWd.ts
 * verifies the encoded bytes still match the chain byte for byte.
 */

// ------------------------------------------------------------- editable parameters

/** ix 2: DECREASE_LIQUIDITY_V2 — 15 accounts */
export const IX2_DECREASE_LIQUIDITY_V2_LIQUIDITYAMOUNT = 2152817907718n; // liquidityAmount
export const IX2_DECREASE_LIQUIDITY_V2_TOKENMINA = 0n; // tokenMinA
export const IX2_DECREASE_LIQUIDITY_V2_TOKENMINB = 0n; // tokenMinB
export const IX2_DECREASE_LIQUIDITY_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX2_WHIRLPOOL                    = "CsftscgBmHuxc21r1FUCRXDFhfdzFJQTXTXSPwnGcZAa"; // [0] w
export const IX2_TOKENPROGRAMA                = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"; // [1] r
export const IX2_TOKENPROGRAMB                = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"; // [2] r
export const IX2_MEMOPROGRAM                  = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"; // [3] r
export const IX2_POSITIONAUTHORITY            = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [4] w
export const IX2_POSITION                     = "DF8D4ffCf1sgSG3BUdFGjHo13subcgiJXX4sPndLmtzn"; // [5] w
export const IX2_POSITIONTOKENACCOUNT         = "BexkSwE2NA3mfj1Ze3iauGyy2Zw4XF58DdB6mcKQDPKP"; // [6] r
export const IX2_TOKENMINTA                   = "So11111111111111111111111111111111111111112"; // [7] r
export const IX2_TOKENMINTB                   = "D42TjMjz5H7toPu5md5KBXreZkCSdZMEfLQwmBhJXvb1"; // [8] r
export const IX2_TOKENOWNERACCOUNTA           = "NkWwsEcDcBd8oL1XYUnYdbYGxzc2K3KyYHdFvUMRYAd"; // [9] w
export const IX2_TOKENOWNERACCOUNTB           = "YJbdN1mUHKvQGcCUK6t8ndUmZ3YPeaerUyhjEKzE5NV"; // [10] w
export const IX2_TOKENVAULTA                  = "FLqsiZSZpAoiuUVubAgueMEoDtKfkot32wcnEYLhobiU"; // [11] w
export const IX2_TOKENVAULTB                  = "E8yvEJPx1WgqDepWN7Luh2qreAvNepaZmGqKcim9L8hw"; // [12] w
export const IX2_TICKARRAYLOWER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [13] w
export const IX2_TICKARRAYUPPER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [14] w
export const IX2_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/** ix 3: COLLECT_FEES_V2 — 13 accounts */
export const IX3_COLLECT_FEES_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX3_WHIRLPOOL                    = "CsftscgBmHuxc21r1FUCRXDFhfdzFJQTXTXSPwnGcZAa"; // [0] w
export const IX3_POSITIONAUTHORITY            = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [1] w
export const IX3_POSITION                     = "DF8D4ffCf1sgSG3BUdFGjHo13subcgiJXX4sPndLmtzn"; // [2] w
export const IX3_POSITIONTOKENACCOUNT         = "BexkSwE2NA3mfj1Ze3iauGyy2Zw4XF58DdB6mcKQDPKP"; // [3] r
export const IX3_TOKENMINTA                   = "So11111111111111111111111111111111111111112"; // [4] r
export const IX3_TOKENMINTB                   = "D42TjMjz5H7toPu5md5KBXreZkCSdZMEfLQwmBhJXvb1"; // [5] r
export const IX3_TOKENOWNERACCOUNTA           = "NkWwsEcDcBd8oL1XYUnYdbYGxzc2K3KyYHdFvUMRYAd"; // [6] w
export const IX3_TOKENVAULTA                  = "FLqsiZSZpAoiuUVubAgueMEoDtKfkot32wcnEYLhobiU"; // [7] w
export const IX3_TOKENOWNERACCOUNTB           = "YJbdN1mUHKvQGcCUK6t8ndUmZ3YPeaerUyhjEKzE5NV"; // [8] w
export const IX3_TOKENVAULTB                  = "E8yvEJPx1WgqDepWN7Luh2qreAvNepaZmGqKcim9L8hw"; // [9] w
export const IX3_TOKENPROGRAMA                = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"; // [10] r
export const IX3_TOKENPROGRAMB                = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"; // [11] r
export const IX3_MEMOPROGRAM                  = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"; // [12] r
export const IX3_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/** ix 4: DECREASE_LIQUIDITY_V2 — 15 accounts */
export const IX4_DECREASE_LIQUIDITY_V2_LIQUIDITYAMOUNT = 8490158166249n; // liquidityAmount
export const IX4_DECREASE_LIQUIDITY_V2_TOKENMINA = 0n; // tokenMinA
export const IX4_DECREASE_LIQUIDITY_V2_TOKENMINB = 0n; // tokenMinB
export const IX4_DECREASE_LIQUIDITY_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX4_WHIRLPOOL                    = "CsftscgBmHuxc21r1FUCRXDFhfdzFJQTXTXSPwnGcZAa"; // [0] w
export const IX4_TOKENPROGRAMA                = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"; // [1] r
export const IX4_TOKENPROGRAMB                = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"; // [2] r
export const IX4_MEMOPROGRAM                  = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"; // [3] r
export const IX4_POSITIONAUTHORITY            = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [4] w
export const IX4_POSITION                     = "T2HhqNDg6RcHfTQicUx4kAqic7Py9sekFC8sixquJEf"; // [5] w
export const IX4_POSITIONTOKENACCOUNT         = "5tzySv6M5tJeFKuysvw8ENei3LkH23tX634fsYXn5vZ6"; // [6] r
export const IX4_TOKENMINTA                   = "So11111111111111111111111111111111111111112"; // [7] r
export const IX4_TOKENMINTB                   = "D42TjMjz5H7toPu5md5KBXreZkCSdZMEfLQwmBhJXvb1"; // [8] r
export const IX4_TOKENOWNERACCOUNTA           = "NkWwsEcDcBd8oL1XYUnYdbYGxzc2K3KyYHdFvUMRYAd"; // [9] w
export const IX4_TOKENOWNERACCOUNTB           = "YJbdN1mUHKvQGcCUK6t8ndUmZ3YPeaerUyhjEKzE5NV"; // [10] w
export const IX4_TOKENVAULTA                  = "FLqsiZSZpAoiuUVubAgueMEoDtKfkot32wcnEYLhobiU"; // [11] w
export const IX4_TOKENVAULTB                  = "E8yvEJPx1WgqDepWN7Luh2qreAvNepaZmGqKcim9L8hw"; // [12] w
export const IX4_TICKARRAYLOWER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [13] w
export const IX4_TICKARRAYUPPER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [14] w
export const IX4_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/** ix 5: COLLECT_FEES_V2 — 13 accounts */
export const IX5_COLLECT_FEES_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX5_WHIRLPOOL                    = "CsftscgBmHuxc21r1FUCRXDFhfdzFJQTXTXSPwnGcZAa"; // [0] w
export const IX5_POSITIONAUTHORITY            = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [1] w
export const IX5_POSITION                     = "T2HhqNDg6RcHfTQicUx4kAqic7Py9sekFC8sixquJEf"; // [2] w
export const IX5_POSITIONTOKENACCOUNT         = "5tzySv6M5tJeFKuysvw8ENei3LkH23tX634fsYXn5vZ6"; // [3] r
export const IX5_TOKENMINTA                   = "So11111111111111111111111111111111111111112"; // [4] r
export const IX5_TOKENMINTB                   = "D42TjMjz5H7toPu5md5KBXreZkCSdZMEfLQwmBhJXvb1"; // [5] r
export const IX5_TOKENOWNERACCOUNTA           = "NkWwsEcDcBd8oL1XYUnYdbYGxzc2K3KyYHdFvUMRYAd"; // [6] w
export const IX5_TOKENVAULTA                  = "FLqsiZSZpAoiuUVubAgueMEoDtKfkot32wcnEYLhobiU"; // [7] w
export const IX5_TOKENOWNERACCOUNTB           = "YJbdN1mUHKvQGcCUK6t8ndUmZ3YPeaerUyhjEKzE5NV"; // [8] w
export const IX5_TOKENVAULTB                  = "E8yvEJPx1WgqDepWN7Luh2qreAvNepaZmGqKcim9L8hw"; // [9] w
export const IX5_TOKENPROGRAMA                = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"; // [10] r
export const IX5_TOKENPROGRAMB                = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"; // [11] r
export const IX5_MEMOPROGRAM                  = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"; // [12] r
export const IX5_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/** ix 6: SWAP_V2 — 15 accounts */
export const IX6_SWAP_V2_AMOUNT = 1n; // amount
export const IX6_SWAP_V2_OTHERAMOUNTTHRESHOLD = 0n; // otherAmountThreshold
export const IX6_SWAP_V2_SQRTPRICELIMIT = 133001992603523192326n; // sqrtPriceLimit
export const IX6_SWAP_V2_AMOUNTSPECIFIEDISINPUT = true;
export const IX6_SWAP_V2_ATOB = true;
export const IX6_SWAP_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX6_TOKENPROGRAMA                = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"; // [0] r
export const IX6_TOKENPROGRAMB                = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"; // [1] r
export const IX6_MEMOPROGRAM                  = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"; // [2] r
export const IX6_TOKENAUTHORITY               = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [3] w
export const IX6_WHIRLPOOL                    = "CsftscgBmHuxc21r1FUCRXDFhfdzFJQTXTXSPwnGcZAa"; // [4] w
export const IX6_TOKENMINTA                   = "So11111111111111111111111111111111111111112"; // [5] r
export const IX6_TOKENMINTB                   = "D42TjMjz5H7toPu5md5KBXreZkCSdZMEfLQwmBhJXvb1"; // [6] r
export const IX6_TOKENOWNERACCOUNTA           = "NkWwsEcDcBd8oL1XYUnYdbYGxzc2K3KyYHdFvUMRYAd"; // [7] w
export const IX6_TOKENVAULTA                  = "FLqsiZSZpAoiuUVubAgueMEoDtKfkot32wcnEYLhobiU"; // [8] w
export const IX6_TOKENOWNERACCOUNTB           = "YJbdN1mUHKvQGcCUK6t8ndUmZ3YPeaerUyhjEKzE5NV"; // [9] w
export const IX6_TOKENVAULTB                  = "E8yvEJPx1WgqDepWN7Luh2qreAvNepaZmGqKcim9L8hw"; // [10] w
export const IX6_TICKARRAY0                   = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [11] w
export const IX6_TICKARRAY1                   = "9uNtbDTFkoXNgWUPs7yuVcGMW1b4Yiw1zanNDfF2s7Pv"; // [12] w
export const IX6_TICKARRAY2                   = "Bi5Lz2PTkCKJkbADUWaLbCq36V5EFvDo1UaqbSpLhQQc"; // [13] w
export const IX6_ORACLE                       = "2VMt1BvpoUAD2AbExfHiuFJanyNUsAuWRmMdY2MB7g4h"; // [14] w
export const IX6_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/** ix 7: INCREASE_LIQUIDITY_V2 — 15 accounts */
export const IX7_INCREASE_LIQUIDITY_V2_LIQUIDITYAMOUNT = 8489515510538n; // liquidityAmount
export const IX7_INCREASE_LIQUIDITY_V2_TOKENMAXA = 0n; // tokenMaxA
export const IX7_INCREASE_LIQUIDITY_V2_TOKENMAXB = 24409992722n; // tokenMaxB
export const IX7_INCREASE_LIQUIDITY_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX7_WHIRLPOOL                    = "CsftscgBmHuxc21r1FUCRXDFhfdzFJQTXTXSPwnGcZAa"; // [0] w
export const IX7_TOKENPROGRAMA                = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"; // [1] r
export const IX7_TOKENPROGRAMB                = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"; // [2] r
export const IX7_MEMOPROGRAM                  = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"; // [3] r
export const IX7_POSITIONAUTHORITY            = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [4] w
export const IX7_POSITION                     = "DF8D4ffCf1sgSG3BUdFGjHo13subcgiJXX4sPndLmtzn"; // [5] w
export const IX7_POSITIONTOKENACCOUNT         = "BexkSwE2NA3mfj1Ze3iauGyy2Zw4XF58DdB6mcKQDPKP"; // [6] r
export const IX7_TOKENMINTA                   = "So11111111111111111111111111111111111111112"; // [7] r
export const IX7_TOKENMINTB                   = "D42TjMjz5H7toPu5md5KBXreZkCSdZMEfLQwmBhJXvb1"; // [8] r
export const IX7_TOKENOWNERACCOUNTA           = "NkWwsEcDcBd8oL1XYUnYdbYGxzc2K3KyYHdFvUMRYAd"; // [9] w
export const IX7_TOKENOWNERACCOUNTB           = "YJbdN1mUHKvQGcCUK6t8ndUmZ3YPeaerUyhjEKzE5NV"; // [10] w
export const IX7_TOKENVAULTA                  = "FLqsiZSZpAoiuUVubAgueMEoDtKfkot32wcnEYLhobiU"; // [11] w
export const IX7_TOKENVAULTB                  = "E8yvEJPx1WgqDepWN7Luh2qreAvNepaZmGqKcim9L8hw"; // [12] w
export const IX7_TICKARRAYLOWER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [13] w
export const IX7_TICKARRAYUPPER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [14] w
export const IX7_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/** ix 8: INCREASE_LIQUIDITY_V2 — 15 accounts */
export const IX8_INCREASE_LIQUIDITY_V2_LIQUIDITYAMOUNT = 8490158166249n; // liquidityAmount
export const IX8_INCREASE_LIQUIDITY_V2_TOKENMAXA = 469571750n; // tokenMaxA
export const IX8_INCREASE_LIQUIDITY_V2_TOKENMAXB = 0n; // tokenMaxB
export const IX8_INCREASE_LIQUIDITY_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX8_WHIRLPOOL                    = "CsftscgBmHuxc21r1FUCRXDFhfdzFJQTXTXSPwnGcZAa"; // [0] w
export const IX8_TOKENPROGRAMA                = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"; // [1] r
export const IX8_TOKENPROGRAMB                = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"; // [2] r
export const IX8_MEMOPROGRAM                  = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"; // [3] r
export const IX8_POSITIONAUTHORITY            = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [4] w
export const IX8_POSITION                     = "T2HhqNDg6RcHfTQicUx4kAqic7Py9sekFC8sixquJEf"; // [5] w
export const IX8_POSITIONTOKENACCOUNT         = "5tzySv6M5tJeFKuysvw8ENei3LkH23tX634fsYXn5vZ6"; // [6] r
export const IX8_TOKENMINTA                   = "So11111111111111111111111111111111111111112"; // [7] r
export const IX8_TOKENMINTB                   = "D42TjMjz5H7toPu5md5KBXreZkCSdZMEfLQwmBhJXvb1"; // [8] r
export const IX8_TOKENOWNERACCOUNTA           = "NkWwsEcDcBd8oL1XYUnYdbYGxzc2K3KyYHdFvUMRYAd"; // [9] w
export const IX8_TOKENOWNERACCOUNTB           = "YJbdN1mUHKvQGcCUK6t8ndUmZ3YPeaerUyhjEKzE5NV"; // [10] w
export const IX8_TOKENVAULTA                  = "FLqsiZSZpAoiuUVubAgueMEoDtKfkot32wcnEYLhobiU"; // [11] w
export const IX8_TOKENVAULTB                  = "E8yvEJPx1WgqDepWN7Luh2qreAvNepaZmGqKcim9L8hw"; // [12] w
export const IX8_TICKARRAYLOWER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [13] w
export const IX8_TICKARRAYUPPER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [14] w
export const IX8_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

// ---------------------------------------------------------------- transaction

export const SOURCE_SIGNATURE = "6754RLWddRPsWvTV2eR6Bao9UA6jYi9FACKWtbdNWaYUsHZjskrjwko7caLrvWjZozpgg9YFVsmafktf6ebKrYT6";
export const SOURCE_SLOT = 459384503;
export const FEE_PAYER = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p";
export const RECIPE_VERSION = "v0";

/** 8 static account keys, in message order. */
export const ACCOUNTS = [
  "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p", // [0]
  "9uNtbDTFkoXNgWUPs7yuVcGMW1b4Yiw1zanNDfF2s7Pv", // [1]
  "Bi5Lz2PTkCKJkbADUWaLbCq36V5EFvDo1UaqbSpLhQQc", // [2]
  "D2L6yPZ2FmmmTKPgzaMKdhu6EWZcTpLy1Vhx8uvZe7NZ", // [3]
  "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw", // [4]
  "11111111111111111111111111111111", // [5]
  "ComputeBudget111111111111111111111111111111", // [6]
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // [7]
] as const;

/**
 * Flat address space: static keys, then each lookup table's writable entries, then
 * its readonly entries. Instruction account indexes address this array, which is why
 * this transaction needs the table contents.
 */
export const LOOKUP_TABLE_ADDRESSES = [
  "NkWwsEcDcBd8oL1XYUnYdbYGxzc2K3KyYHdFvUMRYAd", // table 0 writable[0]
  "T2HhqNDg6RcHfTQicUx4kAqic7Py9sekFC8sixquJEf", // table 0 writable[1]
  "YJbdN1mUHKvQGcCUK6t8ndUmZ3YPeaerUyhjEKzE5NV", // table 0 writable[2]
  "2VMt1BvpoUAD2AbExfHiuFJanyNUsAuWRmMdY2MB7g4h", // table 0 writable[3]
  "CsftscgBmHuxc21r1FUCRXDFhfdzFJQTXTXSPwnGcZAa", // table 0 writable[4]
  "DF8D4ffCf1sgSG3BUdFGjHo13subcgiJXX4sPndLmtzn", // table 0 writable[5]
  "E8yvEJPx1WgqDepWN7Luh2qreAvNepaZmGqKcim9L8hw", // table 0 writable[6]
  "FLqsiZSZpAoiuUVubAgueMEoDtKfkot32wcnEYLhobiU", // table 0 writable[7]
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", // table 0 readonly[0]
  "So11111111111111111111111111111111111111112", // table 0 readonly[1]
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // table 0 readonly[2]
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // table 0 readonly[3]
  "5tzySv6M5tJeFKuysvw8ENei3LkH23tX634fsYXn5vZ6", // table 0 readonly[4]
  "BexkSwE2NA3mfj1Ze3iauGyy2Zw4XF58DdB6mcKQDPKP", // table 0 readonly[5]
  "D42TjMjz5H7toPu5md5KBXreZkCSdZMEfLQwmBhJXvb1", // table 0 readonly[6]
] as const;

export const ADDRESS_SPACE_SIZE = 23;

export const INSTRUCTION_BYTES = {
  /** SetComputeUnitLimit */
  0: {
    program: "ComputeBudget111111111111111111111111111111",
    accounts: [],
    data: "AoAaBv8=",
  },
  /** SetComputeUnitPrice */
  1: {
    program: "ComputeBudget111111111111111111111111111111",
    accounts: [],
    data: "A+gDAAAAAAAA",
  },
  /** DECREASE_LIQUIDITY_V2 */
  2: {
    program: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    accounts: [12, 18, 19, 16, 0, 13, 21, 17, 22, 8, 10, 15, 14, 4, 4],
    data: "On+8Pk9SxGAGWPI99QEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  },
  /** COLLECT_FEES_V2 */
  3: {
    program: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    accounts: [12, 0, 13, 21, 17, 22, 8, 15, 10, 14, 18, 19, 16],
    data: "z3Vfv+W04g8A",
  },
  /** DECREASE_LIQUIDITY_V2 */
  4: {
    program: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    accounts: [12, 18, 19, 16, 0, 9, 20, 17, 22, 8, 10, 15, 14, 4, 4],
    data: "On+8Pk9SxGDpkNzEuAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  },
  /** COLLECT_FEES_V2 */
  5: {
    program: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    accounts: [12, 0, 9, 20, 17, 22, 8, 15, 10, 14, 18, 19, 16],
    data: "z3Vfv+W04g8A",
  },
  /** SWAP_V2 */
  6: {
    program: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    accounts: [18, 19, 16, 0, 12, 17, 22, 8, 15, 10, 14, 4, 1, 2, 11],
    data: "KwTtCxrJHmIBAAAAAAAAAAAAAAAAAAAABpYhIJn/xTUHAAAAAAAAAAEBAA==",
  },
  /** INCREASE_LIQUIDITY_V2 */
  7: {
    program: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    accounts: [12, 18, 19, 16, 0, 13, 21, 17, 22, 8, 10, 15, 14, 4, 4],
    data: "hR1Z30XusAoKa46euAcAAAAAAAAAAAAAAAAAAAAAAAAS7vKuBQAAAAA=",
  },
  /** INCREASE_LIQUIDITY_V2 */
  8: {
    program: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    accounts: [12, 18, 19, 16, 0, 9, 20, 17, 22, 8, 10, 15, 14, 4, 4],
    data: "hR1Z30XusArpkNzEuAcAAAAAAAAAAAAAphj9GwAAAAAAAAAAAAAAAAA=",
  },
  /** Transfer */
  9: {
    program: "11111111111111111111111111111111",
    accounts: [0, 3],
    data: "AgAAAIgTAAAAAAAA",
  },
} as const;

/**
 * Inner (CPI) instructions the chain executed, keyed [parent instruction][slot].
 * Verification-only: rebuilding the message must NOT append these — they are
 * effects of the parent program's CPI, not parts of the signed message.
 * Account indexes address the same flat space as INSTRUCTION_BYTES.
 */
export const INNER_BYTES = {
  /** transferChecked on Toke…Q5DA */
  [2][0]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [15, 17, 8, 12],
    data: "DAAAAAAAAAAACQ==",
  },
  /** transferChecked on Toke…xuEb */
  [2][1]: {
    program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    accounts: [14, 22, 10, 12],
    data: "DAE19HABAAAABg==",
  },
  /** transferChecked on Toke…Q5DA */
  [3][0]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [15, 17, 8, 12],
    data: "DAAAAAAAAAAACQ==",
  },
  /** transferChecked on Toke…xuEb */
  [3][1]: {
    program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    accounts: [14, 22, 10, 12],
    data: "DAAAAAAAAAAABg==",
  },
  /** transferChecked on Toke…Q5DA */
  [4][0]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [15, 17, 8, 12],
    data: "DFB7dAUAAAAACQ==",
  },
  /** transferChecked on Toke…xuEb */
  [4][1]: {
    program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    accounts: [14, 22, 10, 12],
    data: "DOXDbJoEAAAABg==",
  },
  /** transferChecked on Toke…Q5DA */
  [5][0]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [15, 17, 8, 12],
    data: "DAAAAAAAAAAACQ==",
  },
  /** transferChecked on Toke…xuEb */
  [5][1]: {
    program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    accounts: [14, 22, 10, 12],
    data: "DBdu7QgAAAAABg==",
  },
  /** transferChecked on Toke…Q5DA */
  [6][0]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [8, 17, 15, 0],
    data: "DAAAAAAAAAAACQ==",
  },
  /** transferChecked on Toke…xuEb */
  [6][1]: {
    program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    accounts: [14, 22, 10, 12],
    data: "DAAAAAAAAAAABg==",
  },
  /** transferChecked on Toke…Q5DA */
  [7][0]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [8, 17, 15, 0],
    data: "DAAAAAAAAAAACQ==",
  },
  /** transferChecked on Toke…xuEb */
  [7][1]: {
    program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    accounts: [10, 22, 14, 0],
    data: "DBLu8q4FAAAABg==",
  },
  /** transferChecked on Toke…Q5DA */
  [8][0]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [8, 17, 15, 0],
    data: "DKYY/RsAAAAACQ==",
  },
  /** transferChecked on Toke…xuEb */
  [8][1]: {
    program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    accounts: [10, 22, 14, 0],
    data: "DAAAAAAAAAAABg==",
  },
} as const;

/** Flat address space: static keys, then each table's writable, then readonly entries. */
const ADDRESSES = [...ACCOUNTS, ...LOOKUP_TABLE_ADDRESSES] as const;

/**
 * Reassemble the message the original transaction carried.
 *
 * Instruction account indexes address the FLAT address space, not ACCOUNTS alone, so
 * a v0 recipe would silently reference undefined accounts if it used ACCOUNTS directly.
 * That exact bug is what ADDRESS_SPACE_SIZE and the verifier exist to prevent.
 */
export function buildRemixedTransaction() {
  let message = setTransactionMessageFeePayer(createTransactionMessage({ version: "v0" }), FEE_PAYER as any);
  for (const key of Object.keys(INSTRUCTION_BYTES)) {
    const ix = INSTRUCTION_BYTES[key as keyof typeof INSTRUCTION_BYTES];
    for (const index of ix.accounts) {
      if (index >= ADDRESS_SPACE_SIZE) {
        throw new Error(`instruction ${key} references address index ${index}, beyond the resolved address space ${ADDRESS_SPACE_SIZE}`);
      }
    }
    message = appendTransactionMessageInstruction(message, {
      programAddress: ix.program,
      accounts: ix.accounts.map((i) => ({ address: ADDRESSES[i], role: 0 as any })),
      data: Uint8Array.from(atob(ix.data), (c) => c.charCodeAt(0)),
    } as any);
  }
  return message;
}
