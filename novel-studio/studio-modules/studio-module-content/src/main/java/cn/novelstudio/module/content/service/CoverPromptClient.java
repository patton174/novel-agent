package cn.novelstudio.module.content.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.content.entity.NovelEntity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
public class CoverPromptClient {

    private final RestClient pythonRestClient;
    private final ObjectMapper objectMapper;

    public CoverPromptClient(
        RestClient pythonRestClient,
        ObjectMapper objectMapper
    ) {
        this.pythonRestClient = pythonRestClient;
        this.objectMapper = objectMapper;
    }

    public String suggestPrompt(NovelEntity entity, String draft) {
        try {
            Map<String, String> payload = new LinkedHashMap<>();
            payload.put("title", nullToEmpty(entity.getTitle()));
            payload.put("genre", nullToEmpty(entity.getGenre()));
            payload.put("style", nullToEmpty(entity.getStyle()));
            payload.put("description", nullToEmpty(entity.getDescription()));
            payload.put("draft", draft == null ? "" : draft.trim());
            CoverPromptBody body = pythonRestClient.post()
                .uri("/api/images/cover-prompt")
                .contentType(MediaType.APPLICATION_JSON)
                .body(objectMapper.writeValueAsString(payload).getBytes(StandardCharsets.UTF_8))
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
