package cn.novelstudio.module.content.support;

/**
 * Line-range edits on chapter body text (1-based, inclusive), aligned with ReadChapter numbering.
 */
public final class ChapterLineEditSupport {

    private ChapterLineEditSupport() {}

    public static String[] splitContentLines(String content) {
        if (content == null || content.isEmpty()) {
            return new String[] { "" };
        }
        return content.split("\\R", -1);
    }

    public static String replaceLineRange(
        String content,
        int lineStart,
        Integer lineEnd,
        String lineContent
    ) {
        String[] lines = splitContentLines(content);
        int end = lineEnd == null ? lineStart : lineEnd;
        int total = lines.length;
        if (lineStart < 1 || lineStart > total) {
            throw ContentExceptions.badRequest("content.chapter.line_start_out_of_range", total);
        }
        if (end < lineStart) {
            throw ContentExceptions.badRequest("content.chapter.line_end_before_start");
        }
        if (end > total) {
            throw ContentExceptions.badRequest("content.chapter.line_end_out_of_range", lineStart, total);
        }
        String[] replacement = splitContentLines(lineContent == null ? "" : lineContent);
        String[] merged = new String[lines.length - (end - lineStart + 1) + replacement.length];
        System.arraycopy(lines, 0, merged, 0, lineStart - 1);
        System.arraycopy(replacement, 0, merged, lineStart - 1, replacement.length);
        System.arraycopy(lines, end, merged, lineStart - 1 + replacement.length, lines.length - end);
        return String.join("\n", merged);
    }
}
