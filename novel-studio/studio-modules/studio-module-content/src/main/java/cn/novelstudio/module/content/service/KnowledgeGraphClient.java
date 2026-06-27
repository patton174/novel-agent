package cn.novelstudio.module.content.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class KnowledgeGraphClient {

    private final KgService kgService;

    public Map<String, Object> getNovelGraph(String novelId) {
        if (novelId == null || novelId.isBlank()) {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("enabled", false);
            out.put("status", "empty");
            out.put("nodes", List.of());
            out.put("edges", List.of());
            out.put("errorCount", 0L);
            out.put("note", "missing novel_id");
            return out;
        }
        return kgService.getGraph(novelId);
    }
}
