package com.novel.agent.content.service.crawl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.novel.agent.content.crawl.CrawlJobStatus;
import com.novel.agent.content.entity.CrawlJobEntity;
import com.novel.agent.content.entity.CrawlSiteEntity;
import com.novel.agent.content.service.crawl.dto.CrawlJobDTO;
import com.novel.agent.content.service.crawl.dto.CrawlSiteDTO;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class PythonCrawlClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public PythonCrawlClient(
        RestClient pythonRestClient,
        ObjectMapper objectMapper
    ) {
        this.restClient = pythonRestClient;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> preview(String sourceUrl, Map<String, Object> siteConfig) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("source_url", sourceUrl);
        if (siteConfig != null && !siteConfig.isEmpty()) {
            body.set("site_config", objectMapper.valueToTree(siteConfig));
        }
        JsonNode response = restClient.post()
            .uri("/api/crawl/preview")
            .contentType(MediaType.APPLICATION_JSON)
            .body(body.toString())
            .retrieve()
            .body(JsonNode.class);
        if (response == null) {
            return Map.of("ok", false, "message", "预览失败");
        }
        return objectMapper.convertValue(response, Map.class);
    }

    public void dispatchExecute(String jobId, String sourceUrl, Map<String, Object> siteConfig, String internalKey) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("job_id", jobId);
        body.put("source_url", sourceUrl);
        if (siteConfig != null && !siteConfig.isEmpty()) {
            body.set("site_config", objectMapper.valueToTree(siteConfig));
        }
        restClient.post()
            .uri("/internal/crawl/execute")
            .contentType(MediaType.APPLICATION_JSON)
            .header("X-Internal-Service-Key", internalKey)
            .body(body.toString())
            .retrieve()
            .toBodilessEntity();
    }

    public static CrawlJobDTO toDto(CrawlJobEntity entity) {
        return new CrawlJobDTO(
            entity.getId(),
            entity.getSourceUrl(),
            entity.getSiteId(),
            entity.getTitle(),
            entity.getStatus(),
            entity.getCreatedByAdminId(),
            entity.getCatalogNovelId(),
            entity.getChaptersTotal(),
            entity.getChaptersDone(),
            entity.getConfigJson(),
            entity.getErrorMessage(),
            epoch(entity.getStartedAt()),
            epoch(entity.getCompletedAt()),
            entity.getCreatedAt().toEpochMilli(),
            entity.getUpdatedAt().toEpochMilli()
        );
    }

    public static CrawlSiteDTO toDto(CrawlSiteEntity entity) {
        return new CrawlSiteDTO(
            entity.getId(),
            entity.getName(),
            entity.getBaseUrl(),
            entity.getConfigJson(),
            entity.isEnabled(),
            entity.getRemark(),
            entity.getCreatedAt().toEpochMilli(),
            entity.getUpdatedAt().toEpochMilli()
        );
    }

    private static long epoch(java.time.Instant instant) {
        return instant == null ? 0L : instant.toEpochMilli();
    }
}
