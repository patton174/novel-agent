package com.novel.agent.pyai.orchestration;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DisplayContentJsonExtractorTest {

    @Test
    void extractsDisplayContentIncrementally() {
        DisplayContentJsonExtractor extractor = new DisplayContentJsonExtractor();
        String prefix =
            "{\"display\":{\"type\":\"message\",\"content\":\"";
        assertEquals("", extractor.feed(prefix));
        assertEquals("霓虹", extractor.feed("霓虹"));
        assertEquals("灯下", extractor.feed("灯下"));
        assertEquals("", extractor.feed("\"}}"));
    }
}
