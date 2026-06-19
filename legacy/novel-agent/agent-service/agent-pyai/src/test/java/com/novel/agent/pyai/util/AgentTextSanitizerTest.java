package com.novel.agent.pyai.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AgentTextSanitizerTest {

    @Test
    void preservesParagraphBreaks() {
        String raw = "第一段。\n\n第二段。";
        assertEquals("第一段。\n\n第二段。", AgentTextSanitizer.sanitizeAssistantVisibleText(raw));
    }

    @Test
    void collapsesHorizontalWhitespaceOnly() {
        String raw = "她  愣了一下。\n\n他  走远了。";
        assertEquals("她 愣了一下。\n\n他 走远了。", AgentTextSanitizer.sanitizeAssistantVisibleText(raw));
    }

    @Test
    void stripsThinkingBlocks() {
        String raw = "<think>plan</think>\n\n正文。";
        assertEquals("正文。", AgentTextSanitizer.sanitizeAssistantVisibleText(raw));
    }

    @Test
    void collapsesExcessiveBlankLines() {
        String raw = "第一段。\n\n\n\n第二段。";
        String clean = AgentTextSanitizer.sanitizeAssistantVisibleText(raw);
        assertTrue(clean.contains("\n\n"));
        assertEquals("第一段。\n\n第二段。", clean);
    }
}
