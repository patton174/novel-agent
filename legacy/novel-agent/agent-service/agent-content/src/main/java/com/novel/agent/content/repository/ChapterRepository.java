package com.novel.agent.content.repository;

import com.novel.agent.content.entity.ChapterEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
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

    Optional<ChapterEntity> findFirstByNovelIdOrderByUpdatedAtDesc(String novelId);

    @Query("""
        SELECT COUNT(c) FROM ChapterEntity c
        JOIN NovelEntity n ON c.novelId = n.id
        WHERE n.userId = :userId
        """)
    long countByUserId(@Param("userId") Long userId);

    @Query("""
        SELECT COALESCE(SUM(COALESCE(c.wordCount, 0)), 0) FROM ChapterEntity c
        JOIN NovelEntity n ON c.novelId = n.id
        WHERE n.userId = :userId AND c.updatedAt >= :since
        """)
    long sumWordCountByUserIdSince(@Param("userId") Long userId, @Param("since") Instant since);

    @Query(value = """
        SELECT DATE(c.updated_at AT TIME ZONE 'UTC') AS edit_day,
               COALESCE(SUM(COALESCE(c.word_count, 0)), 0) AS word_sum
        FROM chapter c
        JOIN novel n ON c.novel_id = n.id
        WHERE n.user_id = :userId AND c.updated_at >= :since
        GROUP BY DATE(c.updated_at AT TIME ZONE 'UTC')
        ORDER BY edit_day
        """, nativeQuery = true)
    List<Object[]> sumDailyWordsByUserIdSince(@Param("userId") Long userId, @Param("since") Instant since);

    @Query("SELECT COUNT(c) FROM ChapterEntity c")
    long countAll();
}
