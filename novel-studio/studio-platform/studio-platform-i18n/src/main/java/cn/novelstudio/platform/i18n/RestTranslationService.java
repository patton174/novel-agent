package cn.novelstudio.platform.i18n;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * LibreTranslate 兼容 HTTP 客户端（POST /translate）。
 * 配置 app.i18n.translation-base-url，例如 https://libretranslate.com 或自建实例。
 */
public class RestTranslationService implements TranslationService {

    private static final Logger log = LoggerFactory.getLogger(RestTranslationService.class);

    private final I18nProperties properties;
    private final RestTemplate restTemplate;
    private final Map<String, String> memoryCache = new ConcurrentHashMap<>();

    public RestTranslationService(I18nProperties properties, RestTemplate restTemplate) {
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    @Override
    public String translate(String text, AppLocale source, AppLocale target) {
        if (text == null || text.isBlank() || source == target) {
            return text;
        }
        String cacheKey = source.tag() + ">" + target.tag() + ":" + text.hashCode() + ":" + text.length();
        String cached = memoryCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        try {
            String base = properties.getTranslationBaseUrl().replaceAll("/+$", "");
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (properties.getTranslationApiKey() != null && !properties.getTranslationApiKey().isBlank()) {
                headers.setBearerAuth(properties.getTranslationApiKey().trim());
            }
            TranslateRequest body = new TranslateRequest(
                text,
                toProviderCode(source),
                toProviderCode(target),
                "text"
            );
            TranslateResponse response = restTemplate.postForObject(
                base + "/translate",
                new HttpEntity<>(body, headers),
                TranslateResponse.class
            );
            if (response == null || response.translatedText == null || response.translatedText.isBlank()) {
                log.warn("Translation API returned empty body ({} -> {})", source.tag(), target.tag());
                return text;
            }
            memoryCache.put(cacheKey, response.translatedText);
            return response.translatedText;
        } catch (RestClientException ex) {
            log.warn("Translation API failed ({} -> {}): {}", source.tag(), target.tag(), ex.getMessage());
            return text;
        }
    }

    private static String toProviderCode(AppLocale locale) {
        return switch (locale) {
            case EN -> "en";
            case ZH_CN -> "zh";
        };
    }

    record TranslateRequest(
        @JsonProperty("q") String q,
        @JsonProperty("source") String source,
        @JsonProperty("target") String target,
        @JsonProperty("format") String format
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static final class TranslateResponse {
        @JsonProperty("translatedText")
        String translatedText;
    }
}
