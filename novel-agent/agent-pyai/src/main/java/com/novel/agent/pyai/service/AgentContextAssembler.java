package com.novel.agent.pyai.service;

import com.novel.agent.pyai.dto.agent.AgentStreamRequest;
import com.novel.agent.pyai.util.AgentTextSanitizer;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class AgentContextAssembler {

    private static final int MAX_HISTORY_TURNS = 24;

    /** 创作模式由 Agent 根据用户描述自动判断，不再接受前端下拉选择。 */
    public static String normalizeAgentMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return "auto";
        }
        return "auto";
    }

    private final AgentSessionMemoryService memoryService;
    private final NovelContextClient novelContextClient;
    private final StoryMemoryClient storyMemoryClient;

    public AgentContextAssembler(
        AgentSessionMemoryService memoryService,
        NovelContextClient novelContextClient,
        StoryMemoryClient storyMemoryClient
    ) {
        this.memoryService = memoryService;
        this.novelContextClient = novelContextClient;
        this.storyMemoryClient = storyMemoryClient;
    }

    public Map<String, Object> assemble(Long userId, String sessionId, AgentStreamRequest request) {
        Map<String, Object> context = new HashMap<>();
        context.put("recent_messages", List.of());

        String novelId = request.novelId();
        String chapterId = request.chapterId();
        Map<String, Object> novelContext = Map.of();
        if (novelId != null && !novelId.isBlank()) {
            novelContext = novelContextClient.fetchAgentContext(userId, novelId, chapterId);
            context.putAll(novelContext);
        } else {
            context.put("project", Map.of());
            context.put("chapter", Map.of());
            context.put("chapters", List.of());
        }

        String novelChapterText = sanitizeVisibleText(asString(novelContext.get("text")));
        String requestText = sanitizeVisibleText(request.contextText());
        String chapterText = resolveChapterText(chapterId, novelChapterText, requestText);
        context.put("text", chapterText == null ? "" : chapterText);

        if (novelId != null && !novelId.isBlank()) {
            context.put("novel_id", novelId);
        }
        if (chapterId != null && !chapterId.isBlank()) {
            context.put("current_chapter_id", chapterId);
        }

        List<Map<String, String>> mergedHistory = mergeHistory(
            memoryService.loadHistory(userId, sessionId, MAX_HISTORY_TURNS),
            request.history()
        );
        if (!mergedHistory.isEmpty()) {
            context.put("history", mergedHistory);
        }

        Map<String, Object> preferences = new HashMap<>();
        preferences.put("mode", normalizeAgentMode(request.mode()));
        preferences.put("host_mode", Boolean.TRUE.equals(request.hostMode()));
        context.put("preferences", preferences);
        context.put("host_mode", Boolean.TRUE.equals(request.hostMode()));

        String storyMemoryText = "";
        Map<String, Object> storyMemoryData = emptyStoryMemory();
        if (novelId != null && !novelId.isBlank()) {
            storyMemoryText = storyMemoryClient.renderForPrompt(userId, novelId, 900);
            storyMemoryData = storyMemoryClient.loadMemory(userId, novelId);
        }
        if (storyMemoryText != null && !storyMemoryText.isBlank()) {
            context.put("story_memory", storyMemoryText);
        }
        context.put("story_memory_data", storyMemoryData);
        return context;
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

    private List<Map<String, String>> mergeHistory(
        List<AgentSessionMemoryService.HistoryTurn> persisted,
        List<AgentStreamRequest.HistoryTurn> requestHistory
    ) {
        List<Map<String, String>> merged = new ArrayList<>();
        if (persisted != null) {
            for (AgentSessionMemoryService.HistoryTurn turn : persisted) {
                appendHistoryTurn(merged, turn.role(), sanitizeVisibleText(turn.content()));
            }
        }
        if (requestHistory != null) {
            for (AgentStreamRequest.HistoryTurn turn : requestHistory) {
                if (turn == null) {
                    continue;
                }
                appendHistoryTurn(merged, turn.role(), sanitizeVisibleText(turn.content()));
            }
        }
        if (merged.size() > MAX_HISTORY_TURNS) {
            return merged.subList(merged.size() - MAX_HISTORY_TURNS, merged.size());
        }
        return merged;
    }

    private void appendHistoryTurn(List<Map<String, String>> merged, String role, String content) {
        if (role == null || content == null) {
            return;
        }
        String normalizedRole = role.trim();
        String normalizedContent = content.trim();
        if (normalizedContent.isEmpty()) {
            return;
        }
        if (!"user".equals(normalizedRole) && !"assistant".equals(normalizedRole)) {
            return;
        }
        if ("assistant".equals(normalizedRole) && AgentTextSanitizer.isOnboardingAssistantText(normalizedContent)) {
            return;
        }
        Map<String, String> row = Map.of("role", normalizedRole, "content", normalizedContent);
        if (!merged.isEmpty() && merged.get(merged.size() - 1).equals(row)) {
            return;
        }
        merged.add(row);
    }

    private String sanitizeVisibleText(String raw) {
        if (raw == null) {
            return null;
        }
        String clean = AgentTextSanitizer.sanitizeAssistantVisibleText(raw);
        return clean.isBlank() ? null : clean;
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String resolveChapterText(
        String chapterId,
        String novelChapterText,
        String requestText
    ) {
        boolean hasChapterId = chapterId != null && !chapterId.isBlank();
        if (hasChapterId && novelChapterText != null && !novelChapterText.isBlank()) {
            return novelChapterText.trim();
        }
        if (requestText != null && !requestText.isBlank()
            && !AgentTextSanitizer.isOnboardingAssistantText(requestText)) {
            return requestText.trim();
        }
        if (novelChapterText != null && !novelChapterText.isBlank()) {
            return novelChapterText.trim();
        }
        return "";
    }
}
