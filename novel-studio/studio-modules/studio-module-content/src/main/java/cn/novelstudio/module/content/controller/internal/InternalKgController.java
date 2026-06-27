package cn.novelstudio.module.content.controller.internal;

import cn.novelstudio.module.content.service.KgService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/kg")
@RequiredArgsConstructor
public class InternalKgController {

    private final KgService kgService;

    @PostMapping("/ingest-chapter")
    public Map<String, Object> ingestChapter(@RequestBody Map<String, Object> body) {
        String novelId = (String) body.get("novelId");
        String chapterId = (String) body.get("chapterId");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> entities = (List<Map<String, String>>) body.get("entities");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> relations = (List<Map<String, String>>) body.get("relations");
        kgService.upsertChapter(
            novelId,
            chapterId,
            entities == null ? List.of() : entities,
            relations == null ? List.of() : relations
        );
        return Map.of("ok", true);
    }

    @PostMapping("/error")
    public Map<String, Object> error(@RequestBody Map<String, Object> body) {
        kgService.recordError(
            (String) body.get("novelId"),
            (String) body.get("chapterId"),
            (String) body.get("reason")
        );
        return Map.of("ok", true);
    }

    @GetMapping("/character-graph")
    public Map<String, Object> characterGraph(@RequestParam String novelId, @RequestParam String name) {
        return kgService.characterSubgraph(novelId, name);
    }

    @GetMapping("/novel-graph")
    public Map<String, Object> novelGraph(@RequestParam String novelId) {
        return kgService.getGraph(novelId);
    }
}
