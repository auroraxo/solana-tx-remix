/**
 * Remixed from a public Solana transaction. No private key was used or needed.
 *
 * source signature : 2Apc8uSCCYaqaaF2fBYwK5KfE1nNBab28dTTCmzGEN1S1Tpz6ZXbreWrPzMGN4vw33mo9yAsoJw7KC77T9XsnAyn
 * slot / blockTime : 459696209 / 2026-10-21T16:26:51.000Z
 * message version  : v1
 * interface source : stored IDL sha256:0b886e375b112206a846a061f076f7db02a4b01b25cd593cd03caa490d86660f
 * fee payer        : D15HDjPCaGjnrCmeCyhsZAXDnYx2fSdQEQdyEahceofz
 *
 * This file is generated, then meant to be edited. Verification:
 *   node src/verify-recipe.mjs out/remix-2Apc8uSC.ts
 * verifies the encoded bytes still match the chain byte for byte.
 */

// ------------------------------------------------------------- editable parameters

// ---------------------------------------------------------------- transaction

export const SOURCE_SIGNATURE = "2Apc8uSCCYaqaaF2fBYwK5KfE1nNBab28dTTCmzGEN1S1Tpz6ZXbreWrPzMGN4vw33mo9yAsoJw7KC77T9XsnAyn";
export const SOURCE_SLOT = 459696209;
export const FEE_PAYER = "D15HDjPCaGjnrCmeCyhsZAXDnYx2fSdQEQdyEahceofz";
export const RECIPE_VERSION = "v1";

/** 62 static account keys, in message order. */
export const ACCOUNTS = [
  "D15HDjPCaGjnrCmeCyhsZAXDnYx2fSdQEQdyEahceofz", // [0]
  "BbqwTYNRyXwqpqkrC7cTWd9rPuZBo7Kdc7ajG1vYWVU", // [1]
  "mPWBpKzzchEjitz7x4Q2d7cbQ3fHibF2BHWbWk8YGnH", // [2]
  "pfnSbG36fCGpT8WsB1NEbQ2BH11iog6qjFqMEVCZZgV", // [3]
  "2dxzMyJ8ZoQYHUVWowSUYxiPkunoWomx9KnS3PmxV5A6", // [4]
  "2jPua1PG2YRi2ZVNYhuneLkHz3kRpeFy29n5b29qVS72", // [5]
  "3ESUFCnRNgZ7Mn2mPPUMmXYaKU8jpnV9VtA17M7t2mHQ", // [6]
  "3RpEekjLE5cdcG15YcXJUpxSepemvq2FpmMcgo342BwC", // [7]
  "43YixEfZjD2oidQohFvGSkSaAZXdv6qY89F38gtTSka4", // [8]
  "4MKHCP1LuPevsRSLF2rchg3pHG5jxtKUVGHpLJ57Rgnp", // [9]
  "4YsUu7rZDbNUAQv5gc5MTAUTG4Ahiurwe7ATKwKD96YU", // [10]
  "4nCGSVN8ZGuewX36TznzisceaNYzURWPesxyGtDvA2iP", // [11]
  "52XbFiFmnuqpvvUDzgDvodMM7qvPmoLPQJ14d9ngG9pV", // [12]
  "5LKwsJ9epFScC84Vxs5bscyyj4w7aK78V4J32PbfKqi7", // [13]
  "5NQTw1WqVEt6wP1LmohsrYDyJp2NDipdv6eULVNByXMb", // [14]
  "6qXxSfVcyA6BnZpAxcfTnqzwW9gZee21WNDCwX7SL95t", // [15]
  "7yD7gfXv49SFxhx9uTc11dEd7Nj98rGWeYMdZJgheZbG", // [16]
  "8bYBnFQ7jYC8y4RATE3sYV2VSsWFEoSqNM8MUQCAELi1", // [17]
  "9RQR8d24kBwhMrZbRCVVsPom7jqQmC5U2Nk1LPchfEN5", // [18]
  "APUxBMm4Se78tchLDLu81WyAoMeoHdGLSDXrVeohujEw", // [19]
  "C2QoQ111jGHEy5918XkNXQro7gGwC9PKLXd1LqBiYNwA", // [20]
  "C7DP6oJaeXvzX5jbbtdxpuG67VhuLqtJVaMH8U8fWwbi", // [21]
  "CDnseKpFLqEn8zCZorrsdsrgWtVQDXKRpcjaCLfJSdzz", // [22]
  "CY1rR6DGbkkzRGR9abJjRUG828ABxc1tRGBGvAHyA11C", // [23]
  "Cr7jcPoVdD7PehzBaDTV9pWmrQXdt2vZTrQLV26soBBC", // [24]
  "DFD9mP5eux3i5APKuFxoiKjJczx9MFj4dLK7cg4PGy4B", // [25]
  "DsNFn3ZaZuphrdjbyhisAuFdDnKEwnRzQM3q67QLp5Qj", // [26]
  "EgwPpoNB4ZAnTUDPPLKpiuUUwWoLReFyrh9L22FoAmqg", // [27]
  "FnXVg1PVjPNNVnxBz6cgp85bQuuTQqDUdScFUVC7uM7U", // [28]
  "FzvRbXDdrsYVMa9KohXyQytWNAZAo4PsF8yujDH7KCfG", // [29]
  "Gs1dVEjVT3mSBKFxLsGw2BtQnkKaGKFkPc4CwchtqvP7", // [30]
  "H6SHKqxRpYs3DFjsBdPNzf1ApGQ1m1hhCMP7VfzwCgvf", // [31]
  "HVTwKczNqenP9Sn8Nt61jvWw8kKnNzpEqgLon42H1NJm", // [32]
  "HgFLBWQugxt6qbPaWiwXjrqauXdQmcpMV6H6t8ttD8s1", // [33]
  "11111111111111111111111111111111", // [34]
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", // [35]
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // [36]
  "MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms", // [37]
  "So11111111111111111111111111111111111111112", // [38]
  "Sysvar1nstructions1111111111111111111111111", // [39]
  "TTWofwAge91oFhZs7kpQdyrVRkmevgM88xijGvQFbKo", // [40]
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // [41]
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // [42]
  "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG", // [43]
  "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi", // [44]
  "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh", // [45]
  "3RkiRSgugPt8J7gMsSYmje4wKKAmwuQYrgkzWuNrvBga", // [46]
  "3TK9D8aoBFYjYZtKCjciPrVrRStsnvo7KmpcJqDavpaU", // [47]
  "3rmHSu74h1ZcmAisVcWerTCiRDQbUrBKmcwptYGjHfet", // [48]
  "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf", // [49]
  "6Vo3245eszAb5wuqEMw8mGdbfRUdKbHhDHP5LcaGuTAB", // [50]
  "8Wf5TiAheLUqBrKXeYg2JtAFFMWtKdG2BSFgqUcPVwTt", // [51]
  "8XVku7kXExLTKnXUZ6NEvDXV2xBchRPsYHBwFnQCpump", // [52]
  "8dEX7TLE1MKT8nZexZY7XdTdJdTX8iwboopbadsk4c4d", // [53]
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // [54]
  "Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1", // [55]
  "D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf", // [56]
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // [57]
  "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB", // [58]
  "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC", // [59]
  "J1to1yufRnoWn81KYg1XkTWzmKjnYSnmE2VY8DGUJ9Qv", // [60]
  "jitodontfront111111111111111111nopainnogain", // [61]
] as const;

/**
 * Flat address space: static keys, then each lookup table's writable entries, then
 * its readonly entries. Instruction account indexes address this array, which is why
 * a non-v0 transaction needs the table contents.
 */
export const LOOKUP_TABLE_ADDRESSES = [
] as const;

export const ADDRESS_SPACE_SIZE = 62;

export const INSTRUCTION_BYTES = {
  /** Transfer */
  0: {
    program: "11111111111111111111111111111111",
    accounts: [0, 26, 46],
    data: "AgAAAObQAgAAAAAA",
  },
  /** (unknown) */
  1: {
    program: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    accounts: [0, 17, 0, 38, 34, 41],
    data: "AQ==",
  },
  /** (unknown) */
  2: {
    program: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    accounts: [0, 31, 0, 57, 34, 41],
    data: "AQ==",
  },
  /** (unknown) */
  3: {
    program: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    accounts: [0, 15, 0, 45, 34, 41],
    data: "AQ==",
  },
  /** (unknown) */
  4: {
    program: "6Vo3245eszAb5wuqEMw8mGdbfRUdKbHhDHP5LcaGuTAB",
    accounts: [49, 52, 40, 42, 42, 13, 23, 18, 0, 25, 1, 9, 51, 19, 34, 55, 35, 17, 41, 36, 0, 17, 1, 38, 40, 41, 42, 36, 56, 36, 43, 59, 27, 17, 15, 21, 28, 45, 38, 0, 41, 41, 43, 48, 43, 36, 58, 14, 15, 31, 6, 2, 20, 30, 7, 11, 8, 5, 22, 0, 44, 41, 36, 36, 47, 0, 16, 33, 29, 38, 57, 17, 31, 41, 34, 0, 53, 53, 60, 39, 37, 0, 0, 4, 34, 1, 31, 24, 12, 42, 40, 41, 57, 10, 32],
    data: "F+0uLq+oL+OoML0CAAAAAJ04OLZFAAAAAQA4AAAAu2T6zDHErxSoML0CAAAAAH1eAAAAAAAAECcAAAAABAAAAGyzDwABExAnAQO1AV0XAAN0ABAnAwQ=",
  },
  /** Transfer */
  5: {
    program: "11111111111111111111111111111111",
    accounts: [0, 3],
    data: "AgAAABAnAAAAAAAA",
  },
} as const;

/**
 * Inner (CPI) instructions the chain executed, keyed [parent instruction][slot].
 * Verification-only: rebuilding the message must NOT append these — they are
 * effects of the parent program's CPI, not parts of the signed message.
 * Account indexes address the same flat space as INSTRUCTION_BYTES.
 */
export const INNER_BYTES = {
  /** getAccountDataSize on Toke…Q5DA */
  [1][0]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [38],
    data: "FQcA",
  },
  /** (unknown) on 1111…1111 */
  [1][1]: {
    program: "11111111111111111111111111111111",
    accounts: [0, 17],
    data: "OLYWAAAAAAClAAAAAAAAAAbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCp",
  },
  /** initializeImmutableOwner on Toke…Q5DA */
  [1][2]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [17],
    data: "Fg==",
  },
  /** initializeAccount3 on Toke…Q5DA */
  [1][3]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [17, 38],
    data: "ErJRFQZV6Ddeo6fyCjEqvaSibgKQVEsXbjl3BKzgfIIF",
  },
  /** getAccountDataSize on Toke…Q5DA */
  [3][0]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [45],
    data: "FQcA",
  },
  /** (unknown) on 1111…1111 */
  [3][1]: {
    program: "11111111111111111111111111111111",
    accounts: [0, 15],
    data: "OLYWAAAAAAClAAAAAAAAAAbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCp",
  },
  /** initializeImmutableOwner on Toke…Q5DA */
  [3][2]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [15],
    data: "Fg==",
  },
  /** initializeAccount3 on Toke…Q5DA */
  [3][3]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [15, 45],
    data: "ErJRFQZV6Ddeo6fyCjEqvaSibgKQVEsXbjl3BKzgfIIF",
  },
  /** Transfer on 1111…1111 */
  [4][0]: {
    program: "11111111111111111111111111111111",
    accounts: [0, 17],
    data: "AgAAAKgwvQIAAAAA",
  },
  /** syncNative on Toke…Q5DA */
  [4][1]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [17],
    data: "EQ==",
  },
  /** route_v2 on JUP6…TaV4 */
  [4][2]: {
    program: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    accounts: [0, 17, 1, 38, 40, 41, 42, 36, 56, 36, 43, 59, 27, 17, 15, 21, 28, 45, 38, 0, 41, 41, 43, 48, 43, 36, 58, 14, 15, 31, 6, 2, 20, 30, 7, 11, 8, 5, 22, 0, 44, 41, 36, 36, 47, 0, 16, 33, 29, 38, 57, 17, 31, 41, 34, 0, 53, 53, 60, 39, 37, 0, 0, 4, 34, 1, 31, 24, 12, 42, 40, 41, 57, 10, 32],
    data: "u2T6zDHErxSoML0CAAAAAH1eAAAAAAAAECcAAAAABAAAAGyzDwABExAnAQO1AV0XAAN0ABAnAwQ=",
  },
  /** swap on cpam…1sGG */
  [4][3]: {
    program: "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG",
    accounts: [59, 27, 17, 15, 21, 28, 45, 38, 0, 41, 41, 43, 48, 43],
    data: "+MaekeF1h8jrzhkBAAAAAAAAAAAAAAAA",
  },
  /** transferChecked on Toke…Q5DA */
  [4][4]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [17, 38, 28, 0],
    data: "DOvOGQEAAAAACQ==",
  },
  /** transferChecked on Toke…Q5DA */
  [4][5]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [21, 45, 15, 59],
    data: "DEIJAAAAAAAACA==",
  },
  /** event:EvtSwap2 on cpam…1sGG */
  [4][6]: {
    program: "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG",
    accounts: [48],
    data: "5EWlLlHLmh29QjOoJlB1mctjFaS984GxvArxoUpLS3Rg/SFXx4lzROXpYjPIbnv/AQAA684ZAQAAAAAAAAAAAAAAAADrzhkBAAAAAOvOGQEAAAAAAAAAAAAAAABCCQAAAAAAAFoAtj3/AHIvWAAAAAAAAAAFAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOvOGQEAAAAAQgkAAAAAAABCCQAAAAAAAMvn2GoAAAAArisNAAAAAABAp2D+AQAAAA==",
  },
  /** (unknown) on Eo7W…5UaB */
  [4][7]: {
    program: "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB",
    accounts: [14, 15, 31, 6, 2, 20, 30, 7, 11, 8, 5, 22, 0, 44, 41],
    data: "+MaekeF1h8hCCQAAAAAAAAAAAAAAAAAA",
  },
  /** transfer on Toke…Q5DA */
  [4][8]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [15, 22, 0],
    data: "AwEAAAAAAAAA",
  },
  /** (unknown) on 24Uq…pyTi */
  [4][9]: {
    program: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi",
    accounts: [2, 30, 11, 15, 5, 0, 41],
    data: "8iPGiVLh8rZBCQAAAAAAAAAAAAAAAAAA",
  },
  /** transfer on Toke…Q5DA */
  [4][10]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [15, 30, 0],
    data: "A0EJAAAAAAAA",
  },
  /** mintTo on Toke…Q5DA */
  [4][11]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [11, 5, 2],
    data: "B0EJAAAAAAAA",
  },
  /** (unknown) on 24Uq…pyTi */
  [4][12]: {
    program: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi",
    accounts: [6, 20, 7, 31, 8, 8, 41],
    data: "txJGnJRtoSJNMxoAAAAAAAAAAAAAAAAA",
  },
  /** transfer on Toke…Q5DA */
  [4][13]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [20, 31, 6],
    data: "A06HHgAAAAAA",
  },
  /** burn on Toke…Q5DA */
  [4][14]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [8, 7, 8],
    data: "CE0zGgAAAAAA",
  },
  /** (unknown) on 3TK9…vpaU */
  [4][15]: {
    program: "3TK9D8aoBFYjYZtKCjciPrVrRStsnvo7KmpcJqDavpaU",
    accounts: [0, 16, 33, 29, 38, 57, 17, 31, 41, 34, 0, 53, 53, 60, 39],
    data: "8OAmIbAf8a+9YaMBAAAAAAAAAAAAAAAAAQ==",
  },
  /** transfer on Toke…Q5DA */
  [4][16]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [17, 33, 0],
    data: "A71howEAAAAA",
  },
  /** transfer on Toke…Q5DA */
  [4][17]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [29, 31, 16],
    data: "A4BnLQAAAAAA",
  },
  /** (unknown) on MNFS…k1Ms */
  [4][18]: {
    program: "MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms",
    accounts: [0, 0, 4, 34, 1, 31, 24, 12, 42, 40, 41, 57, 10, 32],
    data: "Dc7uSwAAAAAAAAAAAAAAAAAAAQ==",
  },
  /** transfer on Toke…Q5DA */
  [4][19]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [31, 12, 0],
    data: "AxnuSwAAAAAA",
  },
  /** transferChecked on Toke…xuEb */
  [4][20]: {
    program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    accounts: [24, 40, 1, 24],
    data: "DG5eAAAAAAAABg==",
  },
  /** event:SwapsEvent on JUP6…TaV4 */
  [4][21]: {
    program: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    accounts: [56],
    data: "5EWlLlHLmh2YL07rwGBuagQAAAAGm4hX/quBhPtof2NGGMA12sQ53BrrO1WYoPAAAAAAAevOGQEAAAAAIzzqR01stRPa1CHILmgfgO11EkVd+5H8aDY7mdkVZYJCCQAAAAAAAAktITVlehWcK4fUtmpw246XUjif92qvIGztBjo4+VrtIzzqR01stRPa1CHILmgfgO11EkVd+5H8aDY7mdkVZYJCCQAAAAAAAMb6evO+2606PWXzaqvJdDGxu+TC0vbg5HymAgNFL11hToceAAAAAADM+ALUzMyE1/shtfc7SdgaFsW0yI7jI5ThyR01iMxAgAabiFf+q4GE+2h/Y0YYwDXaxDncGus7VZig8AAAAAABvWGjAQAAAADG+nrzvtutOj1l82qryXQxsbvkwtL24OR8pgIDRS9dYYBnLQAAAAAAJHT80rM1d5xbCo8Kx029i5K6NGesM+1joVC5NYKL1YnG+nrzvtutOj1l82qryXQxsbvkwtL24OR8pgIDRS9dYc7uSwAAAAAABscUkwjXLk2xoEmN2ZCCgzQZZQhfTumq/EblbSSJQYpuXgAAAAAAAAU3pHc42iWpiPlk2ZukOojPEYc5W2rPFIP1cCKNgAKy",
  },
  /** closeAccount on Toke…Q5DA */
  [4][22]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [17, 0, 0],
    data: "CQ==",
  },
  /** (unknown) on 6EF8…wF6P */
  [4][23]: {
    program: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
    accounts: [49, 52, 40, 42, 42, 13, 23, 18, 0, 25, 1, 9, 51, 19, 34, 55, 35],
    data: "4fdQHtWzhIhuXgAAAAAAAJ04OLZFAAAAAA==",
  },
  /** transferChecked on Toke…xuEb */
  [4][24]: {
    program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    accounts: [23, 52, 25, 13],
    data: "DAp+ZntVAAAABg==",
  },
  /** transferChecked on Toke…xuEb */
  [4][25]: {
    program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    accounts: [1, 40, 18, 0],
    data: "DP1dAAAAAAAABg==",
  },
  /** transferChecked on Toke…xuEb */
  [4][26]: {
    program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    accounts: [1, 40, 19, 0],
    data: "DHEAAAAAAAAABg==",
  },
  /** event:TradeEvent on 6EF8…wF6P */
  [4][27]: {
    program: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
    accounts: [55],
    data: "5EWlLlHLmh2923/TTuZh7m/Rv42nNbnE1lhV4YAC4QmABnQzpHNe+lw12+Cw+qIfAAAAAAAAAAAKfmZ7VQAAAAGyURUGVeg3XqOn8goxKr2kom4CkFRLF245dwSs4HyCBcvn2GoAAAAAAAAAAAAAAAC94LREUdMBAAAAAAAAAAAAvUii+L/UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAF8AAAAAAAAA4wAAAAAAAACQGegoISePNxj2W71FY6nyYhRC9B720G716fW1Sioc9x4AAAAAAAAASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAAAYnV5X2V4YWN0X3F1b3RlX2luAAAAAAAAAAAAAAAAAAAAAACIEwAAAAAAAHEAAAAAAAAAAAAAAAbHFJMI1y5NsaBJjdmQgoM0GWUIX07pqvxG5W0kiUGKQ10AAAAAAADXMP4BAAAAAHHiCQEAAAAAHgAAAAAAAABIAAAAAAAAAKajAQAAAAAAAAAAAAAAAAA=",
  },
} as const;

/** Flat address space: static keys, then each table's writable, then readonly entries. */
const ADDRESSES = [...ACCOUNTS, ...LOOKUP_TABLE_ADDRESSES] as const;

/**
 * buildRemixedTransaction() is deliberately absent from this recipe.
 *
 * message version "v1" has no @solana/kit equivalent — TransactionVersion is 'legacy' | 0, so rebuilding this message would produce a different transaction from the one this recipe was verified against.
 *
 * Emitting a downgraded version anyway would return a message that is not the one the
 * verifier checked byte for byte. The instruction bytes above are still exact.
 */
