package cn.novelstudio.module.worker.listener;

import cn.novelstudio.module.content.catalog.IndexStatus;
import cn.novelstudio.module.content.entity.CrawlCatalogChapterEntity;
import cn.novelstudio.module.content.repository.CrawlCatalogChapterRepository;
import cn.novelstudio.module.content.service.catalog.CatalogService;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import cn.novelstudio.platform.messaging.library.LibraryIndexMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class LibraryIndexListener {

    private static final Logger log = LoggerFactory.getLogger(LibraryIndexListener.class);

    private final ObjectMapper objectMapper;
    private final CatalogService catalogService;
    private final CrawlCatalogChapterRepository chapterRepo;
    private final RestClient pythonRestClient;
    private final String internalKey;

    public LibraryIndexListener(
        ObjectMapper objectMapper,
        CatalogService catalogService,
        CrawlCatalogChapterRepository chapterRepo,
        @Qualifier("pythonRestClient") RestClient pythonRestClient,
        @Value("${agent.internal.service-key:dev-internal-key-change-me}") String internalKey
    ) {
        this.objectMapper = objectMapper;
        this.catalogService = catalogService;
        this.chapterRepo = chapterRepo;
        this.pythonRestClient = pythonRestClient;
        this.internalKey = internalKey;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.library-index.queue", durable = "true"))
    public void onLibraryIndex(String message) {
        MqListenerSupport.safeHandle(log, message, "书库书索引失败", this::handle);
    }

    private void handle(String message) throws Exception {
        String catalogNovelId = null;
        try {
            LibraryIndexMessage payload = objectMapper.readValue(message, LibraryIndexMessage.class);
            catalogNovelId = payload.catalogNovelId();
            String namespace = payload.namespace();
            catalogService.updateIndexStatus(catalogNovelId, IndexStatus.INDEXING);

            List<CrawlCatalogChapterEntity> chapters =
                chapterRepo.findByCatalogNovelIdOrderBySortOrderAsc(catalogNovelId);
            List<String> chapterTitles = new ArrayList<>();
            List<String> firstChunks = new ArrayList<>();
            for (CrawlCatalogChapterEntity ch : chapters) {
                String content = ch.getContent() == null ? "" : ch.getContent();
                String title = ch.getTitle() == null ? "" : ch.getTitle().trim();
                if (title.isEmpty()) {
                    continue;
                }
                Map<String, Object> body = new HashMap<>();
                body.put("novel_id", namespace);
                body.put("chapter_id", ch.getId());
                body.put("title", title);
                body.put("content", content);
                pythonRestClient.post()
                    .uri("/api/rag/index/chapter")
                    .header("X-Internal-Service-Key", internalKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
                chapterTitles.add(title);
                firstChunks.add(content.length() > 500 ? content.substring(0, 500) : content);
            }

            try {
                Map<String, Object> sumReq = new HashMap<>();
                sumReq.put("catalogNovelId", catalogNovelId);
                sumReq.put("chapterTitles", chapterTitles);
                sumReq.put("firstChunks", firstChunks);
                JsonNode sumResp = pythonRestClient.post()
                    .uri("/internal/library/summarize")
                    .header("X-Internal-Service-Key", internalKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(sumReq)
                    .retrieve()
                    .body(JsonNode.class);
                String summary = sumResp != null ? sumResp.path("summary").asText("") : "";
                if (!summary.isBlank()) {
                    catalogService.updateSummary(catalogNovelId, summary);
                }
            } catch (Exception e) {
                log.warn("library summary failed novel={}: {}", catalogNovelId, e.getMessage());
            }

            catalogService.updateIndexStatus(catalogNovelId, IndexStatus.INDEXED);
        } catch (Exception e) {
            if (catalogNovelId != null) {
                try {
                    catalogService.updateIndexStatus(catalogNovelId, IndexStatus.FAILED);
                } catch (Exception ex) {
                    log.warn("failed to mark index_status=failed novel={}: {}", catalogNovelId, ex.getMessage());
                }
            }
            throw e;
        }
    }
}
