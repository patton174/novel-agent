package cn.novelstudio.platform.security;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

public final class AesGcmCodec {

    private static final int IV_LEN = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec keySpec;
    private final SecureRandom random = new SecureRandom();

    public AesGcmCodec(byte[] keyBytes) {
        if (keyBytes == null || keyBytes.length != 32) {
            throw new IllegalArgumentException("AES key must be 32 bytes");
        }
        this.keySpec = new SecretKeySpec(keyBytes, "AES");
    }

    public static AesGcmCodec fromBase64Key(String keyB64) {
        return new AesGcmCodec(Base64.getDecoder().decode(keyB64));
    }

    public static String randomKeyBase64() {
        byte[] key = new byte[32];
        new SecureRandom().nextBytes(key);
        return Base64.getEncoder().encodeToString(key);
    }

    public String encryptToBase64(String plaintext) {
        try {
            byte[] iv = new byte[IV_LEN];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ct = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            ByteBuffer buf = ByteBuffer.allocate(iv.length + ct.length);
            buf.put(iv);
            buf.put(ct);
            return Base64.getEncoder().encodeToString(buf.array());
        } catch (Exception ex) {
            throw new IllegalStateException("encrypt failed", ex);
        }
    }

    public String decryptFromBase64(String ciphertextB64) {
        try {
            byte[] all = Base64.getDecoder().decode(ciphertextB64);
            byte[] iv = new byte[IV_LEN];
            System.arraycopy(all, 0, iv, 0, IV_LEN);
            byte[] ct = new byte[all.length - IV_LEN];
            System.arraycopy(all, IV_LEN, ct, 0, ct.length);
            return decryptBytes(iv, ct);
        } catch (Exception ex) {
            throw new IllegalStateException("decrypt failed", ex);
        }
    }

    public String decryptIvAndCt(String ivB64, String ctB64) {
        try {
            byte[] iv = Base64.getDecoder().decode(ivB64);
            byte[] ct = Base64.getDecoder().decode(ctB64);
            return decryptBytes(iv, ct);
        } catch (Exception ex) {
            throw new IllegalStateException("decrypt failed", ex);
        }
    }

    /** 字段级加密：iv+ct 合并 base64（与 encryptToBase64 对称） */
    public String encryptFieldPart(String plaintext) {
        return encryptToBase64(plaintext);
    }

    public String decryptFieldPart(String ciphertextB64) {
        return decryptFromBase64(ciphertextB64);
    }

    private String decryptBytes(byte[] iv, byte[] ct) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(TAG_BITS, iv));
        return new String(cipher.doFinal(ct), StandardCharsets.UTF_8);
    }
}
