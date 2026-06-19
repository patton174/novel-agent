package com.novel.agent.content.service;

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

    public String suggestDescription(String title, String genre, String style, String draft) {
        try {
            Map<String, String> payload = new LinkedHashMap<>();
            payload.put("title", nullToEmpty(title));
            payload.put("genre", nullToEmpty(genre));
            payload.put("style", nullToEmpty(style));
            payload.put("draft", draft == null ? "" : draft.trim());
            DescriptionBody body = pythonRestClient.post()
                .uri("/api/images/novel-description")
                .contentType(MediaType.APPLICATION_JSON)
                .body(objectMapper.writeValueAsString(payload).getBytes(StandardCharsets.UTF_8))
                .retrieve()
                .body(DescriptionBody.class);
            if (body != null && body.description() != null && !body.description().isBlank()) {
                return body.description().trim();
            }
        } catch (Exception ex) {
            log.warn("python-ai 简介生成失败 title={}: {}", title, ex.getMessage());
        }
        return fallbackDescription(title, genre, style, draft);
    }

    private static String fallbackDescription(String title, String genre, String style, String draft) {
        if (draft != null && !draft.isBlank()) {
            return draft.trim();
        }
        String t = title == null || title.isBlank() ? "未命名作品" : title.trim();
        String g = genre == null || genre.isBlank() ? "玄幻" : genre.trim();
        String s = style == null || style.isBlank() ? "爽文" : style.trim();
        return String.format(
            "《%s》是一部%s题材、%s风格的长篇。主角在异变的世界中踏上成长之路，围绕核心冲突展开冒险。",
            t,
            g,
            s
        );
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DescriptionBody(String description) {}
}
