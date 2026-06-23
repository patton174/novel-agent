package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.MemoryNodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MemoryNodeRepository extends JpaRepository<MemoryNodeEntity, MemoryNodeEntity.MemoryNodeId> {

    List<MemoryNodeEntity> findByUserIdAndNovelIdAndScopeAndParentIdOrderBySortOrderAsc(
        Long userId,
        String novelId,
        String scope,
        String parentId
    );

    List<MemoryNodeEntity> findByUserIdAndNovelIdAndScopeAndParentIdIsNullOrderBySortOrderAsc(
        Long userId,
        String novelId,
        String scope
    );

    List<MemoryNodeEntity> findByUserIdAndNovelIdAndScopeOrderBySortOrderAsc(
        Long userId,
        String novelId,
        String scope
    );

    List<MemoryNodeEntity> findByUserIdAndNovelIdOrderByScopeAscSortOrderAsc(
        Long userId,
        String novelId
    );

    List<MemoryNodeEntity> findByUserIdAndNovelIdAndParentId(
        Long userId,
        String novelId,
        String parentId
    );

    Optional<MemoryNodeEntity> findByUserIdAndNovelIdAndId(Long userId, String novelId, String id);

    long countByUserIdAndNovelIdAndParentId(Long userId, String novelId, String parentId);

    List<MemoryNodeEntity> findByUserIdAndNovelIdAndParentIdIsNullOrderBySortOrderAsc(
        Long userId,
        String novelId
    );

    boolean existsByUserIdAndNovelIdAndScopeAndParentIdIsNull(
        Long userId,
        String novelId,
        String scope
    );

    List<MemoryNodeEntity> findByUserIdAndNovelIdAndScope(
        Long userId,
        String novelId,
        String scope
    );

    /** Flat list for UI: omit TEXT content column to avoid OOM on large memory bodies. */
    @Query(
        value = """
            SELECT id, novel_id, scope, parent_id, sort_order, title, node_kind,
                   style::text AS style_json, meta::text AS meta_json
            FROM memory_node
            WHERE user_id = :userId AND novel_id = :novelId
              AND LOWER(TRIM(scope)) = LOWER(TRIM(:scope))
            ORDER BY sort_order ASC
            """,
        nativeQuery = true
    )
    List<Object[]> findSummaryRowsByScope(
        @Param("userId") Long userId,
        @Param("novelId") String novelId,
        @Param("scope") String scope
    );

    @Query(
        value = """
            SELECT DISTINCT scope
            FROM memory_node
            WHERE user_id = :userId AND novel_id = :novelId
              AND (parent_id IS NULL OR parent_id = '')
            ORDER BY scope ASC
            """,
        nativeQuery = true
    )
    List<String> findScopeKeysByNovel(@Param("userId") Long userId, @Param("novelId") String novelId);
}
