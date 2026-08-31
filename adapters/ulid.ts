import type { Clock } from "../core/ports/clock.ts";
import type { IdGen } from "../core/ports/id-gen.ts";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const systemClock: Clock = {
  now: () => new Date(),
};

export class UlidGenerator implements IdGen {
  readonly #clock: Clock;

  constructor(clock: Clock = systemClock) {
    this.#clock = clock;
  }

  next(): string {
    const timestamp = this.#clock.now().getTime();
    if (!Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > 0xffffffffffff) {
      throw new RangeError("ULID timestamp must fit in 48 bits");
    }

    return encodeTimestamp(timestamp) + encodeRandomness(randomBytes());
  }
}

function encodeTimestamp(timestamp: number): string {
  let remaining = BigInt(timestamp);
  let encoded = "";
  for (let index = 0; index < 10; index += 1) {
    encoded = ALPHABET[Number(remaining & 31n)] + encoded;
    remaining >>= 5n;
  }
  return encoded;
}

function randomBytes(): Uint8Array {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return bytes;
}

function encodeRandomness(bytes: Uint8Array): string {
  let bits = 0;
  let buffer = 0;
  let encoded = "";

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += ALPHABET[(buffer >>> bits) & 31];
      buffer &= (1 << bits) - 1;
    }
  }

  return encoded;
}
