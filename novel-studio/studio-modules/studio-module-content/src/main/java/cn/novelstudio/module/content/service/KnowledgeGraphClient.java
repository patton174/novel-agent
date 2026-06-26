package cn.novelstudio.module.content.service;

import cn.novelstudio.platform.i18n.ResultLocalizer;
import cn.novelstudio.platform.i18n.StudioMessages;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class KnowledgeGraphClient {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeGraphClient.class);

    private final RestClient restClient;
    private final StudioMessages messages;
    private final ResultLocalizer resultLocalizer;

    public KnowledgeGraphClient(
        @Qualifier("pythonRestClient") RestClient restClient,
        StudioMessages messages,
        ResultLocalizer resultLocalizer
    ) {
        this.restClient = restClient;
        this.messages = messages;
        this.resultLocalizer = resultLocalizer;
    }

    public Map<String, Object> getNovelGraph(String novelId) {
        if (novelId == null || novelId.isBlank()) {
            return emptyGraph(false, messages.get("content.kg.missing_novel_id"));
        }
        try {
            Map<String, Object> body = restClient.get()
                .uri("/api/kg/novels/{novelId}/graph", novelId)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
            return body == null ? emptyGraph(true, null) : body;
        } catch (Exception ex) {
            log.debug("knowledge graph fetch skipped novelId={}: {}", novelId, ex.getMessage());
            String note = ex.getMessage() == null || ex.getMessage().isBlank()
                ? messages.get("content.kg.fetch_failed")
                : resultLocalizer.resolveLiteral(ex.getMessage());
            return emptyGraph(false, note);
        }
    }

    private static Map<String, Object> emptyGraph(boolean enabled, String note) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("enabled", enabled);
        out.put("nodes", java.util.List.of());
        out.put("edges", java.util.List.of());
        if (note != null && !note.isBlank()) {
            out.put("note", note);
        }
        return out;
    }
}
