package com.novel.agent.common.image;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.BizException;
import com.novel.agent.common.image.config.ImageClientProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 通过 python-ai 调用 Agnes 生图（Java 不直连 Agnes API）。
 */
public class PythonImageClient {

    private static final Logger log = LoggerFactory.getLogger(PythonImageClient.class);
    private static final Duration STATUS_CACHE_TTL = Duration.ofSeconds(30);

    private final String pythonBaseUrl;
    private final ImageClientProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final AtomicReference<CachedStatus> statusCache = new AtomicReference<>();

    public PythonImageClient(
        String pythonBaseUrl,
        ImageClientProperties properties,
        ObjectMapper objectMapper
    ) {
        this.pythonBaseUrl = pythonBaseUrl.replaceAll("/+$", "");
        this.properties = properties;
        this.objectMapper = objectMapper;
        // uvicorn 对 HTTP/2 upgrade / Expect:100-continue 支持不完整，会导致 POST body 丢失 → FastAPI 422
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .version(HttpClient.Version.HTTP_1_1)
            .build();
    }

    public boolean enabled() {
        CachedStatus cached = statusCache.get();
        if (cached != null && !cached.expired()) {
            return cached.enabled();
        }
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(pythonBaseUrl + "/api/images/status"))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                ImageStatusBody body = objectMapper.readValue(response.body(), ImageStatusBody.class);
                boolean enabled = body.enabled();
                statusCache.set(new CachedStatus(enabled, System.nanoTime()));
                return enabled;
            }
        } catch (Exception ex) {
            log.debug("查询 python-ai 生图状态失败: {}", ex.getMessage());
        }
        statusCache.set(new CachedStatus(false, System.nanoTime()));
        return false;
    }

    public GeneratedImage textToImage(String prompt, String size, boolean returnBase64) {
        Map<String, Object> body = Map.of(
            "prompt", prompt,
            "size", size,
            "return_base64", returnBase64
        );
        return postImage("/api/images/text-to-image", body);
    }

    public GeneratedImage imageToImage(
        String prompt,
        String size,
        List<String> inputImages,
        boolean returnBase64
    ) {
        if (inputImages == null || inputImages.isEmpty()) {
            throw BizException.of(ResultCode.BAD_REQUEST, "图生图需要至少一张输入图片");
        }
        Map<String, Object> body = Map.of(
            "prompt", prompt,
            "size", size,
            "images", inputImages,
            "return_base64", returnBase64
        );
        return postImage("/api/images/image-to-image", body);
    }

    private GeneratedImage postImage(String path, Map<String, Object> body) {
        try {
            String json = objectMapper.writeValueAsString(body);
            byte[] requestBody = json.getBytes(StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(pythonBaseUrl + path))
                .timeout(Duration.ofSeconds(Math.max(30, properties.getTimeoutSeconds())))
                .header("Content-Type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofByteArray(requestBody))
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("python-ai 生图失败 status={} body={}", response.statusCode(), truncate(response.body(), 500));
                throw BizException.of(ResultCode.IMAGE_GENERATION_FAILED);
            }
            GeneratedImageBody imageBody = objectMapper.readValue(response.body(), GeneratedImageBody.class);
            if ((imageBody.url() == null || imageBody.url().isBlank())
                && (imageBody.b64Json() == null || imageBody.b64Json().isBlank())) {
                throw BizException.of(ResultCode.IMAGE_GENERATION_FAILED);
            }
            return new GeneratedImage(imageBody.url(), imageBody.b64Json());
        } catch (BizException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("python-ai 生图请求异常: {}", ex.getMessage());
            throw BizException.of(ResultCode.IMAGE_GENERATION_FAILED);
        }
    }

    private static String truncate(String text, int max) {
        if (text == null) {
            return "";
        }
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ImageStatusBody(boolean enabled) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record GeneratedImageBody(
        boolean ok,
        String url,
        @JsonProperty("b64_json") String b64Json
    ) {}

    private record CachedStatus(boolean enabled, long cachedAtNanos) {
        boolean expired() {
            return Duration.ofNanos(System.nanoTime() - cachedAtNanos).compareTo(STATUS_CACHE_TTL) > 0;
        }
    }
}
