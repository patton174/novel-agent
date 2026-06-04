package com.novel.agent.content.repository;

import com.novel.agent.content.entity.ChapterEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChapterRepository extends JpaRepository<ChapterEntity, String> {
    List<ChapterEntity> findByNovelIdOrderBySortOrderAscCreatedAtAsc(String novelId);

    List<ChapterEntity> findByVolumeIdOrderBySortOrderAscCreatedAtAsc(String volumeId);

    List<ChapterEntity> findByNovelIdAndVolumeIdIsNull(String novelId);

    Optional<ChapterEntity> findByIdAndNovelId(String id, String novelId);

    int countByNovelId(String novelId);

    int countByVolumeId(String volumeId);

    @Query("""
        SELECT c FROM ChapterEntity c
        LEFT JOIN VolumeEntity v ON c.volumeId = v.id
        WHERE c.novelId = :novelId
        ORDER BY COALESCE(v.sortOrder, 999999) ASC, c.sortOrder ASC, c.createdAt ASC
        """)
    List<ChapterEntity> findByNovelIdOrderedWithVolumes(@Param("novelId") String novelId);

    @Query("""
        SELECT c FROM ChapterEntity c
        WHERE c.novelId = :novelId
          AND (
            LOWER(c.title) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(c.summary) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(c.content) LIKE LOWER(CONCAT('%', :query, '%'))
          )
        ORDER BY c.sortOrder ASC
        """)
    List<ChapterEntity> searchByNovelId(
        @Param("novelId") String novelId,
        @Param("query") String query
    );
}
