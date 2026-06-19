package cn.novelstudio.platform.messaging.upload;

/**
 * 文件上传异步解析 MQ 消息：UploadService 发布、FileParseListener 消费。
 *
 * <p>Part 1 与 Part 2 共用此定义（合并时保留单份）。
 */
public record FileParseMessage(
    String fileId,
    Long ownerId,
    String ownerType,    // 'user' | 'admin'
    String storageKey,
    String format,       // txt|md|epub|pdf|docx
    String originalName,
    int attempt
) {
    /** 不带 attempt 的便捷构造（attempt 默认 0）。 */
    public FileParseMessage(String fileId, Long ownerId, String ownerType,
                            String storageKey, String format, String originalName) {
        this(fileId, ownerId, ownerType, storageKey, format, originalName, 0);
    }
}
