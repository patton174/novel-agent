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

    long countByUserIdAndNovelId(Long userId, String novelId);

    @Query(
        """
            SELECT DISTINCT m.scope
            FROM MemoryNodeEntity m
            WHERE m.userId = :userId AND m.novelId = :novelId
            ORDER BY m.scope ASC
            """
    )
    List<String> findDistinctScopesByNovel(@Param("userId") Long userId, @Param("novelId") String novelId);

    /** Flat/tree summary without loading TEXT content (JPQL partial select). */
    @Query(
        """
            SELECT m.id, m.novelId, m.scope, m.parentId, m.sortOrder, m.title, m.nodeKind, m.style, m.meta
            FROM MemoryNodeEntity m
            WHERE m.userId = :userId AND m.novelId = :novelId
              AND lower(m.scope) = lower(:scope)
            ORDER BY m.sortOrder ASC
            """
    )
    List<Object[]> findSummaryRowsByScope(
        @Param("userId") Long userId,
        @Param("novelId") String novelId,
        @Param("scope") String scope
    );

    @Query(
        """
            SELECT m.id, m.novelId, m.scope, m.parentId, m.sortOrder, m.title, m.nodeKind, m.style, m.meta
            FROM MemoryNodeEntity m
            WHERE m.userId = :userId AND m.novelId = :novelId
            ORDER BY m.scope ASC, m.sortOrder ASC
            """
    )
    List<Object[]> findAllSummaryRowsByNovel(@Param("userId") Long userId, @Param("novelId") String novelId);
}
