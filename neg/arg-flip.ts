/**
 * Remixed from a public Solana transaction. No private key was used or needed.
 *
 * source signature : 6754RLWddRPsWvTV2eR6Bao9UA6jYi9FACKWtbdNWaYUsHZjskrjwko7caLrvWjZozpgg9YFVsmafktf6ebKrYT6
 * slot / blockTime : 459384503 / 2026-10-20T21:47:09.000Z
 * message version  : legacy
 * fee payer        : 2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p
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
export const IX2_WHIRLPOOL                    = "lookup[12]"; // [0] r
export const IX2_TOKENPROGRAMA                = "lookup[18]"; // [1] r
export const IX2_TOKENPROGRAMB                = "lookup[19]"; // [2] r
export const IX2_MEMOPROGRAM                  = "lookup[16]"; // [3] r
export const IX2_POSITIONAUTHORITY            = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [4] w
export const IX2_POSITION                     = "lookup[13]"; // [5] r
export const IX2_POSITIONTOKENACCOUNT         = "lookup[21]"; // [6] r
export const IX2_TOKENMINTA                   = "lookup[17]"; // [7] r
export const IX2_TOKENMINTB                   = "lookup[22]"; // [8] r
export const IX2_TOKENOWNERACCOUNTA           = "lookup[8]"; // [9] r
export const IX2_TOKENOWNERACCOUNTB           = "lookup[10]"; // [10] r
export const IX2_TOKENVAULTA                  = "lookup[15]"; // [11] r
export const IX2_TOKENVAULTB                  = "lookup[14]"; // [12] r
export const IX2_TICKARRAYLOWER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [13] w
export const IX2_TICKARRAYUPPER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [14] w
export const IX2_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/** ix 3: COLLECT_FEES_V2 — 13 accounts */
export const IX3_COLLECT_FEES_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX3_WHIRLPOOL                    = "lookup[12]"; // [0] r
export const IX3_POSITIONAUTHORITY            = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [1] w
export const IX3_POSITION                     = "lookup[13]"; // [2] r
export const IX3_POSITIONTOKENACCOUNT         = "lookup[21]"; // [3] r
export const IX3_TOKENMINTA                   = "lookup[17]"; // [4] r
export const IX3_TOKENMINTB                   = "lookup[22]"; // [5] r
export const IX3_TOKENOWNERACCOUNTA           = "lookup[8]"; // [6] r
export const IX3_TOKENVAULTA                  = "lookup[15]"; // [7] r
export const IX3_TOKENOWNERACCOUNTB           = "lookup[10]"; // [8] r
export const IX3_TOKENVAULTB                  = "lookup[14]"; // [9] r
export const IX3_TOKENPROGRAMA                = "lookup[18]"; // [10] r
export const IX3_TOKENPROGRAMB                = "lookup[19]"; // [11] r
export const IX3_MEMOPROGRAM                  = "lookup[16]"; // [12] r
export const IX3_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/** ix 4: DECREASE_LIQUIDITY_V2 — 15 accounts */
export const IX4_DECREASE_LIQUIDITY_V2_LIQUIDITYAMOUNT = 8490158166249n; // liquidityAmount
export const IX4_DECREASE_LIQUIDITY_V2_TOKENMINA = 0n; // tokenMinA
export const IX4_DECREASE_LIQUIDITY_V2_TOKENMINB = 0n; // tokenMinB
export const IX4_DECREASE_LIQUIDITY_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX4_WHIRLPOOL                    = "lookup[12]"; // [0] r
export const IX4_TOKENPROGRAMA                = "lookup[18]"; // [1] r
export const IX4_TOKENPROGRAMB                = "lookup[19]"; // [2] r
export const IX4_MEMOPROGRAM                  = "lookup[16]"; // [3] r
export const IX4_POSITIONAUTHORITY            = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [4] w
export const IX4_POSITION                     = "lookup[9]"; // [5] r
export const IX4_POSITIONTOKENACCOUNT         = "lookup[20]"; // [6] r
export const IX4_TOKENMINTA                   = "lookup[17]"; // [7] r
export const IX4_TOKENMINTB                   = "lookup[22]"; // [8] r
export const IX4_TOKENOWNERACCOUNTA           = "lookup[8]"; // [9] r
export const IX4_TOKENOWNERACCOUNTB           = "lookup[10]"; // [10] r
export const IX4_TOKENVAULTA                  = "lookup[15]"; // [11] r
export const IX4_TOKENVAULTB                  = "lookup[14]"; // [12] r
export const IX4_TICKARRAYLOWER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [13] w
export const IX4_TICKARRAYUPPER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [14] w
export const IX4_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/** ix 5: COLLECT_FEES_V2 — 13 accounts */
export const IX5_COLLECT_FEES_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX5_WHIRLPOOL                    = "lookup[12]"; // [0] r
export const IX5_POSITIONAUTHORITY            = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [1] w
export const IX5_POSITION                     = "lookup[9]"; // [2] r
export const IX5_POSITIONTOKENACCOUNT         = "lookup[20]"; // [3] r
export const IX5_TOKENMINTA                   = "lookup[17]"; // [4] r
export const IX5_TOKENMINTB                   = "lookup[22]"; // [5] r
export const IX5_TOKENOWNERACCOUNTA           = "lookup[8]"; // [6] r
export const IX5_TOKENVAULTA                  = "lookup[15]"; // [7] r
export const IX5_TOKENOWNERACCOUNTB           = "lookup[10]"; // [8] r
export const IX5_TOKENVAULTB                  = "lookup[14]"; // [9] r
export const IX5_TOKENPROGRAMA                = "lookup[18]"; // [10] r
export const IX5_TOKENPROGRAMB                = "lookup[19]"; // [11] r
export const IX5_MEMOPROGRAM                  = "lookup[16]"; // [12] r
export const IX5_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/** ix 6: SWAP_V2 — 15 accounts */
export const IX6_SWAP_V2_AMOUNT = 1n; // amount
export const IX6_SWAP_V2_OTHERAMOUNTTHRESHOLD = 0n; // otherAmountThreshold
export const IX6_SWAP_V2_SQRTPRICELIMIT = 133001992603523192326n; // sqrtPriceLimit
export const IX6_SWAP_V2_AMOUNTSPECIFIEDISINPUT = true;
export const IX6_SWAP_V2_ATOB = true;
export const IX6_SWAP_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX6_TOKENPROGRAMA                = "lookup[18]"; // [0] r
export const IX6_TOKENPROGRAMB                = "lookup[19]"; // [1] r
export const IX6_MEMOPROGRAM                  = "lookup[16]"; // [2] r
export const IX6_TOKENAUTHORITY               = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [3] w
export const IX6_WHIRLPOOL                    = "lookup[12]"; // [4] r
export const IX6_TOKENMINTA                   = "lookup[17]"; // [5] r
export const IX6_TOKENMINTB                   = "lookup[22]"; // [6] r
export const IX6_TOKENOWNERACCOUNTA           = "lookup[8]"; // [7] r
export const IX6_TOKENVAULTA                  = "lookup[15]"; // [8] r
export const IX6_TOKENOWNERACCOUNTB           = "lookup[10]"; // [9] r
export const IX6_TOKENVAULTB                  = "lookup[14]"; // [10] r
export const IX6_TICKARRAY0                   = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [11] w
export const IX6_TICKARRAY1                   = "9uNtbDTFkoXNgWUPs7yuVcGMW1b4Yiw1zanNDfF2s7Pv"; // [12] w
export const IX6_TICKARRAY2                   = "Bi5Lz2PTkCKJkbADUWaLbCq36V5EFvDo1UaqbSpLhQQc"; // [13] w
export const IX6_ORACLE                       = "lookup[11]"; // [14] r
export const IX6_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/** ix 7: INCREASE_LIQUIDITY_V2 — 15 accounts */
export const IX7_INCREASE_LIQUIDITY_V2_LIQUIDITYAMOUNT = 8489515510538n; // liquidityAmount
export const IX7_INCREASE_LIQUIDITY_V2_TOKENMAXA = 0n; // tokenMaxA
export const IX7_INCREASE_LIQUIDITY_V2_TOKENMAXB = 24409992722n; // tokenMaxB
export const IX7_INCREASE_LIQUIDITY_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX7_WHIRLPOOL                    = "lookup[12]"; // [0] r
export const IX7_TOKENPROGRAMA                = "lookup[18]"; // [1] r
export const IX7_TOKENPROGRAMB                = "lookup[19]"; // [2] r
export const IX7_MEMOPROGRAM                  = "lookup[16]"; // [3] r
export const IX7_POSITIONAUTHORITY            = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [4] w
export const IX7_POSITION                     = "lookup[13]"; // [5] r
export const IX7_POSITIONTOKENACCOUNT         = "lookup[21]"; // [6] r
export const IX7_TOKENMINTA                   = "lookup[17]"; // [7] r
export const IX7_TOKENMINTB                   = "lookup[22]"; // [8] r
export const IX7_TOKENOWNERACCOUNTA           = "lookup[8]"; // [9] r
export const IX7_TOKENOWNERACCOUNTB           = "lookup[10]"; // [10] r
export const IX7_TOKENVAULTA                  = "lookup[15]"; // [11] r
export const IX7_TOKENVAULTB                  = "lookup[14]"; // [12] r
export const IX7_TICKARRAYLOWER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [13] w
export const IX7_TICKARRAYUPPER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [14] w
export const IX7_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/** ix 8: INCREASE_LIQUIDITY_V2 — 15 accounts */
export const IX8_INCREASE_LIQUIDITY_V2_LIQUIDITYAMOUNT = 8490158166249n; // liquidityAmount
export const IX8_INCREASE_LIQUIDITY_V2_TOKENMAXA = 469571750n; // tokenMaxA
export const IX8_INCREASE_LIQUIDITY_V2_TOKENMAXB = 0n; // tokenMaxB
export const IX8_INCREASE_LIQUIDITY_V2_REMAININGACCOUNTSINFO = {"__optionRemaining":"AA=="}; // decoded as remaining-accounts metadata; verify byte-for-byte before editing
export const IX8_WHIRLPOOL                    = "lookup[12]"; // [0] r
export const IX8_TOKENPROGRAMA                = "lookup[18]"; // [1] r
export const IX8_TOKENPROGRAMB                = "lookup[19]"; // [2] r
export const IX8_MEMOPROGRAM                  = "lookup[16]"; // [3] r
export const IX8_POSITIONAUTHORITY            = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p"; // [4] w
export const IX8_POSITION                     = "lookup[9]"; // [5] r
export const IX8_POSITIONTOKENACCOUNT         = "lookup[20]"; // [6] r
export const IX8_TOKENMINTA                   = "lookup[17]"; // [7] r
export const IX8_TOKENMINTB                   = "lookup[22]"; // [8] r
export const IX8_TOKENOWNERACCOUNTA           = "lookup[8]"; // [9] r
export const IX8_TOKENOWNERACCOUNTB           = "lookup[10]"; // [10] r
export const IX8_TOKENVAULTA                  = "lookup[15]"; // [11] r
export const IX8_TOKENVAULTB                  = "lookup[14]"; // [12] r
export const IX8_TICKARRAYLOWER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [13] w
export const IX8_TICKARRAYUPPER               = "HNaqSemzSgL5jWDkqBik6X4syyqVknt3CQg9XXFJu7Xw"; // [14] w
export const IX8_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

// ---------------------------------------------------------------- transaction

export const SOURCE_SIGNATURE = "6754RLWddRPsWvTV2eR6Bao9UA6jYi9FACKWtbdNWaYUsHZjskrjwko7caLrvWjZozpgg9YFVsmafktf6ebKrYT6";
export const SOURCE_SLOT = 459384503;
export const FEE_PAYER = "2sJWNe9HM3A8tDd5Q7NuCvLbhMdTeqzDhKqV4Pv9Td1p";
export const RECIPE_VERSION = "legacy";

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

export const INSTRUCTION_BYTES = {
  /** (unknown) */
  0: {
    program: "ComputeBudget111111111111111111111111111111",
    accounts: [],
    data: "AoAaBgA=",
  },
  /** (unknown) */
  1: {
    program: "ComputeBudget111111111111111111111111111111",
    accounts: [],
    data: "A+gDAAAAAAAA",
  },
  /** DECREASE_LIQUIDITY_V2 */
  2: {
    program: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    accounts: [12, 18, 19, 16, 0, 13, 21, 17, 22, 8, 10, 15, 14, 4, 4],
    data: "On+8Pk9SxGAGWPI99QFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
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
  /** (unknown) */
  9: {
    program: "11111111111111111111111111111111",
    accounts: [0, 3],
    data: "AgAAAIgTAAAAAAAA",
  },
} as const;

/**
 * Assemble the same instruction the original transaction carried.
 * Edit ACCOUNTS / INSTRUCTION_BYTES to remix; verification tells you when you
 * have drifted from the source, and where.
 */
export function buildRemixedTransaction() {
  let message = setTransactionMessageFeePayer(createTransactionMessage({ version: 0}), FEE_PAYER as any);
  for (const key of Object.keys(INSTRUCTION_BYTES)) {
    const ix = INSTRUCTION_BYTES[key as keyof typeof INSTRUCTION_BYTES];
    message = appendTransactionMessageInstruction(message, {
      programAddress: ix.program,
      accounts: ix.accounts.map((i) => ({ address: ACCOUNTS[i], role: 0 as const })),
      data: Uint8Array.from(atob(ix.data), (c) => c.charCodeAt(0)),
    } as any);
  }
  return message;
}
