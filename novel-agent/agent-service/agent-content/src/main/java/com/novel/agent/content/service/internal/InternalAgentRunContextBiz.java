package com.novel.agent.content.service.internal;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.content.service.StoryMemoryService;
import com.novel.agent.content.service.auth.biz.AuthNovelAgentContextBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class InternalAgentRunContextBiz {

    private final AuthNovelAgentContextBiz novelAgentContextBiz;
    private final StoryMemoryService storyMemoryService;

    public Map<String, Object> aggregate(
        Long userId,
        String novelId,
        String chapterId,
        String sessionId
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        Map<String, Object> novelContext = Map.of();
        if (userId != null && userId > 0 && novelId != null && !novelId.isBlank()) {
            Result<Map<String, Object>> novelResult = novelAgentContextBiz.buildContext(
                userId,
                novelId,
                chapterId
            );
            if (novelResult != null && novelResult.data() != null) {
                novelContext = novelResult.data();
            }
        }
        body.put("novelContext", novelContext);

        String storyMemory = "";
        Map<String, Object> storyMemoryData = emptyStoryMemory();
        if (userId != null && userId > 0 && novelId != null && !novelId.isBlank()) {
            String uid = String.valueOf(userId);
            storyMemory = storyMemoryService.renderForPromptNovel(uid, novelId, 900);
            storyMemoryData = storyMemoryService.getNovelMemory(uid, novelId);
        }
        body.put("storyMemory", storyMemory == null ? "" : storyMemory);
        body.put("storyMemoryData", storyMemoryData);
        // Session dialogue history is assembled on pyai (Redis); placeholder for contract stability.
        body.put("history", List.of());
        if (sessionId != null && !sessionId.isBlank()) {
            body.put("sessionId", sessionId);
        }
        return body;
    }

    private static Map<String, Object> emptyStoryMemory() {
        Map<String, Object> copy = new LinkedHashMap<>();
        copy.put("novel", new LinkedHashMap<>());
        copy.put("world", new LinkedHashMap<>());
        copy.put("characters", new LinkedHashMap<>());
        copy.put("chapters", new LinkedHashMap<>());
        copy.put("background", new LinkedHashMap<>());
        return copy;
    }
}
