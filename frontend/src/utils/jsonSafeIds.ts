/** Snowflake id 字段：JSON number 超过 MAX_SAFE_INTEGER 会在 parse 时丢精度 */
const SAFE_ID_FIELD = /^(id|userId|actorId|targetId|ownerId|createdBy|sub)$/

/**
 * 在 JSON.parse 之前把超长整型 id 字段改成字符串，避免 2064977478497079297 → …9300。
 */
export function sanitizeJsonIdsForParse(raw: string): string {
  return raw.replace(
    /"([^"]+)"\s*:\s*(-?\d{16,})(?=\s*[,}\]])/g,
    (match, key: string, digits: string) =>
      SAFE_ID_FIELD.test(key) ? `"${key}":"${digits}"` : match,
  )
}

export function parseJsonWithSafeIds(text: string): unknown {
  return JSON.parse(sanitizeJsonIdsForParse(text))
}
