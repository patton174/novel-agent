package cn.novelstudio.module.worker.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.content.service.catalog.CatalogService;
import cn.novelstudio.module.content.service.crawl.dto.CatalogChapterDetailDTO;
import cn.novelstudio.platform.messaging.catalog.CatalogIndexMessage;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

@Component
public class CatalogIndexListener {

    private static final Logger log = LoggerFactory.getLogger(CatalogIndexListener.class);

    private final ObjectMapper objectMapper;
    private final CatalogService catalogService;
    private final RestClient pythonRestClient;

    public CatalogIndexListener(
        ObjectMapper objectMapper,
        CatalogService catalogService,
        @Qualifier("pythonRestClient") RestClient pythonRestClient
    ) {
        this.objectMapper = objectMapper;
        this.catalogService = catalogService;
        this.pythonRestClient = pythonRestClient;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.catalog-index.queue", durable = "true"))
    public void onCatalogIndex(String message) {
        MqListenerSupport.safeHandle(log, message, "书库章节索引失败", this::handle);
    }

    private void handle(String message) throws Exception {
        CatalogIndexMessage payload = objectMapper.readValue(message, CatalogIndexMessage.class);
        if (payload.catalogNovelId() == null
            || payload.catalogNovelId().isBlank()
            || payload.chapterId() == null
            || payload.chapterId().isBlank()) {
            log.warn("catalog index skipped: missing ids payload={}", message);
            return;
        }

        CatalogChapterDetailDTO chapter = catalogService.getChapter(
            payload.catalogNovelId(),
            payload.chapterId()
        );
        String content = chapter.content() == null ? "" : chapter.content();
        if (content.isBlank()) {
            log.info(
                "catalog index skipped empty content catalogNovelId={} chapterId={}",
                payload.catalogNovelId(),
                payload.chapterId()
            );
            return;
        }

        String title = chapter.title() == null ? "" : chapter.title();
        if (title.isBlank()) {
            title = payload.title() == null ? "" : payload.title();
        }
        if (title.isBlank()) {
            log.warn(
                "catalog index skipped blank title catalogNovelId={} chapterId={}",
                payload.catalogNovelId(),
                payload.chapterId()
            );
            return;
        }

        Map<String, Object> body = new HashMap<>();
        body.put("novel_id", "catalog:" + payload.catalogNovelId());
        body.put("chapter_id", payload.chapterId());
        body.put("title", title.trim());
        body.put("content", content);

        pythonRestClient.post()
            .uri("/api/rag/index/chapter")
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .toBodilessEntity();

        log.info(
            "catalog chapter indexed catalogNovelId={} chapterId={} title={}",
            payload.catalogNovelId(),
            payload.chapterId(),
            title
        );
    }
}
