/**
 * Multi-program remix of a public Solana transaction.
 * source signature : 2Wti3kFMoFxTPX7WMBxJqYBEBdPuwi4gkhPEtUnwq1BRhQUoFzNAUNFDA4BacdFLsDct3dugWQ7EiiwdxDqKGKen
 * slot / blockTime : 462867981 / 2026-10-29T11:41:48.000Z
 * message version  : v1
 * fee payer         : AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51
 *
 * Programs in this transaction:
 *   0. JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4
 *   1. TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
 *   2. 11111111111111111111111111111111
 *   3. whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc
 *   4. TessVdML9pBGgG9yGks7o4HewRaXVAMuoVj4x83GLQH
 *
 * Verification:
 *   node src/verify-recipe.mjs remix-multi-2Wti3kFM.ts
 * verifies the encoded bytes still match the chain byte for byte.
 */

// ------------------------------------------------------ editable parameters
// Argument constants are decoded from each program's own stored on-chain IDL
// (or the native tables for System/ComputeBudget) and re-encoded to the exact
// bytes below before they were written. Editing a constant here changes the
// value; the verifier re-encodes it against INSTRUCTION_BYTES.

/** ix 0: create_idempotent_associated_token_account on JUP6…TaV4 (tagLen=8) — 8 accounts */
/** ix 1: shared_accounts_route_v2 on JUP6…TaV4 (tagLen=8) — 43 accounts */
export const IX1_SHARED_ACCOUNTS_ROUTE_V2_ID = 0; // id — re-encodes to the chain bytes
export const IX1_SHARED_ACCOUNTS_ROUTE_V2_IN_AMOUNT = 23569191507n; // in_amount — re-encodes to the chain bytes
export const IX1_SHARED_ACCOUNTS_ROUTE_V2_QUOTED_OUT_AMOUNT = 93289762n; // quoted_out_amount — re-encodes to the chain bytes
export const IX1_SHARED_ACCOUNTS_ROUTE_V2_SLIPPAGE_BPS = 401; // slippage_bps — re-encodes to the chain bytes
export const IX1_SHARED_ACCOUNTS_ROUTE_V2_PLATFORM_FEE_BPS = 0; // platform_fee_bps — re-encodes to the chain bytes
export const IX1_SHARED_ACCOUNTS_ROUTE_V2_POSITIVE_SLIPPAGE_BPS = 0; // positive_slippage_bps — re-encodes to the chain bytes
export const IX1_SHARED_ACCOUNTS_ROUTE_V2_ROUTE_PLAN = [{"swap":{"__kind":"WhirlpoolSwapV2","a_to_b":false,"remaining_accounts_info":{"__option":"None"}},"bps":10000,"input_index":0,"output_index":1},{"swap":{"__kind":"TesseraVV2","side":{"__kind":"Ask"}},"bps":10000,"input_index":1,"output_index":2}]; // route_plan — re-encodes to the chain bytes
/** ix 5: Transfer on 1111…1111 (tagLen=4) — 3 accounts */
export const IX5_TRANSFER_LAMPORTS = 0n; // lamports — re-encodes to the chain bytes

// ---------------------------------------------------------------- transaction

export const SOURCE_SIGNATURE = "2Wti3kFMoFxTPX7WMBxJqYBEBdPuwi4gkhPEtUnwq1BRhQUoFzNAUNFDA4BacdFLsDct3dugWQ7EiiwdxDqKGKen";
export const SOURCE_SLOT = 462867981;
export const FEE_PAYER = "AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51";
export const RECIPE_VERSION = "v1";

/** 37 static account keys, in message order. */
export const ACCOUNTS = [
  "AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51", // [0]
  "3MGBrdK1WpW7RPK5VHcbgYJwiN8rwFo9PifWtZsKWtgj", // [1]
  "2ZjhdWmit2Bi3sosWg2hrtALhT4tdN7T7bvjUtfpC5XV", // [2]
  "36KcXGjyviaUCXshwZkLJQZub8sAi2FktahReqf2W4Ye", // [3]
  "4ttH5yah9URkEQzAf9P4sjLyJq8PtJSkYhzqT98QXMEr", // [4]
  "4U2JzGENeMhYuVMGMUeLdzPP9d4PwqnKX9iLxjwPXZU8", // [5]
  "5gwmcjXMy6jmWHAXS4rTcPSRbgkm92RnyYBRtMQJsREw", // [6]
  "5pVN5XZB8cYBjNLFrsBCPWkCQBan5K5Mq2dWGzwPgGJV", // [7]
  "6jbAQKgYnrQdeQqP9mM3yy3anzBJYcwHaPFLM1ArnYiW", // [8]
  "7PKgjtPEMspjxoYCL9ZUwY7bBcuK6yXkYhWNXUsgB9XF", // [9]
  "7Z5nyojqRzRVyfaV7y7voxWqF5y74Q4f6MuSiYSfwrU", // [10]
  "9t4P5wMwfFkyn92Z7hf463qYKEZf8ERVZsGBEPNp8uJx", // [11]
  "AsUj3b9Y1soB9jGEtz3LnjNRBdLYu2hxumwBmJ6rHJ1d", // [12]
  "C4MBf2j2A7wZxCY7Ts6sik3yTxwHR74SBZqfvUdKQ6o4", // [13]
  "DawAgrBJdSSN25aJvbYysT68Zf7nj8Y69z2vQVCarTEo", // [14]
  "Dn1NfrPauF4S9Qc9ZApxSaB4Z2e9KRMBwkuufB89iHGN", // [15]
  "DVCeozFGbe6ew3eWTnZByjHeYqTq1cvbrB7JJhkLxaRJ", // [16]
  "g7dD1FHSemkUQrX1Eak37wzvDjscgBW2pFCENwjLdMX", // [17]
  "HrTf9CzXR1dRH4Sof5QrpmGWwpwAf3qZzwCsEjQpXcSq", // [18]
  "s59HA53YP9oV3Wf4swiTScP1LvFdfR3qLA1XWryLncm", // [19]
  "11111111111111111111111111111111", // [20]
  "4cG31VNF9TzFinNc7BmnjhFvGjxkY3sCETVMtMgbrhPs", // [21]
  "8ekCy2jHHUbW2yeNGFWYJT9Hm9FW7SvZcZK66dSZCDiF", // [22]
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // [23]
  "BAT1Ndpu5gbLTp2AZkSXP79LJBZfCH4B3zGhi6LtvdhK", // [24]
  "D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf", // [25]
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // [26]
  "GGztQqQ6pCPaJQnNpXBgELr5cs3WwDakRbh1iEMzjgSJ", // [27]
  "J3NKxxXZcnNiMjKw9hYb2K4LUxgwB6t1FtPtQVsv3KFr", // [28]
  "jitodontfront1111111111111111111TradeonFomo", // [29]
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // [30]
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", // [31]
  "So11111111111111111111111111111111111111112", // [32]
  "Sysvar1nstructions1111111111111111111111111", // [33]
  "TessVdML9pBGgG9yGks7o4HewRaXVAMuoVj4x83GLQH", // [34]
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // [35]
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // [36]
] as const;

/** Flat address space: static keys, then each lookup table in runtime order. */
export const LOOKUP_TABLE_ADDRESSES = [
] as const;

export const ADDRESS_SPACE_SIZE = 37;

export const INSTRUCTION_BYTES = {
  /** create_idempotent_associated_token_account on JUP6…TaV4 */
  0: {
    program: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    accounts: [0, 4, 1, 26, 23, 20, 35, 0],
    data: "U2jAlrRHnMY=",
  },
  /** shared_accounts_route_v2 on JUP6…TaV4 */
  1: {
    program: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    accounts: [27, 1, 10, 13, 16, 4, 28, 26, 35, 35, 25, 30, 36, 35, 35, 31, 27, 6, 32, 28, 17, 3, 13, 12, 19, 14, 2, 8, 34, 22, 5, 27, 7, 11, 17, 16, 32, 26, 35, 35, 33, 24, 21],
    data: "0ZhTk3z+2OkAU1LVfAUAAAAifY8FAAAAAJABAAAAAAIAAAAvAAAQJwABsgEQJwEC",
  },
  /** transferChecked on Toke…Q5DA */
  2: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [4, 26, 18, 1],
    data: "DDDmAgAAAAAABg==",
  },
  /** transferChecked on Toke…Q5DA */
  3: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [4, 26, 15, 1],
    data: "DLyfAwAAAAAABg==",
  },
  /** transferChecked on Toke…Q5DA */
  4: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [4, 26, 9, 1],
    data: "DAT5BwAAAAAABg==",
  },
  /** Transfer on 1111…1111 */
  5: {
    program: "11111111111111111111111111111111",
    accounts: [0, 0, 29],
    data: "AgAAAAAAAAAAAAAA",
  },
} as const;

/**
 * Inner (CPI) instructions the chain executed, keyed [parent instruction][slot].
 * Verification-only: rebuilding the message must NOT append these — they are
 * effects of the parent program's CPI, not parts of the signed message.
 * Account indexes address the same flat space as INSTRUCTION_BYTES.
 */
export const INNER_BYTES = {
  /** transfer on Toke…Q5DA */
  [1][0]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [10, 13, 1],
    data: "A1NS1XwFAAAA",
  },
  /** swap_v2 on whir…tyCc */
  [1][1]: {
    program: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    accounts: [35, 35, 31, 27, 6, 32, 28, 17, 3, 13, 12, 19, 14, 2, 8],
    data: "KwTtCxrJHmJTUtV8BQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAA==",
  },
  /** transferChecked on Toke…Q5DA */
  [1][2]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [13, 28, 12, 27],
    data: "DFNS1XwFAAAACA==",
  },
  /** transferChecked on Toke…Q5DA */
  [1][3]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [3, 32, 17, 6],
    data: "DDquZjcAAAAACQ==",
  },
  /** (unknown) on Tess…GLQH */
  [1][4]: {
    program: "TessVdML9pBGgG9yGks7o4HewRaXVAMuoVj4x83GLQH",
    accounts: [22, 5, 27, 7, 11, 17, 16, 32, 26, 35, 35, 33, 24, 21],
    data: "EAE6rmY3AAAAAAAAAAAAAAAA",
  },
  /** transferChecked on Toke…Q5DA */
  [1][5]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [17, 32, 7, 27],
    data: "DDquZjcAAAAACQ==",
  },
  /** transferChecked on Toke…Q5DA */
  [1][6]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [11, 26, 16, 22],
    data: "DEx6jwUAAAAABg==",
  },
  /** event:SwapsEvent on JUP6…TaV4 */
  [1][7]: {
    program: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    accounts: [25],
    data: "5EWlLlHLmh2YL07rwGBuagIAAAD9MfQwDKWwCj6CR7aq1U2fe9YbJn9giZjMX+ny2Xw9RVNS1XwFAAAABpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAE6rmY3AAAAAA4DaF+OkJBT5FgSHGb1p2rtx3BqoRyC+KqVKo8reHmpBpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAE6rmY3AAAAAMb6evO+2606PWXzaqvJdDGxu+TC0vbg5HymAgNFL11hTHqPBQAAAAAG0+3E5XOtr/Plc4mLVFse6NKNBY7ZTojgvLMyVxvqCg==",
  },
  /** transfer on Toke…Q5DA */
  [1][8]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [16, 4, 27],
    data: "A0x6jwUAAAAA",
  },
} as const;

export const VERIFY = {
  signature: "2Wti3kFMoFxTPX7WMBxJqYBEBdPuwi4gkhPEtUnwq1BRhQUoFzNAUNFDA4BacdFLsDct3dugWQ7EiiwdxDqKGKen",
  slot: 462867981,
  programIds: ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "11111111111111111111111111111111", "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", "TessVdML9pBGgG9yGks7o4HewRaXVAMuoVj4x83GLQH"],
};
export const MULTI_PROGRAM = true;
