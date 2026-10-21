/**
 * Remixed from a public Solana transaction. No private key was used or needed.
 *
 * source signature : 3yB9Q1pqmZz9y52aLk5UT1yzbZjcztgS1d6vwAjdQQBiUisbefVyQLKTxm6X9KpANMw3esh7P6knn72yDwGfVZbp
 * slot / blockTime : 459383349 / 2026-10-20T21:42:59.000Z
 * message version  : v0
 * fee payer        : 3AkpFinNiqAUNzgp6UkxWBsrj3UR1ZTxgwem4hesoZUF
 *
 * This file is generated, then meant to be edited. Verification:
 *   node src/verify-recipe.mjs out/remix-3yB9Q1pq.ts
 * verifies the encoded bytes still match the chain byte for byte.
 */

// ------------------------------------------------------------- editable parameters

// ---------------------------------------------------------------- transaction

export const SOURCE_SIGNATURE = "3yB9Q1pqmZz9y52aLk5UT1yzbZjcztgS1d6vwAjdQQBiUisbefVyQLKTxm6X9KpANMw3esh7P6knn72yDwGfVZbp";
export const SOURCE_SLOT = 459383349;
export const FEE_PAYER = "3AkpFinNiqAUNzgp6UkxWBsrj3UR1ZTxgwem4hesoZUF";
export const RECIPE_VERSION = "v0";

/** 8 static account keys, in message order. */
export const ACCOUNTS = [
  "3AkpFinNiqAUNzgp6UkxWBsrj3UR1ZTxgwem4hesoZUF", // [0]
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL", // [1]
  "92SghfXicHAKSgmVg6VATPoJjzB641S3Z9MfX1u2pw9x", // [2]
  "552heUaHoQ8SGjA5Qbx2WcM9bfn5mXmswdx9kmD8ssUW", // [3]
  "ComputeBudget111111111111111111111111111111", // [4]
  "11111111111111111111111111111111", // [5]
  "T1TANpTeScyeqVzzgNViGDNrkQ6qHz9KrSBS4aNXvGT", // [6]
  "PoweredByT1tan11111111111111111111111111111", // [7]
] as const;

/**
 * Flat address space: static keys, then each lookup table's writable entries, then
 * its readonly entries. Instruction account indexes address this array, which is why
 * this transaction needs the table contents.
 */
export const LOOKUP_TABLE_ADDRESSES = [
  "D5YqVMoSxnqeZAKAUUE1Dm3bmjtdxQ5DCF356ozqN9cM", // table 0 writable[0]
  "428MeYEAVcvCy6nhUhhA2kWR2oUpfZTTGnVcro2gqsMF", // table 0 writable[1]
  "3nnVbsCfN1mwUk2XSLCnjzY3bDDTdzpnKjvRmd8nESS2", // table 0 writable[2]
  "CNC5TaeNQEoSPfQKZ7GgfM4R8WYAJRKRSHFCHkf2H7ko", // table 0 writable[3]
  "GtwzYxBQcPFNFQcYbdELuaKzb4DGJpGVU2ehLhzbffCw", // table 0 writable[4]
  "7ULN1YSsJ3tnC98PVko7qTS5iGzX73QY74vgMeHjwvkW", // table 0 writable[5]
  "DKCGgPdyLcPFJGTZzkhYeenEUWXPu5VED5ourTrW8PAM", // table 0 writable[6]
  "HjCLqmQmfMfM6EEuu6i7URWWSSSDSxUPbhykQSDV26u6", // table 0 writable[7]
  "GWWA6GRS3BHcayB5jY4Rv38rdqR95nrZE8sHrE5o8RE6", // table 0 writable[8]
  "3RrWDivfZQtJ64BeLFFBCBF4zCShqX7Hjq6coimtUZoe", // table 0 writable[9]
  "HRNrehVHSUME4xWuf5Du3jo84dNvxsWqvgrcXPMst6MW", // table 0 writable[10]
  "DQNjjKtXhKuBKNmQqvLbe41hhzFnA1HhtKvyQ9cUqRvD", // table 0 writable[11]
  "CVzxThKLEa81nkDgz6FSaffrJxeVAg6PstNDbEUzH9c", // table 0 writable[12]
  "7NbPAgjn6W9xH6G1opqYAXVVuJBAtn67DDbD5PTCbA3o", // table 0 writable[13]
  "9PsHds1eaSLgTBmSefJ2KhjGRcVCbwP9SkaYiWFr31yP", // table 0 writable[14]
  "E5D142djU2atMNuLq8nPr4X2bgskqW32nhYWqPPzU1gS", // table 0 writable[15]
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // table 0 readonly[0]
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // table 0 readonly[1]
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // table 0 readonly[2]
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", // table 0 readonly[3]
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // table 0 readonly[4]
  "Sysvar1nstructions1111111111111111111111111", // table 0 readonly[5]
  "5AVyF6qJBi8GxVjh6nh4Ew1DiJZugPxz9m58a8v2osk2", // table 0 readonly[6]
  "8mZVRgrrDjbhGdb6TSfHbhwoB4FoGDfo6D231PM7GDfW", // table 0 readonly[7]
  "RGJMmUuEmACoK2dbwSyHi5F4ShJzwxfgdRF4Yoxb11N", // table 0 readonly[8]
  "AQU1FRd7papthgdrwPTTq5JacJh8YtwEXaBfKU3bTz45", // table 0 readonly[9]
  "ZERor4xhbUycZ6gb9ntrhqscUcZmAbQDjEAtCf4hbZY", // table 0 readonly[10]
  "SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe", // table 0 readonly[11]
] as const;

export const ADDRESS_SPACE_SIZE = 36;

export const INSTRUCTION_BYTES = {
  /** SetComputeUnitLimit */
  0: {
    program: "ComputeBudget111111111111111111111111111111",
    accounts: [],
    data: "Aqj0DAA=",
  },
  /** SetComputeUnitPrice */
  1: {
    program: "ComputeBudget111111111111111111111111111111",
    accounts: [],
    data: "A+lMHAAAAAAA",
  },
  /** Transfer */
  2: {
    program: "11111111111111111111111111111111",
    accounts: [0, 1],
    data: "AgAAABYcAAAAAAAA",
  },
  /** RequestHeapFrame */
  3: {
    program: "ComputeBudget111111111111111111111111111111",
    accounts: [],
    data: "AQAABAA=",
  },
  /** (unknown) */
  4: {
    program: "T1TANpTeScyeqVzzgNViGDNrkQ6qHz9KrSBS4aNXvGT",
    accounts: [0, 0, 8, 2, 3, 24, 25, 5, 26, 6, 6, 6, 9, 10, 27, 28, 29, 8, 24, 10, 28, 24, 9, 27, 30, 11, 31, 32, 12, 13, 14, 15, 33, 16, 5, 17, 18, 19, 20, 9, 10, 8, 24, 27, 24, 28, 29, 34, 8, 21, 22, 23, 9, 10, 24, 29, 35, 7],
    data: "KgLAXBUAAAAAAFpDCwIAAAAAyAACAAAUAwAAABgAAVVD3hMRDQAAAAAAAAAAAAH/ZM0dDw4AAAH9yZo7CQ==",
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
  [4][0]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [2, 9, 0],
    data: "A8BcFQAAAAAA",
  },
  /** swap on AQU1…Tz45 */
  [4][1]: {
    program: "AQU1FRd7papthgdrwPTTq5JacJh8YtwEXaBfKU3bTz45",
    accounts: [29, 8, 24, 10, 28, 24, 9, 27, 30, 11, 31, 32, 12, 13, 14, 15],
    data: "AcBcFQAAAAAA",
  },
  /** transferChecked on Toke…Q5DA */
  [4][2]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [13, 28, 10, 12],
    data: "DOAhCwIAAAAABg==",
  },
  /** transferChecked on Toke…Q5DA */
  [4][3]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [9, 27, 15, 8],
    data: "DMBcFQAAAAAACA==",
  },
  /** transfer on Toke…Q5DA */
  [4][4]: {
    program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    accounts: [10, 3, 8],
    data: "A3wUCwIAAAAA",
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
