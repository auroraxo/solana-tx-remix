/**
 * sememe-idl-source.mjs — the stored on-chain IDL as a SOURCE for the emitters.
 *
 * `src/sememe-idl.mjs` already consumes the stored artifact for the verifier: it decodes
 * one instruction payload and re-checks the fingerprint first. The emitters had no such
 * path — they read Codama-generated TypeScript modules that are not in this repository, so
 * a fresh clone could not emit a single named Whirlpool argument or account role. This
 * module gives them the same artifact:
 *
 *   - `sememeIdlTable()`       — discriminator -> instruction name, the shape the emitters
 *                                already consume (`buildRecipe` takes an `idlMap`)
 *   - `sememeAccountRoles()`   — account role names for one instruction
 *   - `sememeDecodeArgs()`     — named arguments for one instruction payload
 *   - `sememeAccountAddresses()` — program addresses the IDL pins (memo program, ...)
 *
 * Why this is a SUPERSET of the generated codecs, measured on 28.10.: the stored IDL
 * carries all 57 discriminators the generated directory carries, with identical names, and
 * 9 more the generated directory does not have at all
 * (`close_position_with_token_extensions`, `initialize_position_bundle_with_metadata`,
 * `set_reward_authority_by_super_authority`, …). So a recipe emitted from the stored IDL
 * can name instructions the generated path could not name at all.
 *
 * Two things change for the reader of a recipe, and both are improvements rather than
 * cosmetics:
 *
 *   1. Argument names come from the program itself. The generated path decoded
 *      `remaining_accounts_info` as `{"__optionRemaining":"AA=="}` — an opaque base64
 *      remainder it declined to interpret. The stored IDL decodes it as
 *      `{"__option":"None"}`, which is what the bytes actually say.
 *   2. Account roles come from the program's own account list, so they are the program's
 *      vocabulary rather than the generator's TypeScript type-parameter names.
 *
 * The stored IDL is checked before use, exactly as in the verifier: the object must
 * re-hash to the fingerprint its receipt claims. A store that is present and does not
 * verify is reported as BROKEN and is NOT used — silently falling back would put the same
 * defect back that this migration exists to remove.
 */
import { ABSENT, BROKEN, decodeWithSememe, loadStoredIdl, sememeStatus } from "./sememe-idl.mjs";

export { ABSENT, BROKEN };

/**
 * The stored IDL, or a reason why there is none.
 *
 * Returns `{ idl, reason, error }`. `reason` is `absent` when there is nothing here (a
 * machine without a sememe checkout or store — the caller may fall back to the generated
 * codecs) and `broken` when something IS here and does not verify (the caller must not
 * fall back silently).
 */
export async function loadSememeIdl(program) {
  const stored = await loadStoredIdl(program);
  if (stored.error) return { idl: null, reason: stored.reason, error: stored.error };
  return { idl: stored.idl, reason: null, error: null };
}

/**
 * A discriminator -> instruction table in the shape `buildRecipe` consumes.
 *
 * The generated table's entries are `{ name, snake, file }`; only `name` is read by the
 * emitters, but the other two are kept so a caller cannot tell the two sources apart by
 * accident — and so the name is UPPERCASE, matching the generated convention. The
 * verifier compares labels case-insensitively, but a recipe that suddenly changed case
 * would be a gratuitous diff for every reader.
 */
export async function sememeIdlTable(program) {
  const { idl, reason, error } = await loadSememeIdl(program);
  if (!idl) return { table: new Map(), reason, error };
  const table = new Map();
  for (const instruction of idl.instructions ?? []) {
    const discriminator = instruction.discriminator;
    if (!Array.isArray(discriminator) || discriminator.length === 0) continue;
    const key = Buffer.from(discriminator).toString("hex");
    const name = String(instruction.name).toUpperCase();
    table.set(key, { name, snake: String(instruction.name), file: null, scheme: "anchor" });
  }
  return { table, reason: null, error: null };
}

/**
 * Account role names for one instruction, in order.
 *
 * The IDL's own account list is the program's vocabulary: `token_program_a`,
 * `whirlpool`, `tick_array_0`, … The generated path produced the same information from
 * the TypeScript type parameters of a generated module (`TAccountTokenProgramA`), so the
 * two agree on the flagship's roles — which is what makes the emitted recipe comparable
 * before and after the migration.
 */
export async function sememeAccountRoles(program, instructionName) {
  const { idl, reason, error } = await loadSememeIdl(program);
  if (!idl) return { roles: [], reason, error };
  const wanted = String(instructionName).toLowerCase();
  const instruction = (idl.instructions ?? []).find((i) => String(i.name).toLowerCase() === wanted);
  if (!instruction) return { roles: [], reason: null, error: null };
  const roles = (instruction.accounts ?? []).map((a) => String(a.name));
  return { roles, reason: null, error: null };
}

/**
 * Named arguments for one instruction payload, decoded from the stored IDL.
 *
 * Returns `{ args, trailing, idlName, reason, error }`. `args` is JSON-safe (64/128-bit
 * integers are decimal strings), matching what a recipe file can hold as a literal.
 */
export async function sememeDecodeArgs(program, data) {
  const decoded = await decodeWithSememe(data, program);
  if (decoded.error) return { args: null, reason: null, error: decoded.error };
  return {
    args: decoded.args,
    trailing: decoded.trailing,
    idlName: decoded.idlName,
    reason: null,
    error: null,
  };
}

/**
 * Program addresses the IDL pins for one instruction.
 *
 * An Anchor account entry may carry an explicit `address` (a program the instruction
 * calls, e.g. the memo program). The generated path carried the same information in the
 * generated module; the stored IDL carries it in the account list. Returned as a map from
 * role name to address, so the emitter can name a pinned program the same way.
 */
export async function sememeAccountAddresses(program, instructionName) {
  const { idl, reason, error } = await loadSememeIdl(program);
  if (!idl) return { addresses: {}, reason, error };
  const wanted = String(instructionName).toLowerCase();
  const instruction = (idl.instructions ?? []).find((i) => String(i.name).toLowerCase() === wanted);
  if (!instruction) return { addresses: {}, reason: null, error: null };
  const addresses = {};
  for (const account of instruction.accounts ?? []) {
    if (account?.address) addresses[String(account.name)] = String(account.address);
  }
  return { addresses, reason: null, error: null };
}

/** Whether the stored artifact is usable here, and why not if it is not. */
export async function sememeEmitterStatus(program) {
  const status = await sememeStatus(program);
  return {
    usable: status.usable,
    reason: status.reason,
    error: status.error,
    fingerprint: status.fingerprint ?? null,
  };
}
