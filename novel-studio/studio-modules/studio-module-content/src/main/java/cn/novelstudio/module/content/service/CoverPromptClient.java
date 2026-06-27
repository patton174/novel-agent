package cn.novelstudio.module.content.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.content.dto.CoverPromptResponse;
import cn.novelstudio.module.content.entity.NovelEntity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
public class CoverPromptClient {

    private final RestClient pythonRestClient;
    private final ObjectMapper objectMapper;
    private final String pythonBaseUrl;
    private final HttpClient httpClient;

    public CoverPromptClient(
        RestClient pythonRestClient,
        ObjectMapper objectMapper,
        @Value("${agent.python.base-url:http://127.0.0.1:8000}") String pythonBaseUrl
    ) {
        this.pythonRestClient = pythonRestClient;
        this.objectMapper = objectMapper;
        this.pythonBaseUrl = pythonBaseUrl.replaceAll("/+$", "");
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .version(HttpClient.Version.HTTP_1_1)
            .build();
    }

    public CoverPromptResponse suggestPrompt(
        NovelEntity entity,
        String styleDraft,
        String sceneDraft,
        String draft,
        String mode
    ) {
        try {
            CoverPromptBody body = pythonRestClient.post()
                .uri("/api/images/cover-prompt")
                .contentType(MediaType.APPLICATION_JSON)
                .body(buildPayloadMap(entity, styleDraft, sceneDraft, draft, mode))
                .retrieve()
                .body(CoverPromptBody.class);
            if (body != null) {
                CoverPromptResponse parsed = body.toResponse();
                if (parsed.imagePrompt() != null && !parsed.imagePrompt().isBlank()) {
                    return parsed;
                }
            }
        } catch (Exception ex) {
            log.warn("python-ai 封面提示词失败 novelId={}: {}", entity.getId(), ex.getMessage());
        }
        return fallbackResponse(entity, styleDraft, sceneDraft, draft);
    }

    public void streamPrompt(
        NovelEntity entity,
        String styleDraft,
        String sceneDraft,
        String draft,
        String mode,
        OutputStream outputStream
    ) {
        try {
            byte[] json = objectMapper.writeValueAsString(
                buildPayloadMap(entity, styleDraft, sceneDraft, draft, mode)
            ).getBytes(StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(pythonBaseUrl + "/api/images/cover-prompt/stream"))
                .timeout(Duration.ofSeconds(90))
                .header("Content-Type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofByteArray(json))
                .build();
            HttpResponse<InputStream> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofInputStream()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("python-ai 封面提示词流 status={}", response.statusCode());
                writeFallbackStream(entity, styleDraft, sceneDraft, draft, outputStream);
                return;
            }
            try (InputStream in = response.body()) {
                in.transferTo(outputStream);
            }
        } catch (Exception ex) {
            log.warn("python-ai 封面提示词流失败 novelId={}: {}", entity.getId(), ex.getMessage());
            writeFallbackStream(entity, styleDraft, sceneDraft, draft, outputStream);
        }
    }

    private void writeFallbackStream(
        NovelEntity entity,
        String styleDraft,
        String sceneDraft,
        String draft,
        OutputStream outputStream
    ) {
        try {
            CoverPromptResponse fallback = fallbackResponse(entity, styleDraft, sceneDraft, draft);
            String line1 = "data: " + objectMapper.writeValueAsString(Map.of(
                "type", "meta",
                "layout", "单人顶题",
                "archetype", "玄幻仙侠"
            )) + "\n\n";
            String line2 = "data: " + objectMapper.writeValueAsString(Map.of(
                "type", "delta",
                "field", "style",
                "text", fallback.stylePrompt()
            )) + "\n\n";
            String line3 = "data: " + objectMapper.writeValueAsString(Map.of(
                "type", "delta",
                "field", "scene",
                "text", fallback.scenePrompt()
            )) + "\n\n";
            String line4 = "data: " + objectMapper.writeValueAsString(Map.of(
                "type", "done",
                "style_prompt", fallback.stylePrompt(),
                "scene_prompt", fallback.scenePrompt(),
                "document", fallback.document(),
                "image_prompt", fallback.imagePrompt(),
                "prompt", fallback.imagePrompt()
            )) + "\n\n";
            outputStream.write(line1.getBytes(StandardCharsets.UTF_8));
            outputStream.write(line2.getBytes(StandardCharsets.UTF_8));
            outputStream.write(line3.getBytes(StandardCharsets.UTF_8));
            outputStream.write(line4.getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
        } catch (Exception ex) {
            log.warn("封面提示词 fallback 流写入失败: {}", ex.getMessage());
        }
    }

    private CoverPromptResponse fallbackResponse(
        NovelEntity entity,
        String styleDraft,
        String sceneDraft,
        String draft
    ) {
        String scene = sceneDraft != null && !sceneDraft.isBlank()
            ? sceneDraft.trim()
            : (draft == null ? "" : draft.trim());
        String style = styleDraft == null ? "" : styleDraft.trim();
        String image = NovelCoverService.buildDefaultCoverPrompt(entity, scene);
        if (!style.isBlank() && !scene.isBlank()) {
            image = style + ", " + scene;
        } else if (!style.isBlank()) {
            image = style + (scene.isBlank() ? "" : ", " + scene);
        }
        return new CoverPromptResponse(style, scene, "", image, image);
    }

    private Map<String, String> buildPayloadMap(
        NovelEntity entity,
        String styleDraft,
        String sceneDraft,
        String draft,
        String mode
    ) {
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("title", nullToEmpty(entity.getTitle()));
        payload.put("genre", nullToEmpty(entity.getGenre()));
        payload.put("style", nullToEmpty(entity.getStyle()));
        payload.put("description", nullToEmpty(entity.getDescription()));
        payload.put("draft", draft == null ? "" : draft.trim());
        payload.put("style_draft", styleDraft == null ? "" : styleDraft.trim());
        payload.put("scene_draft", sceneDraft == null ? "" : sceneDraft.trim());
        payload.put("mode", mode == null || mode.isBlank() ? "generate" : mode.trim());
        return payload;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CoverPromptBody(
        @JsonProperty("style_prompt") String stylePrompt,
        @JsonProperty("scene_prompt") String scenePrompt,
        String document,
        @JsonProperty("image_prompt") String imagePrompt,
        String prompt
    ) {
        CoverPromptResponse toResponse() {
            String image = imagePrompt != null && !imagePrompt.isBlank() ? imagePrompt : prompt;
            return new CoverPromptResponse(
                stylePrompt == null ? "" : stylePrompt,
                scenePrompt == null ? "" : scenePrompt,
                document == null ? "" : document,
                image == null ? "" : image,
                image == null ? "" : image
            );
        }
    }
}
