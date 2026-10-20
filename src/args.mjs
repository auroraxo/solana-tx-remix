/**
 * arg-schema extraction: read the program's own generated decoder and turn an opaque
 * instruction byte blob into named fields a developer can actually edit.
 *
 * We parse the generated `getStructDecoder([...])` list rather than hand-copying layouts,
 * so if the program changes an argument, the recipe follows instead of drifting.
 */
import fs from "node:fs";
import path from "node:path";

/** Parse one generated instruction module for its data-decoder field list. */
export function parseArgSchema(file) {
  const src = fs.readFileSync(file, "utf8");
  // Find the decoder struct: getStructDecoder([ ["name", getXDecoder()], ... ])
  const decoderStart = src.indexOf("getStructDecoder([");
  if (decoderStart < 0) return null;
  const open = src.indexOf("[", decoderStart);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  const body = src.slice(open + 1, end);
  const fields = [];
  const re = /\[\s*"([A-Za-z0-9_]+)"\s*,\s*(get[A-Za-z0-9]+Decoder)\(/g;
  let m;
  while ((m = re.exec(body))) {
    fields.push({ name: m[1], decoder: m[2] });
  }
  return fields;
}

const DECODER_SIZES = {
  getU64Decoder: 8,
  getU32Decoder: 4,
  getU16Decoder: 2,
  getU8Decoder: 1,
  getBooleanDecoder: 1,
  getI64Decoder: 8,
  getU128Decoder: 16,
  getBytesDecoder: null, // variable / fixed via fixDecoderSize wrapper
};

/**
 * Decode instruction args (bytes after the 8-byte discriminator) using a parsed schema.
 * Returns named values; fields whose encoding we cannot interpret stay as hex so nothing
 * is silently dropped or misreported.
 */
export function decodeArgs(schema, argBytes) {
  if (!schema) return { __raw: argBytes.toString("base64") };
  const out = {};
  let off = 0;
  for (const field of schema) {
    if (field.name === "discriminator") continue;
    if (off >= argBytes.length) {
      out[field.name] = null;
      continue;
    }
    const dec = field.decoder;
    if (dec === "getU64Decoder" || dec === "getI64Decoder" || dec === "getU32Decoder" || dec === "getU16Decoder" || dec === "getU8Decoder" || dec === "getBooleanDecoder" || dec === "getU128Decoder") {
      const size = DECODER_SIZES[dec];
      if (off + size > argBytes.length) {
        out[field.name] = { __truncated: argBytes.subarray(off).toString("base64") };
        off = argBytes.length;
        continue;
      }
      if (dec === "getBooleanDecoder") {
        out[field.name] = argBytes[off] !== 0;
      } else if (dec === "getU64Decoder" || dec === "getI64Decoder") {
        const v = argBytes.readBigUInt64LE(off);
        out[field.name] = dec === "getI64Decoder" ? BigInt.asIntN(64, v).toString() : v.toString();
      } else if (dec === "getU128Decoder") {
        const lo = argBytes.readBigUInt64LE(off);
        const hi = argBytes.readBigUInt64LE(off + 8);
        out[field.name] = (hi << 64n) + lo;
        out[field.name] = out[field.name].toString();
      } else {
        out[field.name] = size === 1 ? argBytes[off] : argBytes.readUIntLE(off, size);
      }
      off += size;
    } else if (dec === "getBytesDecoder") {
      // fixDecoderSize(getBytesDecoder(), 8) in generated code — consume 8.
      const size = 8;
      if (off + size <= argBytes.length) {
        out[field.name] = Buffer.from(argBytes.subarray(off, off + size)).toString("base64");
        off += size;
      }
    } else if (dec === "getOptionDecoder") {
      // option prefix: 1 byte present-flag; without the nested layout we stop here and
      // report the remainder raw rather than guessing.
      out[field.name] = { __optionRemaining: argBytes.subarray(off).toString("base64") };
      off = argBytes.length;
    } else {
      out[field.name] = { __unsupportedDecoder: dec };
      off = argBytes.length;
    }
  }
  if (off < argBytes.length) out.__trailing = argBytes.subarray(off).toString("base64");
  return out;
}

export function schemaForInstruction(genDir, name) {
  if (!name) return null;
  // SWAP_V2 -> swapV2.ts, DECREASE_LIQUIDITY_V2 -> decreaseLiquidityV2.ts
  const camel = name.toLowerCase().replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  const file = path.join(genDir, `${camel}.ts`);
  if (!fs.existsSync(file)) return null;
  return parseArgSchema(file);
}
