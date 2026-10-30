/**
 * Multi-program remix of a public Solana transaction.
 * source signature : 4HZWSH28NDUKq3iapstCVv1YGfogBSRYZnmjTZWPTjeDfULB9wTndqbnk5LnmHcQDxJnHQx1SW4zDxJDeRDeMwzQ
 * slot / blockTime : 459532722 / 2026-10-21T06:41:22.000Z
 * message version  : v0
 * fee payer         : CYa4bLwboipDtag3dRVowqyD8uXswijKgbUpt65GBmQK
 *
 * Programs in this transaction:
 *   0. ComputeBudget111111111111111111111111111111
 *   1. JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4
 *   2. DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH
 *   3. 11111111111111111111111111111111
 *   4. BiSoNHVpsVZW2F7rx2eQ59yQwKxzU5NvBcmKshCSUypi
 *   5. TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
 *
 * Verification:
 *   node src/verify-recipe.mjs remix-multi-4HZWSH28.ts
 * verifies the encoded bytes still match the chain byte for byte.
 */

// ------------------------------------------------------ editable parameters

/** ix 0: SetComputeUnitLimit on Comp…1111 (tagLen=1) — 0 accounts */
/** ix 1: set_token_ledger on JUP6…TaV4 (tagLen=8) — 2 accounts */
/** ix 2: swap2 on DF1o…7QBH (tagLen=8) — 18 accounts */
/** ix 3: Transfer on 1111…1111 (tagLen=4) — 2 accounts */

// ---------------------------------------------------------------- transaction

export const SOURCE_SIGNATURE = "4HZWSH28NDUKq3iapstCVv1YGfogBSRYZnmjTZWPTjeDfULB9wTndqbnk5LnmHcQDxJnHQx1SW4zDxJDeRDeMwzQ";
export const SOURCE_SLOT = 459532722;
export const FEE_PAYER = "CYa4bLwboipDtag3dRVowqyD8uXswijKgbUpt65GBmQK";
export const RECIPE_VERSION = "v0";

/** 19 static account keys, in message order. */
export const ACCOUNTS = [
  "CYa4bLwboipDtag3dRVowqyD8uXswijKgbUpt65GBmQK", // [0]
  "2Y7HATmn9aJBcxCskE5V2U2epmjvkZmB51zTJBbhj4cU", // [1]
  "6JTodMooZXYVrmWCHo7itwCgSE84gfzU9X33J8wT1s1G", // [2]
  "7JjdeaG4xVLn2DPvSDfX71xTSV3KmSC94nvH87Fdkp2x", // [3]
  "8FnX3xo2yYw3EUE6w3nQA4GfXGS9wpK6oj3veJpbFzLo", // [4]
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49", // [5]
  "ATRsNGv2nDw7hSMfkUTBoVUDsFDwN7po7KbecyiGWNB4", // [6]
  "Eem9fSgubrh1gbH8XMhGVQ7y1nrzwrTzvTBu3fswfYsY", // [7]
  "11111111111111111111111111111111", // [8]
  "ComputeBudget111111111111111111111111111111", // [9]
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // [10]
  "Sysvar1nstructions1111111111111111111111111", // [11]
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // [12]
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // [13]
  "4cG31VNF9TzFinNc7BmnjhFvGjxkY3sCETVMtMgbrhPs", // [14]
  "8xeaWCsJYxRoudEZGJWURdfrtFhLYZz9b4iHJnW5tb3d", // [15]
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // [16]
  "BiSoNHVpsVZW2F7rx2eQ59yQwKxzU5NvBcmKshCSUypi", // [17]
  "DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH", // [18]
] as const;

/** Flat address space: static keys, then each lookup table in runtime order. */
export const LOOKUP_TABLE_ADDRESSES = [
] as const;

export const ADDRESS_SPACE_SIZE = 19;

export const INSTRUCTION_BYTES = {
  /** SetComputeUnitLimit on Comp…1111 */
  0: {
    program: "ComputeBudget111111111111111111111111111111",
    accounts: [],
    data: "AvttAQA=",
  },
  /** set_token_ledger on JUP6…TaV4 */
  1: {
    program: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    accounts: [3, 7],
    data: "5FW5cE5PTQI=",
  },
  /** (unknown) */
  2: {
    program: "DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH",
    accounts: [12, 16, 8, 0, 15, 18, 11, 13, 18, 18, 17, 0, 4, 6, 1, 2, 7, 14],
    data: "QUs/TOtbW4gBAAAAKMCS7RkAAAAAAAEAAAAAAAAAAAAAAAA=",
  },
  /** Transfer on 1111…1111 */
  3: {
    program: "11111111111111111111111111111111",
    accounts: [0, 5],
    data: "AgAAACT0AAAAAAAA",
  },
} as const;

/**
 * Inner (CPI) instructions the chain executed, keyed [parent instruction][slot].
 * Verification-only: rebuilding the message must NOT append these — they are
 * effects of the parent program's CPI, not parts of the signed message.
 * Account indexes address the same flat space as INSTRUCTION_BYTES.
 */
export const INNER_BYTES = {
  /** swap2 on BiSo…Uypi */
  [2][0]: {
    program: "BiSoNHVpsVZW2F7rx2eQ59yQwKxzU5NvBcmKshCSUypi",
    accounts: [0, 4, 6, 1, 7, 2, 12, 12, 15, 14],
    data: "B8CS7RkAAAAAAAAAAAAAAAABBA==",
  },
  /** transfer on Toke…Q5DA */
  [2][1]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [2, 1, 0],
    data: "A8CS7RkAAAAA",
  },
  /** transfer on Toke…Q5DA */
  [2][2]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [6, 7, 4],
    data: "A9SWmPQAAAAA",
  },
  /** event:SwapEvent on DF1o…7QBH */
  [2][3]: {
    program: "DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH",
    accounts: [15],
    data: "5EWlLlHLmh1Axs3oJghx4p8y2pwfbBJQwJtzOSPsw2cNKGPn1GqcHPR9/bvQ1f5Xxvp6877brTo9ZfNqq8l0MbG75MLS9uDkfKYCA0UvXWHAku0ZAAAAAAabiFf+q4GE+2h/Y0YYwDXaxDncGus7VZig8AAAAAAB1JaY9AAAAAA=",
  },
} as const;

export const VERIFY = {
  signature: "4HZWSH28NDUKq3iapstCVv1YGfogBSRYZnmjTZWPTjeDfULB9wTndqbnk5LnmHcQDxJnHQx1SW4zDxJDeRDeMwzQ",
  slot: 459532722,
  programIds: ["ComputeBudget111111111111111111111111111111", "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", "DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH", "11111111111111111111111111111111", "BiSoNHVpsVZW2F7rx2eQ59yQwKxzU5NvBcmKshCSUypi", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
};
export const MULTI_PROGRAM = true;
