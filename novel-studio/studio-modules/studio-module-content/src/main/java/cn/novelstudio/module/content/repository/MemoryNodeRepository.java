package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.MemoryNodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
