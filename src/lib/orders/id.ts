/** Crockford-style alphabet without I, L, O, U: readable aloud, no ambiguous characters. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Human-readable reference, e.g. VICE-7KQ2M9XA (40 bits from a CSPRNG). Uniqueness is enforced by the store. */
export function generatePaymentId(prefix = "VICE"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}-${Array.from(bytes, (b) => ALPHABET[b & 31]).join("")}`;
}

export const paymentIdPattern = /^VICE-[0-9A-HJKMNP-TV-Z]{8}$/;

/** Internal order id. */
export function generateOrderId(): string {
  return crypto.randomUUID();
}
