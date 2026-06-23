package cn.novelstudio.module.content.service;

import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.kernel.tools.IdWorker;
import cn.novelstudio.module.content.dto.CreateMemoryNodeRequest;
import cn.novelstudio.module.content.dto.MemoryNodeDTO;
import cn.novelstudio.module.content.dto.MoveMemoryNodeRequest;
import cn.novelstudio.module.content.dto.UpdateMemoryNodeRequest;
import cn.novelstudio.module.content.entity.MemoryNodeEntity;
import cn.novelstudio.module.content.repository.MemoryNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class MemoryNodeService {

    private static final int MAX_SCOPE_LEN = 128;
    /** Scope root (depth 0) → content node (depth 1) only. */
    private static final int MAX_TREE_DEPTH = 2;
    private static final Set<String> VALID_KINDS = Set.of("section", "leaf", "both");

    private final MemoryNodeRepository repository;

    public List<MemoryNodeDTO> listAllInScope(Long userId, String novelId, String scope) {
        String scopeNorm = normalizeScope(scope);
        return repository.findByUserIdAndNovelIdAndScopeOrderBySortOrderAsc(userId, novelId, scopeNorm)
            .stream()
            .map(row -> toDto(row, userId, novelId))
            .toList();
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
        List<MemoryNodeEntity> roots = repository.findByUserIdAndNovelIdAndParentIdIsNullOrderBySortOrderAsc(
            userId, novelId
        );
        if (roots.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> index = new LinkedHashMap<>();
        for (MemoryNodeEntity root : roots) {
            String scopeKey = normalizeScope(root.getScope());
            List<MemoryNodeEntity> scopeNodes = repository.findByUserIdAndNovelIdAndScopeOrderBySortOrderAsc(
                userId, novelId, scopeKey
            );
            if (!scopeNodes.isEmpty()) {
                index.put(scopeKey, buildTreeSummaryForScope(scopeKey, scopeNodes));
            }
        }
        return index;
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
            throw new ValidationException("title is required");
        }

        String scopeNorm;
        if (parentId != null) {
            MemoryNodeEntity parent = requireNode(userId, novelId, parentId);
            if (isNestedNode(parent)) {
                throw new ValidationException(
                    "Memory tree supports two levels only: scope root → content node; "
                        + "parent_id must be the scope root's memory_id (depth 0)"
                );
            }
            scopeNorm = parent.getScope();
        } else {
            scopeNorm = scopeFromRootTitle(title);
            if (repository.existsByUserIdAndNovelIdAndScopeAndParentIdIsNull(userId, novelId, scopeNorm)) {
                throw new ValidationException("scope root already exists: " + scopeNorm);
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
                        throw new ValidationException("scope root already exists: " + newScope);
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
                    throw new ValidationException("parent_id cannot equal memory_id");
                }
                MemoryNodeEntity parent = requireNode(userId, novelId, newParent);
                if (isNestedNode(parent)) {
                    throw new ValidationException(
                        "Memory tree supports two levels only: parent_id must be the scope root's memory_id"
                    );
                }
                if (!parent.getScope().equals(entity.getScope())) {
                    throw new ValidationException("cannot move node across scope roots");
                }
            } else if (entity.getParentId() == null || entity.getParentId().isBlank()) {
                throw new ValidationException("scope root cannot be moved to top level without parent");
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
                throw new ValidationException("node has children; use cascade=true or delete children first");
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
            .orElseThrow(() -> new NotFoundException("memory node not found: " + memoryId));
    }

    private MemoryNodeDTO toDto(MemoryNodeEntity row, Long userId, String novelId) {
        int childCount = (int) repository.countByUserIdAndNovelIdAndParentId(
            userId, novelId, row.getId()
        );
        return new MemoryNodeDTO(
            row.getId(),
            row.getNovelId(),
            row.getScope(),
            row.getParentId(),
            row.getSortOrder() != null ? row.getSortOrder() : 0,
            row.getTitle(),
            row.getNodeKind(),
            row.getContent(),
            row.getStyle(),
            row.getMeta(),
            childCount
        );
    }

    /** Outermost root title is the scope identifier (case-insensitive storage). */
    private static String scopeFromRootTitle(String title) {
        return normalizeScope(title);
    }

    private static String normalizeScope(String scope) {
        String norm = (scope == null ? "" : scope.trim());
        if (norm.isEmpty()) {
            throw new ValidationException("scope is required");
        }
        if (norm.length() > MAX_SCOPE_LEN) {
            throw new ValidationException("scope too long (max " + MAX_SCOPE_LEN + ")");
        }
        return norm.toLowerCase(Locale.ROOT);
    }

    private static String normalizeKind(String kind) {
        String norm = (kind == null || kind.isBlank()) ? "both" : kind.trim().toLowerCase(Locale.ROOT);
        if (!VALID_KINDS.contains(norm)) {
            throw new ValidationException("unsupported node_kind: " + kind);
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
