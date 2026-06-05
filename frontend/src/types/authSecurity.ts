export interface SessionCryptoMaterial {
  keyId: string
  aesKeyB64: string
  keyVersion: number
  expiresAt: string | number
}
