package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.dto.NovelDescriptionPromptRequest;
import cn.novelstudio.module.content.dto.NovelDescriptionPromptResponse;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
public class NovelDescriptionClient {

    private final RestClient pythonRestClient;
    private final ObjectMapper objectMapper;

    public NovelDescriptionClient(
        RestClient pythonRestClient,
        ObjectMapper objectMapper
    ) {
        this.pythonRestClient = pythonRestClient;
        this.objectMapper = objectMapper;
    }

    public NovelDescriptionPromptResponse suggestDescription(NovelDescriptionPromptRequest request) {
        NovelDescriptionPromptRequest req = request == null
            ? new NovelDescriptionPromptRequest(null, null, null, null, null, null, null, null, null, null, null, null)
            : request;
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("title", nullToEmpty(req.title()));
            payload.put("genre", nullToEmpty(req.genre()));
            payload.put("style", nullToEmpty(req.style()));
            payload.put("tags", nullToEmpty(req.tags()));
            payload.put("hook", nullToEmpty(req.hook()));
            payload.put("protagonist", nullToEmpty(req.protagonist()));
            payload.put("worldview", nullToEmpty(req.worldview()));
            payload.put("synopsis", nullToEmpty(req.synopsis()));
            payload.put("selling_points", nullToEmpty(req.sellingPoints()));
            payload.put("target_chapter_words", req.targetChapterWords());
            payload.put("draft", req.draft() == null ? "" : req.draft().trim());
            payload.put("mode", req.mode() == null || req.mode().isBlank() ? "generate" : req.mode().trim());

            DescriptionBody body = pythonRestClient.post()
                .uri("/api/images/novel-description")
                .contentType(MediaType.APPLICATION_JSON)
                .body(objectMapper.writeValueAsString(payload).getBytes(StandardCharsets.UTF_8))
                .retrieve()
                .body(DescriptionBody.class);
            if (body != null) {
                return body.toResponse();
            }
        } catch (Exception ex) {
            log.warn("python-ai 建书草稿生成失败 title={}: {}", req.title(), ex.getMessage());
        }
        return fallbackResponse(req);
    }

    private static NovelDescriptionPromptResponse fallbackResponse(NovelDescriptionPromptRequest req) {
        String title = blankOr(req.title(), "未命名作品");
        String genre = blankOr(req.genre(), "玄幻");
        String tags = blankOr(req.tags(), "爽文");
        String style = blankOr(req.style(), "快节奏");
        String hook = nullToEmpty(req.hook());
        String protagonist = nullToEmpty(req.protagonist());
        String worldview = nullToEmpty(req.worldview());
        String synopsis = req.synopsis() != null && !req.synopsis().isBlank()
            ? req.synopsis().trim()
            : (req.draft() != null && !req.draft().isBlank()
                ? req.draft().trim()
                : String.format(
                    "《%s》是一部%s题材的%s长篇。主角在异变的世界中踏上成长之路，围绕核心冲突展开冒险。",
                    title,
                    genre,
                    tags.replace(" ", "·")
                ));
        String sellingPoints = nullToEmpty(req.sellingPoints());
        int words = req.targetChapterWords() != null && req.targetChapterWords() > 0
            ? req.targetChapterWords()
            : 3000;
        String description = assembleDescription(hook, synopsis, worldview, protagonist, sellingPoints);
        return new NovelDescriptionPromptResponse(
            title,
            genre,
            tags,
            style,
            hook,
            protagonist,
            worldview,
            synopsis,
            sellingPoints,
            words,
            description
        );
    }

    private static String assembleDescription(
        String hook,
        String synopsis,
        String worldview,
        String protagonist,
        String sellingPoints
    ) {
        StringBuilder sb = new StringBuilder();
        if (hook != null && !hook.isBlank()) {
            sb.append("【一句话卖点】").append(hook.trim()).append("\n\n");
        }
        if (synopsis != null && !synopsis.isBlank()) {
            sb.append("【简介】\n").append(synopsis.trim()).append("\n\n");
        }
        if (worldview != null && !worldview.isBlank()) {
            sb.append("【世界观】").append(worldview.trim()).append("\n\n");
        }
        if (protagonist != null && !protagonist.isBlank()) {
            sb.append("【主角】").append(protagonist.trim()).append("\n\n");
        }
        if (sellingPoints != null && !sellingPoints.isBlank()) {
            sb.append("【卖点】").append(sellingPoints.trim());
        }
        return sb.toString().trim();
    }

    private static String blankOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DescriptionBody(
        String title,
        String genre,
        String tags,
        String style,
        String hook,
        String protagonist,
        String worldview,
        String synopsis,
        String selling_points,
        Integer target_chapter_words,
        String description
    ) {
        NovelDescriptionPromptResponse toResponse() {
            int words = target_chapter_words != null && target_chapter_words > 0
                ? target_chapter_words
                : 3000;
            String desc = description != null && !description.isBlank()
                ? description.trim()
                : assembleDescription(hook, synopsis, worldview, protagonist, selling_points);
            return new NovelDescriptionPromptResponse(
                blankOr(title, "未命名作品"),
                blankOr(genre, "玄幻"),
                blankOr(tags, "爽文"),
                blankOr(style, "快节奏"),
                hook == null ? "" : hook.trim(),
                protagonist == null ? "" : protagonist.trim(),
                worldview == null ? "" : worldview.trim(),
                synopsis == null ? "" : synopsis.trim(),
                selling_points == null ? "" : selling_points.trim(),
                words,
                desc
            );
        }
    }
}
