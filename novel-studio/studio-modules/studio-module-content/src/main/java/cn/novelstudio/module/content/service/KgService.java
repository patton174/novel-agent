package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.entity.KgEntityEntity;
import cn.novelstudio.module.content.entity.KgIngestErrorEntity;
import cn.novelstudio.module.content.entity.KgRelationEntity;
import cn.novelstudio.module.content.repository.KgEntityRepository;
import cn.novelstudio.module.content.repository.KgIngestErrorRepository;
import cn.novelstudio.module.content.repository.KgRelationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class KgService {

    private final KgEntityRepository entityRepo;
    private final KgRelationRepository relationRepo;
    private final KgIngestErrorRepository errorRepo;

    @Transactional
    public void upsertChapter(
        String novelId,
        String chapterId,
        List<Map<String, String>> entities,
        List<Map<String, String>> relations
    ) {
        for (Map<String, String> e : entities) {
            String name = e.get("name");
            if (name == null || name.isBlank()) {
                continue;
            }
            String type = e.getOrDefault("type", "unknown");
            String alias = e.get("aliases");
            Optional<KgEntityEntity> existing = entityRepo.findByNovelIdAndName(novelId, name);
            if (existing.isPresent()) {
                KgEntityEntity ent = existing.get();
                ent.setType(type);
                if (alias != null && !alias.isBlank()) {
                    Set<String> all = new LinkedHashSet<>();
                    if (ent.getAliases() != null) {
                        Collections.addAll(all, ent.getAliases().split(","));
                    }
                    Collections.addAll(all, alias.split(","));
                    all.removeIf(String::isBlank);
                    ent.setAliases(String.join(",", all));
                }
                entityRepo.save(ent);
            } else {
                KgEntityEntity ent = new KgEntityEntity();
                ent.setNovelId(novelId);
                ent.setName(name);
                ent.setType(type);
                ent.setAliases(alias);
                entityRepo.save(ent);
            }
        }
        for (Map<String, String> r : relations) {
            String src = r.get("src");
            String rel = r.get("rel");
            String dst = r.get("dst");
            if (src == null || rel == null || dst == null) {
                continue;
            }
            ensureEntityExists(novelId, src);
            ensureEntityExists(novelId, dst);
            boolean exists = relationRepo.findByNovelIdAndSrcName(novelId, src).stream()
                .anyMatch(x -> rel.equals(x.getRel()) && dst.equals(x.getDstName()));
            if (exists) {
                continue;
            }
            KgRelationEntity relEntity = new KgRelationEntity();
            relEntity.setNovelId(novelId);
            relEntity.setSrcName(src);
            relEntity.setRel(rel);
            relEntity.setDstName(dst);
            relationRepo.save(relEntity);
        }
    }

    @Transactional
    public void clearNovel(String novelId) {
        relationRepo.deleteByNovelId(novelId);
        entityRepo.deleteByNovelId(novelId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getGraph(String novelId) {
        List<KgEntityEntity> entities = entityRepo.findByNovelId(novelId);
        List<KgRelationEntity> relations = relationRepo.findByNovelId(novelId);
        Map<String, KgEntityEntity> entityByName = new LinkedHashMap<>();
        for (KgEntityEntity e : entities) {
            entityByName.put(e.getName(), e);
        }
        for (KgRelationEntity r : relations) {
            ensureGraphEntity(entityByName, novelId, r.getSrcName());
            ensureGraphEntity(entityByName, novelId, r.getDstName());
        }
        List<Map<String, Object>> nodes = new ArrayList<>();
        for (KgEntityEntity e : entityByName.values()) {
            Map<String, Object> n = new LinkedHashMap<>();
            n.put("id", e.getName());
            n.put("name", e.getName());
            n.put("type", e.getType());
            if (e.getAliases() != null) {
                n.put("aliases", e.getAliases());
            }
            nodes.add(n);
        }
        List<Map<String, Object>> edges = new ArrayList<>();
        for (KgRelationEntity r : relations) {
            Map<String, Object> ed = new LinkedHashMap<>();
            ed.put("source", r.getSrcName());
            ed.put("target", r.getDstName());
            ed.put("rel", r.getRel());
            edges.add(ed);
        }
        String status = entities.isEmpty()
            ? "empty"
            : (errorRepo.countByNovelId(novelId) > 0 ? "partial" : "ok");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("enabled", true);
        out.put("status", status);
        out.put("nodes", nodes);
        out.put("edges", edges);
        out.put("errorCount", errorRepo.countByNovelId(novelId));
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> characterSubgraph(String novelId, String name) {
        List<KgRelationEntity> outR = relationRepo.findByNovelIdAndSrcName(novelId, name);
        Set<String> names = new LinkedHashSet<>();
        names.add(name);
        for (KgRelationEntity r : outR) {
            names.add(r.getDstName());
        }
        List<Map<String, Object>> nodes = new ArrayList<>();
        for (KgEntityEntity e : entityRepo.findByNovelId(novelId)) {
            if (names.contains(e.getName())) {
                Map<String, Object> n = new LinkedHashMap<>();
                n.put("id", e.getName());
                n.put("name", e.getName());
                n.put("type", e.getType());
                nodes.add(n);
            }
        }
        List<Map<String, Object>> edges = new ArrayList<>();
        for (KgRelationEntity r : outR) {
            Map<String, Object> ed = new LinkedHashMap<>();
            ed.put("source", r.getSrcName());
            ed.put("target", r.getDstName());
            ed.put("rel", r.getRel());
            edges.add(ed);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("nodes", nodes);
        out.put("edges", edges);
        return out;
    }

    @Transactional
    public void recordError(String novelId, String chapterId, String reason) {
        KgIngestErrorEntity err = new KgIngestErrorEntity();
        err.setNovelId(novelId);
        err.setChapterId(chapterId);
        err.setReason(reason);
        errorRepo.save(err);
    }

    @Transactional(readOnly = true)
    public List<KgIngestErrorEntity> recentErrors(String novelId) {
        return errorRepo.findByNovelIdOrderByCreatedAtDesc(novelId, PageRequest.of(0, 50)).getContent();
    }

    private void ensureEntityExists(String novelId, String name) {
        if (name == null || name.isBlank()) {
            return;
        }
        if (entityRepo.findByNovelIdAndName(novelId, name).isPresent()) {
            return;
        }
        KgEntityEntity ent = new KgEntityEntity();
        ent.setNovelId(novelId);
        ent.setName(name);
        ent.setType("unknown");
        entityRepo.save(ent);
    }

    private static void ensureGraphEntity(Map<String, KgEntityEntity> entityByName, String novelId, String name) {
        if (name == null || name.isBlank() || entityByName.containsKey(name)) {
            return;
        }
        KgEntityEntity stub = new KgEntityEntity();
        stub.setNovelId(novelId);
        stub.setName(name);
        stub.setType("unknown");
        entityByName.put(name, stub);
    }
}
