package cn.novelstudio.platform.messaging.upload;

public record FileParseMessage(
    String fileId,
    Long ownerId,
    String ownerType,    // 'user' | 'admin'
    String storageKey,
    String format,       // txt|md|epub|pdf|docx
    String originalName,
    int attempt
) {
    public FileParseMessage(String fileId, Long ownerId, String ownerType,
                            String storageKey, String format, String originalName) {
        this(fileId, ownerId, ownerType, storageKey, format, originalName, 0);
    }
}
