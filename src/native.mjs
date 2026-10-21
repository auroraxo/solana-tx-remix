/**
 * Native (non-Anchor) program decoders.
 *
 * bitquery/solana-idl-lib ships `native/compute-budget.json` with an EMPTY instruction
 * list and no discriminants, and `native/system.json` with instruction names but no
 * `discriminant` either. So for every transaction that touches a fee budget, creates or
 * funds an account, or hits the system program, the dispatch table had nothing to match
 * and the tool reported `0/N decoded` for the top-level instructions.
 *
 * That silence was the wrong kind of correct. `decoded: 0/5` reads like "nothing here to
 * name"; the truth is "the names exist and the loader had no way to reach them", and the
 * two look identical from the outside.
 *
 * Native programs do not use an Anchor sha256 discriminator. Each encodes its instruction
 * as a small integer selector followed directly by bincode-encoded args, and **the width
 * of that selector differs per program**:
 *
 *   - ComputeBudget: `data[0] = discriminator`, one byte, then the integer arg LE.
 *     Verified in anza-xyz/solana-sdk `compute-budget-interface/src/lib.rs`, whose
 *     `to_instruction!` macro writes `data[0] = $discriminator` into a buffer of
 *     `size_of::<$num_type>() + 1`.
 *   - System: a u32 little-endian bincode enum tag, then the args.
 *
 * A single "small tag" rule gets both wrong in both directions: read System's 4-byte tag
 * as 1 byte and `Transfer(lamports)` decodes as a different instruction; read
 * ComputeBudget's 1-byte selector as 4 and every fee instruction fails to match.
 *
 * Both enums below are transcribed from pinned upstream sources so the table is
 * auditable rather than guessed. `PROVENANCE` records where each row came from; a
 * future upstream change is a diff against that pin, not a silent mislabel.
 */

/** anza-xyz/solana-sdk @ 8db406e2edfafa25939ec782b77b5b6f30de164d */
const SDK_PIN = "anza-xyz/solana-sdk@8db406e2edfafa25939ec782b77b5b6f30de164d";

const COMPUTE_BUDGET = "ComputeBudget111111111111111111111111111111";
const SYSTEM = "11111111111111111111111111111111";

/**
 * ComputeBudgetInstruction, in declaration order. `Unused` (0) is a reserved deprecated
 * variant: it carries no data and never appears on chain.
 *
 * Order independently corroborated by Lightprotocol/light-protocol
 * `sdk-libs/instruction-decoder/src/programs/compute_budget.rs`, which documents each
 * variant with its explicit index.
 */
const COMPUTE_BUDGET_IXS = [
  { selector: 0, name: "Unused", args: [] },
  { selector: 1, name: "RequestHeapFrame", args: ["bytes"], argWidth: 4 },
  { selector: 2, name: "SetComputeUnitLimit", args: ["units"], argWidth: 4 },
  { selector: 3, name: "SetComputeUnitPrice", args: ["micro_lamports"], argWidth: 8 },
  { selector: 4, name: "SetLoadedAccountsDataSizeLimit", args: ["bytes"], argWidth: 4 },
];

/**
 * SystemInstruction, in declaration order, with bincode args.
 *
 * Names and args are cross-checked against bitquery/solana-idl-lib `native/system.json`,
 * which carries the same variant list (its first twelve entries match this table 1:1 in
 * name, order and argument types) even though it omits the discriminants.
 */
const SYSTEM_IXS = [
  { selector: 0, name: "CreateAccount", args: ["lamports:u64", "space:u64", "owner:publicKey"] },
  { selector: 1, name: "Assign", args: ["owner:publicKey"] },
  { selector: 2, name: "Transfer", args: ["lamports:u64"] },
  { selector: 3, name: "CreateAccountWithSeed", args: ["base:publicKey", "seed:string", "lamports:u64", "space:u64", "owner:publicKey"] },
  { selector: 4, name: "AdvanceNonceAccount", args: [] },
  { selector: 5, name: "WithdrawNonceAccount", args: ["lamports:u64"] },
  { selector: 6, name: "InitializeNonceAccount", args: ["authorized:publicKey"] },
  { selector: 7, name: "AuthorizeNonceAccount", args: ["authorized:publicKey"] },
  { selector: 8, name: "Allocate", args: ["space:u64"] },
  { selector: 9, name: "AllocateWithSeed", args: ["base:publicKey", "seed:string", "space:u64", "owner:publicKey"] },
  { selector: 10, name: "AssignWithSeed", args: ["base:publicKey", "seed:string", "owner:publicKey"] },
  { selector: 11, name: "TransferWithSeed", args: ["lamports:u64", "from_seed:string", "from_owner:publicKey"] },
];

export const PROVENANCE = {
  [COMPUTE_BUDGET]: {
    selectorWidth: 1,
    selectorEncoding: "u8",
    argEncoding: "little-endian, no bincode wrapper",
    source: `${SDK_PIN} compute-budget-interface/src/lib.rs`,
    corroborated: "Lightprotocol/light-protocol compute_budget.rs (explicit per-variant index)",
  },
  [SYSTEM]: {
    selectorWidth: 4,
    selectorEncoding: "u32le bincode enum tag",
    argEncoding: "bincode",
    source: `${SDK_PIN} system-interface/src/instruction.rs`,
    corroborated: "bitquery/solana-idl-lib native/system.json (names, order, arg types)",
  },
};

const TABLES = new Map([
  [COMPUTE_BUDGET, { width: 1, ixs: COMPUTE_BUDGET_IXS }],
  [SYSTEM, { width: 4, ixs: SYSTEM_IXS }],
]);

function readLE(buf, width) {
  let v = 0n;
  for (let i = width - 1; i >= 0; i--) v = (v << 8n) | BigInt(buf[i]);
  return v;
}

/**
 * Decode a native instruction's data buffer.
 *
 * Returns null when the program is unknown, the selector is unclaimed, or the payload
 * does not fit the declared shape — every one of which is a real "we cannot name this",
 * not a guess. A decoded name is only returned when the bytes are long enough to hold
 * the args the enum declares, so a truncated or mis-selected instruction stays unnamed
 * rather than acquiring a confident wrong label.
 */
export function decodeNative(program, data) {
  const table = TABLES.get(program);
  if (!table || !data?.length) return null;

  if (data.length < table.width) return null;
  const selector = Number(readLE(data.subarray(0, table.width), table.width));
  const entry = table.ixs[selector];
  if (!entry) return null;

  // ComputeBudget args are a bare LE integer; System args are bincode. Length is checked
  // against the declared shape rather than assumed, so extra or missing bytes do not
  // silently decode to a wrong value.
  let args = null;
  if (entry.argWidth !== undefined) {
    if (data.length < table.width + entry.argWidth) return null;
    args = { [entry.args[0]]: readLE(data.subarray(table.width), entry.argWidth) };
  } else {
    const parsed = decodeBincodeArgs(data.subarray(table.width), entry.args);
    if (parsed === undefined) return null;
    args = parsed;
  }

  return {
    name: entry.name,
    scheme: "native",
    tagLen: table.width,
    selector,
    args,
    programName: program === SYSTEM ? "system" : "compute_budget",
    source: PROVENANCE[program].source,
  };
}

/**
 * Minimal bincode reader for the SystemInstruction arg shapes above. Bincode here is
 * little-endian, fixed-width integers by uN, and 4-byte length-prefixed strings; Solana
 * addresses are 32 raw bytes, not base58 text.
 *
 * Returns undefined when the buffer runs out mid-arg, which keeps a malformed payload
 * unnamed instead of half-decoded.
 */
function decodeBincodeArgs(buf, specs) {
  const out = {};
  let off = 0;
  for (const spec of specs) {
    const [name, type] = spec.split(":");
    if (type === "u64") {
      if (off + 8 > buf.length) return undefined;
      out[name] = readLE(buf.subarray(off), 8);
      off += 8;
    } else if (type === "publicKey") {
      if (off + 32 > buf.length) return undefined;
      out[name] = `0x${buf.subarray(off, off + 32).toString("hex")}`;
      off += 32;
    } else if (type === "string") {
      if (off + 4 > buf.length) return undefined;
      const len = Number(readLE(buf.subarray(off), 4));
      off += 4;
      if (off + len > buf.length) return undefined;
      out[name] = buf.subarray(off, off + len).toString("utf8");
      off += len;
    } else {
      return undefined;
    }
  }
  return off === buf.length ? out : undefined;
}

/** Programs this module can name, for the coverage report. */
export function nativePrograms() {
  return [...TABLES.keys()];
}

/** Whether `program` + `name` came from this module (used by the verifier). */
export function isNative(program, name) {
  const table = TABLES.get(program);
  if (!table) return false;
  return table.ixs.some((ix) => ix.name === name);
}

/** Programs whose instruction encoding this module owns. */
export function isNativeProgram(program) {
  return TABLES.has(program);
}

/** Whether some native program implements this instruction name. */
export function isNativeName(name) {
  for (const table of TABLES.values()) {
    if (table.ixs.some((ix) => ix.name === name)) return true;
  }
  return false;
}

/** Short label for a native program, used in verifier messages. */
export function nativeProgramLabel(program) {
  return program === SYSTEM ? "System" : program === COMPUTE_BUDGET ? "ComputeBudget" : "native";
}

function le(width, value) {
  const out = Buffer.alloc(width);
  let v = BigInt(value);
  for (let i = 0; i < width; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/**
 * Re-encode a decoded native instruction back to bytes.
 *
 * Returns null when the instruction belongs to a different program, which is the point:
 * `Transfer` exists only on System, and re-encoding it against ComputeBudget must fail
 * rather than produce plausible bytes. Together with {@link decodeNative} this gives the
 * verifier a round trip — a name that does not re-encode to the bytes it was read from is
 * a wrong name, and that is the failure the byte-identity check alone cannot see.
 */
export function encodeNative(program, name, values = null) {
  const table = TABLES.get(program);
  if (!table) return null;
  const entry = table.ixs.find((ix) => ix.name === name);
  if (!entry) return null;

  const head = le(table.width, entry.selector);

  if (entry.argWidth !== undefined) {
    // `entry.args` holds arg *names* (e.g. ["units"]); the value must come from `values`,
    // which the verifier fills by decoding the original bytes first. Reading the name
    // string here would silently encode NaN-width garbage instead of failing.
    const key = entry.args[0];
    const v = values ? values[key] : undefined;
    if (v === undefined || v === null) return null;
    return Buffer.concat([head, le(entry.argWidth, v)]);
  }

  const body = encodeBincodeArgs(entry.args, values);
  return body === undefined ? null : Buffer.concat([head, body]);
}

function encodeBincodeArgs(specs, values) {
  if (!values) return undefined;
  const chunks = [];
  for (const spec of specs) {
    const [name, type] = spec.split(":");
    const v = values[name];
    if (v === undefined || v === null) return undefined;
    if (type === "u64") {
      chunks.push(le(8, v));
    } else if (type === "publicKey") {
      const hex = String(v).replace(/^0x/, "");
      if (hex.length !== 64) return undefined;
      chunks.push(Buffer.from(hex, "hex"));
    } else if (type === "string") {
      const bytes = Buffer.from(String(v), "utf8");
      chunks.push(le(4, bytes.length), bytes);
    } else {
      return undefined;
    }
  }
  return Buffer.concat(chunks);
}