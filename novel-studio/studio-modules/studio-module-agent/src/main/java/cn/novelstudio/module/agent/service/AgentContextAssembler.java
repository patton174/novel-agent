package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.dto.agent.AgentStreamRequest;
import cn.novelstudio.module.agent.support.AgentLocaleMarkers;
import cn.novelstudio.module.agent.util.AgentTextSanitizer;
import cn.novelstudio.module.content.dto.ReferencedBookDTO;
import cn.novelstudio.module.content.service.catalog.CatalogService;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

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
    private final AgentLocaleMarkers localeMarkers;
    private final CatalogService catalogService;

    public AgentContextAssembler(
        AgentSessionMemoryService memoryService,
        NovelContextClient novelContextClient,
        AgentLocaleMarkers localeMarkers,
        CatalogService catalogService
    ) {
        this.memoryService = memoryService;
        this.novelContextClient = novelContextClient;
        this.localeMarkers = localeMarkers;
        this.catalogService = catalogService;
    }

    /**
     * 同步组装（阻塞边界：调用方须在 {@link Schedulers#boundedElastic()} 等隔离线程池内使用）。
     */
    public Map<String, Object> assemble(Long userId, String sessionId, AgentStreamRequest request) {
        return assembleMono(userId, sessionId, request).block();
    }

    public Mono<Map<String, Object>> assembleMono(Long userId, String sessionId, AgentStreamRequest request) {
        String novelId = request.novelId();
        Mono<Map<String, Object>> aggregateMono = novelId != null && !novelId.isBlank()
            ? novelContextClient.fetchRunContextAggregateMono(
                userId,
                novelId,
                request.chapterId(),
                sessionId
            )
            : Mono.just(Map.of());
        Mono<List<AgentSessionMemoryService.HistoryTurn>> historyMono = Mono.fromCallable(
            () -> memoryService.loadHistory(userId, sessionId, MAX_HISTORY_TURNS)
        ).subscribeOn(Schedulers.boundedElastic());

        return Mono.zip(aggregateMono, historyMono)
            .map(tuple -> buildContext(userId, tuple.getT1(), tuple.getT2(), request));
    }

    private Map<String, Object> buildContext(
        Long userId,
        Map<String, Object> aggregate,
        List<AgentSessionMemoryService.HistoryTurn> persistedHistory,
        AgentStreamRequest request
    ) {
        Map<String, Object> context = new HashMap<>();
        context.put("recent_messages", List.of());

        String novelId = request.novelId();
        String chapterId = request.chapterId();
        Map<String, Object> novelContext = Map.of();
        if (novelId != null && !novelId.isBlank()) {
            Object rawNovel = aggregate.get("novelContext");
            if (rawNovel instanceof Map<?, ?> map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> cast = (Map<String, Object>) map;
                novelContext = cast;
                context.putAll(cast);
            }
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

        List<Map<String, String>> mergedHistory = mergeHistory(persistedHistory, request.history());
        if (!mergedHistory.isEmpty()) {
            context.put("history", mergedHistory);
        }

        List<Map<String, Object>> referencedBooks = new ArrayList<>();
        if (request.referencedBooks() != null) {
            for (AgentStreamRequest.ReferencedBookRef ref : request.referencedBooks()) {
                if (ref == null || ref.catalogNovelId() == null || ref.catalogNovelId().isBlank()) {
                    continue;
                }
                try {
                    ReferencedBookDTO rb = catalogService.getReferencedBook(ref.catalogNovelId(), userId);
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("catalogNovelId", rb.getCatalogNovelId());
                    m.put("title", rb.getTitle());
                    m.put("summary", rb.getSummary());
                    m.put("chapterTitles", rb.getChapterTitles());
                    m.put("namespace", rb.getNamespace());
                    m.put("indexStatus", rb.getIndexStatus());
                    referencedBooks.add(m);
                } catch (Exception ignored) {
                    // 不可访问的书跳过（own 校验失败等）
                }
            }
        }
        context.put("referenced_books", referencedBooks);

        Map<String, Object> preferences = new HashMap<>();
        preferences.put("mode", normalizeAgentMode(request.mode()));
        preferences.put("host_mode", Boolean.TRUE.equals(request.hostMode()));
        context.put("preferences", preferences);
        context.put("host_mode", Boolean.TRUE.equals(request.hostMode()));

        return context;
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
        if ("assistant".equals(normalizedRole) && localeMarkers.isOnboardingAssistantText(normalizedContent)) {
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
        String clean = AgentTextSanitizer.sanitizeAssistantVisibleText(raw, localeMarkers.uiLineLabelAlternation());
        return clean.isBlank() ? null : clean;
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String resolveChapterText(
        String chapterId,
        String novelChapterText,
        String requestText
    ) {
        boolean hasChapterId = chapterId != null && !chapterId.isBlank();
        if (hasChapterId && novelChapterText != null && !novelChapterText.isBlank()) {
            return novelChapterText.trim();
        }
        if (requestText != null && !requestText.isBlank()
            && !localeMarkers.isOnboardingAssistantText(requestText)) {
            return requestText.trim();
        }
        if (novelChapterText != null && !novelChapterText.isBlank()) {
            return novelChapterText.trim();
        }
        return "";
    }
}
