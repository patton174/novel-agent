package com.novel.agent.pyai.service;

import com.novel.agent.pyai.dto.agent.AgentStreamRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentContextAssemblerTest {

    @Mock
    private AgentSessionMemoryService memoryService;
    @Mock
    private NovelContextClient novelContextClient;

    private AgentContextAssembler assembler;

    @BeforeEach
    void setUp() {
        assembler = new AgentContextAssembler(memoryService, novelContextClient);
    }

    @Test
    void assembleMono_mergesAggregateAndHistory() {
        Map<String, Object> novelContext = new LinkedHashMap<>();
        novelContext.put("text", "chapter body");
        novelContext.put("project", Map.of("id", "n1"));
        Map<String, Object> aggregate = Map.of(
            "novelContext", novelContext,
            "storyMemory", "memory text",
            "storyMemoryData", Map.of("world", Map.of("设定", "魔法"))
        );
        when(novelContextClient.fetchRunContextAggregateMono(eq(1L), eq("n1"), eq("c1"), eq("s1")))
            .thenReturn(Mono.just(aggregate));
        when(memoryService.loadHistory(eq(1L), eq("s1"), anyInt()))
            .thenReturn(List.of(new AgentSessionMemoryService.HistoryTurn("user", "hello")));

        AgentStreamRequest request = new AgentStreamRequest(
            "write next",
            "auto",
            false,
            "",
            "s1",
            "n1",
            "c1",
            List.of()
        );

        StepVerifier.create(assembler.assembleMono(1L, "s1", request))
            .assertNext(ctx -> {
                assertEquals("n1", ctx.get("novel_id"));
                assertEquals("c1", ctx.get("current_chapter_id"));
                assertEquals("chapter body", ctx.get("text"));
                assertEquals("memory text", ctx.get("story_memory"));
                assertTrue(ctx.containsKey("history"));
                @SuppressWarnings("unchecked")
                List<Map<String, String>> history = (List<Map<String, String>>) ctx.get("history");
                assertEquals(1, history.size());
                assertEquals("hello", history.get(0).get("content"));
            })
            .verifyComplete();
    }

    @Test
    void assembleMono_withoutNovelId_skipsRemoteFetch() {
        when(memoryService.loadHistory(eq(2L), eq("s2"), anyInt())).thenReturn(List.of());

        AgentStreamRequest request = new AgentStreamRequest(
            "hi",
            "auto",
            false,
            "",
            "s2",
            null,
            null,
            List.of()
        );

        StepVerifier.create(assembler.assembleMono(2L, "s2", request))
            .assertNext(ctx -> {
                assertTrue(ctx.containsKey("project"));
                assertEquals("", ctx.get("text"));
            })
            .verifyComplete();
    }
}
