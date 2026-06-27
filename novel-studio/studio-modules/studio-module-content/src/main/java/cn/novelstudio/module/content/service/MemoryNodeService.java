package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.support.ContentExceptions;
import cn.novelstudio.kernel.tools.IdWorker;
import cn.novelstudio.module.content.dto.CreateMemoryNodeRequest;
import cn.novelstudio.module.content.dto.MemoryNodeDTO;
import cn.novelstudio.module.content.dto.MoveMemoryNodeRequest;
import cn.novelstudio.module.content.dto.UpdateMemoryNodeRequest;
import cn.novelstudio.module.content.entity.MemoryNodeEntity;
import cn.novelstudio.module.content.repository.MemoryNodeRepository;
import cn.novelstudio.module.content.support.MemoryNodeJsonSupport;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class MemoryNodeService {

    private static final Logger log = LoggerFactory.getLogger(MemoryNodeService.class);

    private static final int MAX_SCOPE_LEN = 128;
    /** Scope root (depth 0) → content node (depth 1) only. */
    private static final int MAX_TREE_DEPTH = 2;
    private static final Set<String> VALID_KINDS = Set.of("section", "leaf", "both");

    private final MemoryNodeRepository repository;

    public List<MemoryNodeDTO> listAllInScope(Long userId, String novelId, String scope, boolean includeContent) {
        String scopeNorm = normalizeScope(scope);
        if (!includeContent) {
            return listSummariesInScope(userId, novelId, scopeNorm);
        }
        List<MemoryNodeEntity> rows = repository.findByUserIdAndNovelIdAndScopeOrderBySortOrderAsc(
            userId, novelId, scopeNorm
        );
        Map<String, Integer> childCounts = childCountsFor(rows);
        return rows.stream()
            .map(row -> toDto(row, childCounts.getOrDefault(row.getId(), 0), true))
            .toList();
    }

    private List<MemoryNodeDTO> listSummariesInScope(Long userId, String novelId, String scopeNorm) {
        List<Object[]> rows = repository.findSummaryRowsByScope(userId, novelId, scopeNorm);
        Map<String, Integer> childCounts = childCountsForSummaryRows(rows);
        List<MemoryNodeDTO> out = new ArrayList<>();
        for (Object[] row : rows) {
            try {
                out.add(summaryRowToDto(row, childCounts));
            } catch (Exception ex) {
                log.warn(
                    "memory flat skip summary row novelId={} scope={}: {}",
                    novelId,
                    scopeNorm,
                    ex.getMessage()
                );
            }
        }
        return out;
    }

    public List<MemoryNodeDTO> listChildren(
        Long userId,
        String novelId,
        String scope,
        String parentId
    ) {
        String scopeNorm = normalizeScope(scope);
        List<MemoryNodeEntity> rows;
        if (parentId == null || parentId.isBlank()) {
            rows = repository.findByUserIdAndNovelIdAndScopeAndParentIdIsNullOrderBySortOrderAsc(
                userId, novelId, scopeNorm
            );
        } else {
            rows = repository.findByUserIdAndNovelIdAndScopeAndParentIdOrderBySortOrderAsc(
                userId, novelId, scopeNorm, parentId.trim()
            );
        }
        return rows.stream().map(row -> toDto(row, userId, novelId)).toList();
    }

    public Map<String, Object> buildTreeSummary(Long userId, String novelId, String scope) {
        String scopeNorm = normalizeScope(scope);
        List<MemoryNodeEntity> all = repository.findByUserIdAndNovelIdAndScopeOrderBySortOrderAsc(
            userId, novelId, scopeNorm
        );
        return buildTreeSummaryForScope(scopeNorm, all);
    }

    /** Dynamic scopes: each outermost root node's title is the scope key. */
    public Map<String, Object> buildAllScopesTreeIndex(Long userId, String novelId) {
        LinkedHashSet<String> scopeKeys = new LinkedHashSet<>(repository.findDistinctScopesByNovel(userId, novelId));
        if (scopeKeys.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> index = new LinkedHashMap<>();
        for (String scopeRaw : scopeKeys) {
            if (scopeRaw == null || scopeRaw.isBlank()) {
                continue;
            }
            try {
                String scopeKey = normalizeScope(scopeRaw);
                List<Object[]> summaryRows = repository.findSummaryRowsByScope(userId, novelId, scopeRaw.trim());
                if (summaryRows.isEmpty()) {
                    summaryRows = repository.findSummaryRowsByScope(userId, novelId, scopeKey);
                }
                if (!summaryRows.isEmpty()) {
                    index.put(scopeKey, buildTreeSummaryForSummaryRows(scopeKey, summaryRows));
                }
            } catch (Exception ex) {
                log.warn(
                    "memory tree-index skip scope novelId={} scope={}: {}",
                    novelId,
                    scopeRaw,
                    ex.getMessage()
                );
            }
        }
        if (index.isEmpty()) {
            long total = repository.countByUserIdAndNovelId(userId, novelId);
            if (total > 0) {
                log.warn(
                    "memory tree-index empty despite {} nodes novelId={} userId={} scopes={}",
                    total,
                    novelId,
                    userId,
                    scopeKeys
                );
                index = buildTreeIndexFromAllSummaryRows(userId, novelId);
            }
        }
        return index;
    }

    private Map<String, Object> buildTreeIndexFromAllSummaryRows(Long userId, String novelId) {
        List<Object[]> allRows = repository.findAllSummaryRowsByNovel(userId, novelId);
        if (allRows.isEmpty()) {
            return Map.of();
        }
        Map<String, List<Object[]>> byScope = new LinkedHashMap<>();
        for (Object[] row : allRows) {
            String scopeRaw = stringAt(row, 2);
            if (scopeRaw == null || scopeRaw.isBlank()) {
                continue;
            }
            String scopeKey = normalizeScope(scopeRaw);
            byScope.computeIfAbsent(scopeKey, key -> new ArrayList<>()).add(row);
        }
        Map<String, Object> index = new LinkedHashMap<>();
        for (Map.Entry<String, List<Object[]>> entry : byScope.entrySet()) {
            index.put(entry.getKey(), buildTreeSummaryForSummaryRows(entry.getKey(), entry.getValue()));
        }
        return index;
    }

    private Map<String, Object> buildTreeSummaryForSummaryRows(String scopeNorm, List<Object[]> rows) {
        Map<String, Integer> childCounts = childCountsForSummaryRows(rows);
        Map<String, List<Object[]>> byParent = groupSummaryRowsByParent(rows);
        Set<String> ids = new HashSet<>();
        for (Object[] row : rows) {
            String memoryId = stringAt(row, 0);
            if (memoryId != null && !memoryId.isBlank()) {
                ids.add(memoryId.trim());
            }
        }
        List<Map<String, Object>> roots = buildSummaryTreeLevel(byParent, "", childCounts, 0, MAX_TREE_DEPTH);
        if (roots.isEmpty()) {
            for (Object[] row : rows) {
                String parentId = stringAt(row, 3);
                if (parentId == null || parentId.isBlank() || !ids.contains(parentId.trim())) {
                    roots.add(summaryRowToTreeItem(row, byParent, childCounts, 0, MAX_TREE_DEPTH));
                }
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("scope", scopeNorm);
        out.put("nodes", roots);
        out.put("count", rows.size());
        return out;
    }

    private static Map<String, List<Object[]>> groupSummaryRowsByParent(List<Object[]> rows) {
        Map<String, List<Object[]>> byParent = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String pid = stringAt(row, 3);
            String parentKey = pid == null || pid.isBlank() ? "" : pid;
            byParent.computeIfAbsent(parentKey, key -> new ArrayList<>()).add(row);
        }
        return byParent;
    }

    private List<Map<String, Object>> buildSummaryTreeLevel(
        Map<String, List<Object[]>> byParent,
        String parentKey,
        Map<String, Integer> childCounts,
        int depth,
        int maxDepth
    ) {
        List<Object[]> level = byParent.getOrDefault(parentKey, List.of());
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] row : level) {
            out.add(summaryRowToTreeItem(row, byParent, childCounts, depth, maxDepth));
        }
        return out;
    }

    private Map<String, Object> summaryRowToTreeItem(
        Object[] row,
        Map<String, List<Object[]>> byParent,
        Map<String, Integer> childCounts,
        int depth,
        int maxDepth
    ) {
        String memoryId = stringAt(row, 0);
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("memory_id", memoryId);
        item.put("title", stringAt(row, 5));
        item.put("sort_order", intAt(row, 4));
        item.put("node_kind", stringAt(row, 6));
        item.put("child_count", childCounts.getOrDefault(memoryId, 0));
        if (depth + 1 < maxDepth) {
            item.put(
                "children",
                buildSummaryTreeLevel(byParent, memoryId, childCounts, depth + 1, maxDepth)
            );
        }
        return item;
    }

    private Map<String, Object> buildTreeSummaryForScope(String scopeNorm, List<MemoryNodeEntity> all) {
        Map<String, Integer> childCounts = childCountsFor(all);
        Map<String, List<MemoryNodeEntity>> byParent = groupByParent(all);
        List<Map<String, Object>> roots = buildTreeLevel(byParent, "", childCounts, 0, MAX_TREE_DEPTH);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("scope", scopeNorm);
        out.put("nodes", roots);
        out.put("count", all.size());
        return out;
    }

    private static Map<String, Integer> childCountsFor(List<MemoryNodeEntity> nodes) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (MemoryNodeEntity node : nodes) {
            String parentId = node.getParentId();
            if (parentId == null || parentId.isBlank()) {
                continue;
            }
            counts.merge(parentId.trim(), 1, Integer::sum);
        }
        return counts;
    }

    private static Map<String, Integer> childCountsForSummaryRows(List<Object[]> rows) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String parentId = stringAt(row, 3);
            if (parentId == null || parentId.isBlank()) {
                continue;
            }
            counts.merge(parentId.trim(), 1, Integer::sum);
        }
        return counts;
    }

    private static Map<String, List<MemoryNodeEntity>> groupByParent(List<MemoryNodeEntity> nodes) {
        Map<String, List<MemoryNodeEntity>> byParent = new LinkedHashMap<>();
        for (MemoryNodeEntity node : nodes) {
            String pid = node.getParentId() == null ? "" : node.getParentId();
            byParent.computeIfAbsent(pid, key -> new ArrayList<>()).add(node);
        }
        return byParent;
    }

    public MemoryNodeDTO getNode(Long userId, String novelId, String memoryId) {
        MemoryNodeEntity row = requireNode(userId, novelId, memoryId);
        return toDto(row, userId, novelId);
    }

    @Transactional
    public MemoryNodeDTO createNode(Long userId, String novelId, CreateMemoryNodeRequest request) {
        String parentId = blankToNull(request.parentId());
        String title = request.title().trim();
        if (title.isBlank()) {
            throw ContentExceptions.memory("memory.title_required");
        }

        String scopeNorm;
        if (parentId != null) {
            MemoryNodeEntity parent = requireNode(userId, novelId, parentId);
            if (isNestedNode(parent)) {
                throw ContentExceptions.memory("memory.two_level_only");
            }
            scopeNorm = parent.getScope();
        } else {
            scopeNorm = scopeFromRootTitle(title);
            if (repository.existsByUserIdAndNovelIdAndScopeAndParentIdIsNull(userId, novelId, scopeNorm)) {
                throw ContentExceptions.memory("memory.scope_root_exists", scopeNorm);
            }
        }

        String kind = normalizeKind(request.nodeKind());
        int sortOrder = request.sortOrder() != null
            ? request.sortOrder()
            : nextSortOrder(userId, novelId, scopeNorm, parentId);

        MemoryNodeEntity entity = new MemoryNodeEntity();
        entity.setUserId(userId);
        entity.setNovelId(novelId);
        entity.setId(IdWorker.nextIdStr());
        entity.setScope(scopeNorm);
        entity.setParentId(parentId);
        entity.setSortOrder(sortOrder);
        entity.setTitle(title);
        entity.setNodeKind(kind);
        entity.setContent(request.content());
        entity.setStyle(request.style());
        entity.setMeta(request.meta());
        repository.save(entity);
        return toDto(entity, userId, novelId);
    }

    @Transactional
    public MemoryNodeDTO updateNode(
        Long userId,
        String novelId,
        String memoryId,
        UpdateMemoryNodeRequest request
    ) {
        MemoryNodeEntity entity = requireNode(userId, novelId, memoryId);
        boolean isRoot = entity.getParentId() == null || entity.getParentId().isBlank();
        String oldScope = entity.getScope();

        if (request.title() != null && !request.title().isBlank()) {
            String newTitle = request.title().trim();
            entity.setTitle(newTitle);
            if (isRoot) {
                String newScope = scopeFromRootTitle(newTitle);
                if (!newScope.equals(oldScope)) {
                    if (repository.existsByUserIdAndNovelIdAndScopeAndParentIdIsNull(userId, novelId, newScope)) {
                        throw ContentExceptions.memory("memory.scope_root_exists", newScope);
                    }
                    renameScope(userId, novelId, oldScope, newScope);
                    entity.setScope(newScope);
                }
            }
        }
        if (request.nodeKind() != null) {
            entity.setNodeKind(normalizeKind(request.nodeKind()));
        }
        if (request.content() != null) {
            entity.setContent(request.content());
        }
        if (request.style() != null) {
            entity.setStyle(request.style());
        }
        if (request.meta() != null) {
            entity.setMeta(request.meta());
        }
        repository.save(entity);
        return toDto(entity, userId, novelId);
    }

    @Transactional
    public MemoryNodeDTO moveNode(
        Long userId,
        String novelId,
        String memoryId,
        MoveMemoryNodeRequest request
    ) {
        MemoryNodeEntity entity = requireNode(userId, novelId, memoryId);
        String parentForSort = entity.getParentId();
        if (request.parentId() != null && request.parentId().isPresent()) {
            String newParent = blankToNull(request.parentId().orElse(null));
            if (newParent != null) {
                if (newParent.equals(memoryId)) {
                    throw ContentExceptions.memory("memory.parent_self");
                }
                MemoryNodeEntity parent = requireNode(userId, novelId, newParent);
                if (isNestedNode(parent)) {
                    throw ContentExceptions.memory("memory.two_level_only");
                }
                if (!parent.getScope().equals(entity.getScope())) {
                    throw ContentExceptions.memory("memory.cross_scope_move");
                }
            } else if (entity.getParentId() == null || entity.getParentId().isBlank()) {
                throw ContentExceptions.memory("memory.root_move_forbidden");
            }
            entity.setParentId(newParent);
            parentForSort = newParent;
        }
        if (request.sortOrder() != null) {
            entity.setSortOrder(request.sortOrder());
        } else if (request.parentId() != null && request.parentId().isPresent()) {
            entity.setSortOrder(nextSortOrder(userId, novelId, entity.getScope(), parentForSort));
        }
        repository.save(entity);
        return toDto(entity, userId, novelId);
    }

    @Transactional
    public void deleteNode(Long userId, String novelId, String memoryId, boolean cascade) {
        MemoryNodeEntity entity = requireNode(userId, novelId, memoryId);
        if (cascade) {
            deleteDescendants(userId, novelId, memoryId);
        } else {
            long children = repository.countByUserIdAndNovelIdAndParentId(userId, novelId, memoryId);
            if (children > 0) {
                throw ContentExceptions.memory("memory.has_children");
            }
        }
        repository.delete(entity);
    }

    private void renameScope(Long userId, String novelId, String oldScope, String newScope) {
        List<MemoryNodeEntity> rows = repository.findByUserIdAndNovelIdAndScope(userId, novelId, oldScope);
        for (MemoryNodeEntity row : rows) {
            row.setScope(newScope);
            repository.save(row);
        }
    }

    private void deleteDescendants(Long userId, String novelId, String parentId) {
        List<MemoryNodeEntity> children = repository.findByUserIdAndNovelIdAndParentId(
            userId, novelId, parentId
        );
        for (MemoryNodeEntity child : children) {
            deleteDescendants(userId, novelId, child.getId());
            repository.delete(child);
        }
    }

    private static boolean isNestedNode(MemoryNodeEntity node) {
        String pid = node.getParentId();
        return pid != null && !pid.isBlank();
    }

    private List<Map<String, Object>> buildTreeLevel(
        Map<String, List<MemoryNodeEntity>> byParent,
        String parentKey,
        Map<String, Integer> childCounts,
        int depth,
        int maxDepth
    ) {
        List<MemoryNodeEntity> level = byParent.getOrDefault(parentKey, List.of());
        List<Map<String, Object>> out = new ArrayList<>();
        for (MemoryNodeEntity node : level) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("memory_id", node.getId());
            item.put("title", node.getTitle());
            item.put("sort_order", node.getSortOrder());
            item.put("node_kind", node.getNodeKind());
            item.put("child_count", childCounts.getOrDefault(node.getId(), 0));
            if (depth + 1 < maxDepth) {
                item.put(
                    "children",
                    buildTreeLevel(byParent, node.getId(), childCounts, depth + 1, maxDepth)
                );
            }
            out.add(item);
        }
        return out;
    }

    private int nextSortOrder(Long userId, String novelId, String scope, String parentId) {
        List<MemoryNodeEntity> siblings;
        if (parentId == null) {
            siblings = repository.findByUserIdAndNovelIdAndScopeAndParentIdIsNullOrderBySortOrderAsc(
                userId, novelId, scope
            );
        } else {
            siblings = repository.findByUserIdAndNovelIdAndScopeAndParentIdOrderBySortOrderAsc(
                userId, novelId, scope, parentId
            );
        }
        if (siblings.isEmpty()) {
            return 0;
        }
        return siblings.get(siblings.size() - 1).getSortOrder() + 1;
    }

    private MemoryNodeEntity requireNode(Long userId, String novelId, String memoryId) {
        return repository.findByUserIdAndNovelIdAndId(userId, novelId, memoryId)
            .orElseThrow(() -> ContentExceptions.memoryNotFound(memoryId));
    }

    private MemoryNodeDTO toDto(MemoryNodeEntity row, Long userId, String novelId) {
        int childCount = (int) repository.countByUserIdAndNovelIdAndParentId(
            userId, novelId, row.getId()
        );
        return toDto(row, childCount, true);
    }

    private MemoryNodeDTO toDto(MemoryNodeEntity row, int childCount, boolean includeContent) {
        return new MemoryNodeDTO(
            row.getId(),
            row.getNovelId(),
            row.getScope(),
            row.getParentId(),
            row.getSortOrder() != null ? row.getSortOrder() : 0,
            row.getTitle(),
            row.getNodeKind(),
            includeContent ? MemoryNodeJsonSupport.sanitizeContent(row.getContent()) : null,
            row.getStyle(),
            row.getMeta(),
            childCount
        );
    }

    private static MemoryNodeDTO summaryRowToDto(Object[] row, Map<String, Integer> childCounts) {
        String memoryId = stringAt(row, 0);
        return new MemoryNodeDTO(
            memoryId,
            stringAt(row, 1),
            stringAt(row, 2),
            stringAt(row, 3),
            intAt(row, 4),
            stringAt(row, 5),
            stringAt(row, 6),
            null,
            mapAt(row, 7),
            mapAt(row, 8),
            childCounts.getOrDefault(memoryId, 0)
        );
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> mapAt(Object[] row, int index) {
        if (row == null || index >= row.length || row[index] == null) {
            return null;
        }
        Object value = row[index];
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return MemoryNodeJsonSupport.parseJsonMap(String.valueOf(value));
    }

    private static String stringAt(Object[] row, int index) {
        if (row == null || index >= row.length || row[index] == null) {
            return null;
        }
        return String.valueOf(row[index]);
    }

    private static int intAt(Object[] row, int index) {
        if (row == null || index >= row.length || row[index] == null) {
            return 0;
        }
        if (row[index] instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(row[index]).trim());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    /** Outermost root title is the scope identifier (case-insensitive storage). */
    private static String scopeFromRootTitle(String title) {
        return normalizeScope(title);
    }

    private static String normalizeScope(String scope) {
        String norm = (scope == null ? "" : scope.trim());
        if (norm.isEmpty()) {
            throw ContentExceptions.memory("memory.scope_required");
        }
        if (norm.length() > MAX_SCOPE_LEN) {
            throw ContentExceptions.memory("memory.scope_too_long", MAX_SCOPE_LEN);
        }
        return norm.toLowerCase(Locale.ROOT);
    }

    private static String normalizeKind(String kind) {
        String norm = (kind == null || kind.isBlank()) ? "both" : kind.trim().toLowerCase(Locale.ROOT);
        if (!VALID_KINDS.contains(norm)) {
            throw ContentExceptions.memory("memory.unsupported_kind", kind);
        }
        return norm;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
