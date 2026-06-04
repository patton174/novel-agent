package com.novel.agent.pyai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.pyai.support.BlockingWebSupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

@Service
public class ChapterSideEffectService {

    private final WebClient contentClient;
    private final ObjectMapper objectMapper;
    private final BlockingWebSupport blockingWebSupport;

    public ChapterSideEffectService(
        @Value("${agent.content.base-url:http://127.0.0.1:8091}") String contentBaseUrl,
        ObjectMapper objectMapper,
        BlockingWebSupport blockingWebSupport
    ) {
        this.contentClient = WebClient.builder().baseUrl(contentBaseUrl).build();
        this.objectMapper = objectMapper;
        this.blockingWebSupport = blockingWebSupport;
    }

    @SuppressWarnings("unchecked")
    public void applySideEffects(Long userId, String novelId, Map<String, Object> contextPatch) {
        if (contextPatch == null || contextPatch.isEmpty() || userId == null) {
            return;
        }
        String userHeader = String.valueOf(userId);

        Object writeRaw = contextPatch.get("chapter_write");
        if (!(writeRaw instanceof Map<?, ?> writeMap)) {
            return;
        }
        Map<String, Object> write = objectMapper.convertValue(writeMap, Map.class);
        if (Boolean.TRUE.equals(write.get("persisted"))) {
            contextPatch.remove("chapter_write");
            return;
        }

        Object content = write.get("content");
        if (content == null) {
            return;
        }

        Map<String, Object> body = new java.util.HashMap<>();
        body.put("content", content);
        if (write.get("title") != null) {
            body.put("title", write.get("title"));
        }
        Object sortOrder = write.get("sort_order");
        if (sortOrder == null) {
            sortOrder = write.get("sortOrder");
        }
        if (sortOrder instanceof Number num) {
            body.put("sortOrder", num.intValue());
        }

        Object chapterId = write.get("chapter_id");
        try {
            if (chapterId != null) {
                final String chapterIdStr = String.valueOf(chapterId);
                try {
                    putChapter(userHeader, chapterIdStr, body);
                } catch (WebClientResponseException.NotFound notFound) {
                    if (novelId == null || novelId.isBlank()) {
                        throw formatPersistException(write, notFound);
                    }
                    postChapter(userHeader, novelId, body);
                }
            } else if (novelId != null && !novelId.isBlank()) {
                postChapter(userHeader, novelId, body);
            } else {
                throw new IllegalStateException(formatPersistMessage(write, "chapter_write missing novel context"));
            }
        } catch (WebClientResponseException ex) {
            throw formatPersistException(write, ex);
        }
        contextPatch.remove("chapter_write");
    }

    private RuntimeException formatPersistException(Map<String, Object> write, Exception ex) {
        return new IllegalStateException(formatPersistMessage(write, ex.getMessage()), ex);
    }

    /** AI-facing error: which chapter (title vs list index) failed. */
    public static String formatPersistMessage(Map<String, Object> write, String detail) {
        String label = String.valueOf(write.getOrDefault("display_label", write.getOrDefault("title", "章节")));
        String cid = String.valueOf(write.getOrDefault("chapter_id", ""));
        Object listIndex = write.get("list_index");
        StringBuilder sb = new StringBuilder("章节写入作品库失败：").append(label);
        if (listIndex instanceof Number num && num.intValue() > 0) {
            sb.append("（作品列表第").append(num.intValue()).append("章）");
        }
        if (cid != null && !cid.isBlank() && !"null".equals(cid)) {
            sb.append("；chapter_id=").append(cid);
        }
        sb.append("；错误：").append(detail == null ? "unknown" : detail);
        return sb.toString();
    }

    private void putChapter(String userHeader, String chapterId, Map<String, Object> body) {
        blockingWebSupport.call(() -> contentClient.put()
            .uri("/api/content/chapters/{chapterId}", chapterId)
            .header("X-User-Id", userHeader)
            .header("X-Edit-Source", "ai")
            .bodyValue(body)
            .retrieve()
            .bodyToMono(Void.class)
            .block());
    }

    private void postChapter(String userHeader, String novelId, Map<String, Object> body) {
        blockingWebSupport.call(() -> contentClient.post()
            .uri("/api/content/novels/{novelId}/chapters", novelId)
            .header("X-User-Id", userHeader)
            .bodyValue(body)
            .retrieve()
            .bodyToMono(Void.class)
            .block());
    }
}
