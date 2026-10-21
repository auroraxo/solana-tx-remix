// Measures how much of mainnet is version 1 (SIMD-0385), from two independent sources.
//
// Why this exists: the README claims a v1 share. A claim without its measurement path
// and denominator is the defect this repository is built to catch, so the path ships too.
// It runs in a fresh clone with zero dependencies: public mainnet RPC and node, nothing else.
//
// Two version sources, deliberately:
//   rpc    — the `version` key on the block entry (what a normal client sees)
//   wire   — byte 0 of the transaction, 0x81 (what the bytes themselves say)
// They are independent: the RPC field is metadata, the first byte is the encoding. A v0
// shortvec signature count can never be 0x81 — 0x81 would mean 129 signatures and the
// message would not fit — so `wire` cannot accidentally agree with `rpc` for the wrong
// reason. Disagreements are printed, not hidden.
//
// Usage: node ci/v1-share.mjs [--blocks 24] [--step 400]
// Exits non-zero only when there is no verdict (RPC unusable). Never because a number moved:
// the share changes with the chain, so a gate on it would be a gate on the weather.

const RPC = process.env.SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const BLOCKS = arg('blocks', 24);
const STEP = arg('step', 400); // slots between sampled blocks

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rpc(method, params) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(RPC, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      const body = await res.json();
      if (body.error) return { error: body.error };
      return { result: body.result };
    } catch {
      await sleep(1000 * (attempt + 1));
    }
  }
  return { error: { message: 'no verdict: RPC unusable after retries' } };
}

const headRes = await rpc('getSlot', [{ commitment: 'confirmed' }]);
if (headRes.error) {
  console.error(`getSlot failed: ${JSON.stringify(headRes.error)}`);
  process.exit(2);
}
const head = headRes.result;

const byRpc = new Map();
const byWire = new Map();
const byFailed = new Map();
let total = 0;
let failed = 0;
let disagreements = 0;
let blocksOk = 0;
let blocksBad = 0;
let firstTime = null;
let lastTime = null;
const sampledSlots = [];

const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

for (let i = 0; i < BLOCKS; i++) {
  const slot = head - i * STEP;
  const res = await rpc('getBlock', [
    slot,
    {
      encoding: 'base64',
      transactionDetails: 'full',
      rewards: false,
      maxSupportedTransactionVersion: 1,
      commitment: 'confirmed',
    },
  ]);
  if (res.error) {
    blocksBad++;
    continue;
  }
  blocksOk++;
  sampledSlots.push(slot);
  const block = res.result;
  if (typeof block.blockTime === 'number') {
    firstTime = firstTime === null ? block.blockTime : Math.min(firstTime, block.blockTime);
    lastTime = lastTime === null ? block.blockTime : Math.max(lastTime, block.blockTime);
  }
  for (const entry of block.transactions) {
    const wire = Buffer.from(entry.transaction[0], 'base64');
    const rpcVersion = entry.version === undefined ? 'legacy' : String(entry.version);
    // The wire-level v1 marker: byte 0 is `0x81`. A v0 shortvec signature count can never
    // reach 0x80 — that bit means "continue", and real signature counts are 1–3 — so byte 0
    // is either a small count (legacy, v0) or the 0x81 prefix (v1). The control is symmetric:
    // it fires if a v1 transaction lacks the prefix, and if a non-v1 transaction has it.
    const wireIsV1 = wire[0] === 0x81;
    const rpcIsV1 = rpcVersion === '1';
    const didFail = Boolean(entry.meta && entry.meta.err);

    total++;
    if (didFail) failed++;
    bump(byRpc, rpcVersion);
    bump(byWire, wireIsV1 ? '1' : '0-or-legacy-bytes');
    if (didFail) bump(byFailed, rpcVersion);
    if (wireIsV1 !== rpcIsV1) disagreements++;
  }
  await sleep(400);
}

if (blocksOk === 0 || total === 0) {
  console.error('no verdict: zero blocks or zero transactions parsed');
  process.exit(2);
}

const successful = total - failed;
const pct = (n, d) => (d === 0 ? '0.0' : ((100 * n) / d).toFixed(1));
const sorted = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);

console.log(JSON.stringify({
  endpoint: RPC,
  headSlot: head,
  sampledSlots,
  blocksOk,
  blocksFailed: blocksBad,
  timeRange: firstTime === null ? null : [
    new Date(firstTime * 1000).toISOString(),
    new Date(lastTime * 1000).toISOString(),
  ],
  transactions: total,
  failedTransactions: failed,
  successfulTransactions: successful,
  versionShareAll: sorted(byRpc).map(([v, n]) => ({ version: v, n, pct: pct(n, total) })),
  versionShareSuccessful: sorted(byRpc).map(([v, n]) => {
    const f = byFailed.get(v) ?? 0;
    return { version: v, n: n - f, pct: pct(n - f, successful) };
  }),
  versionShareByWirePrefix: sorted(byWire).map(([v, n]) => ({ version: v, n, pct: pct(n, total) })),
  failedByVersion: Object.fromEntries(sorted(byFailed)),
  controlWirePrefixDisagreements: disagreements,
}, null, 2));