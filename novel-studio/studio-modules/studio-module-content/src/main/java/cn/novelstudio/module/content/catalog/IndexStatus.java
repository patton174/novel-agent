package cn.novelstudio.module.content.catalog;

import java.util.Locale;

/** Wire values: pending | indexing | indexed | failed (legacy {@code ready} maps to indexed). */
public enum IndexStatus {
    PENDING,
    INDEXING,
    INDEXED,
    FAILED;

    public String wire() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static IndexStatus fromWire(String raw) {
        if (raw == null || raw.isBlank()) {
            return PENDING;
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        if ("ready".equals(normalized)) {
            return INDEXED;
        }
        for (IndexStatus status : values()) {
            if (status.wire().equals(normalized)) {
                return status;
            }
        }
        return PENDING;
    }

    public static String normalizeWire(String raw) {
        return fromWire(raw).wire();
    }

    public boolean canReindex() {
        return this == PENDING || this == INDEXING || this == FAILED;
    }
}
