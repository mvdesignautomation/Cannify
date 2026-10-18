const BATCH_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function newBatchId(existing: Set<string>): string {
  for (let attempt = 0; attempt < 32; attempt++) {
    let body = "";
    const bytes = new Uint8Array(6);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    for (const byte of bytes) {
      body += BATCH_ALPHABET[byte % BATCH_ALPHABET.length];
    }
    const id = `B-${body.slice(0, 3)}-${body.slice(3)}`;
    if (!existing.has(id)) return id;
  }
  return `B-${newId().slice(0, 8).toUpperCase()}`;
}

export function itemQrPayload(itemId: string): string {
  return `cannify:item:${itemId}`;
}

export function parseItemQrPayload(raw: string): string | null {
  const value = raw.trim();
  const prefixed = value.match(/^cannify:item:([0-9a-f-]{36})$/i);
  if (prefixed) return prefixed[1];
  const uuid = value.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  if (uuid) return value;
  return null;
}
