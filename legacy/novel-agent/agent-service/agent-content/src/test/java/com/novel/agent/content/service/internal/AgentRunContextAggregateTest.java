package com.novel.agent.content.service.internal;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.content.service.StoryMemoryService;
import com.novel.agent.content.service.auth.biz.AuthNovelAgentContextBiz;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentRunContextAggregateTest {

    @Mock
    private AuthNovelAgentContextBiz novelAgentContextBiz;
    @Mock
    private StoryMemoryService storyMemoryService;

    private InternalAgentRunContextBiz biz;

    @BeforeEach
    void setUp() {
        biz = new InternalAgentRunContextBiz(novelAgentContextBiz, storyMemoryService);
    }

    @Test
    void aggregate_fillsNovelAndMemoryFields() {
        Map<String, Object> novelContext = new LinkedHashMap<>();
        novelContext.put("project", Map.of("id", "n1", "title", "测试书"));
        when(novelAgentContextBiz.buildContext(1L, "n1", "c1")).thenReturn(Result.ok(novelContext));
        when(storyMemoryService.renderForPromptNovel(eq("1"), eq("n1"), anyInt())).thenReturn("记忆摘要");
        Map<String, Object> memoryData = new LinkedHashMap<>();
        memoryData.put("characters", Map.of("主角", "林动"));
        when(storyMemoryService.getNovelMemory("1", "n1")).thenReturn(memoryData);

        Map<String, Object> out = biz.aggregate(1L, "n1", "c1", "s1");

        assertEquals(novelContext, out.get("novelContext"));
        assertEquals("记忆摘要", out.get("storyMemory"));
        assertEquals(memoryData, out.get("storyMemoryData"));
        assertTrue(out.containsKey("history"));
        verify(novelAgentContextBiz).buildContext(1L, "n1", "c1");
        verify(storyMemoryService).renderForPromptNovel("1", "n1", 900);
        verify(storyMemoryService).getNovelMemory("1", "n1");
    }
}
