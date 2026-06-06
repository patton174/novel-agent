package com.novel.agent.content.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.novel.agent.content.dto.CoverPromptResponse;
import com.novel.agent.content.entity.NovelEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoverPromptClient {

    private final RestClient pythonRestClient;

    public String suggestPrompt(NovelEntity entity, String draft) {
        try {
            CoverPromptBody body = pythonRestClient.post()
                .uri("/api/images/cover-prompt")
                .body(Map.of(
                    "title", nullToEmpty(entity.getTitle()),
                    "genre", nullToEmpty(entity.getGenre()),
                    "style", nullToEmpty(entity.getStyle()),
                    "description", nullToEmpty(entity.getDescription()),
                    "draft", draft == null ? "" : draft.trim()
                ))
                .retrieve()
                .body(CoverPromptBody.class);
            if (body != null && body.prompt() != null && !body.prompt().isBlank()) {
                return body.prompt().trim();
            }
        } catch (Exception ex) {
            log.warn("python-ai 封面提示词失败 novelId={}: {}", entity.getId(), ex.getMessage());
        }
        return NovelCoverService.buildDefaultCoverPrompt(entity, draft);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CoverPromptBody(String prompt) {}
}
