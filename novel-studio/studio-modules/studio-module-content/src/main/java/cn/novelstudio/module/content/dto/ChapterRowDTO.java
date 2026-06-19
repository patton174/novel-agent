package cn.novelstudio.module.content.dto;

/**
 * Agent-facing chapter row: 1-based reading-order index + stable chapter_id.
 */
public record ChapterRowDTO(
    int index,
    String chapterId,
    String title,
    int sortOrder,
    int wordCount,
    String summary,
    String novelId,
    String volumeId,
    String volumeTitle,
    long updatedAt
) {
    public static ChapterRowDTO fromSummary(ChapterSummaryDTO summary) {
        return new ChapterRowDTO(
            summary.listIndex(),
            summary.id(),
            summary.title(),
            summary.sortOrder(),
            summary.wordCount(),
            summary.summary(),
            summary.novelId(),
            summary.volumeId(),
            summary.volumeTitle(),
            summary.updatedAt()
        );
    }
}
