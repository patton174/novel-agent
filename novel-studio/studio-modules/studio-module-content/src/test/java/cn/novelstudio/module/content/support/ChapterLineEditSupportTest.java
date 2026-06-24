package cn.novelstudio.module.content.support;

import cn.novelstudio.kernel.exception.ValidationException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ChapterLineEditSupportTest {

    @Test
    void replaceSingleLine() {
        String body = "第一行\n第二行\n第三行";
        assertEquals(
            "第一行\n替换行\n第三行",
            ChapterLineEditSupport.replaceLineRange(body, 2, null, "替换行")
        );
    }

    @Test
    void replaceLineSpanWithMultilineContent() {
        String body = "a\nb\nc\nd";
        assertEquals(
            "a\nX\nY\nd",
            ChapterLineEditSupport.replaceLineRange(body, 2, 3, "X\nY")
        );
    }

    @Test
    void rejectsOutOfRange() {
        assertThrows(
            ValidationException.class,
            () -> ChapterLineEditSupport.replaceLineRange("a\nb", 5, null, "x")
        );
    }
}
