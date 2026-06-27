package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CrawlCatalogNovelRepository extends JpaRepository<CrawlCatalogNovelEntity, String> {

    Page<CrawlCatalogNovelEntity> findAllByOrderByUpdatedAtDesc(Pageable pageable);

    /** 公共书库（owner_id 为空，含管理员上传解析入库）。 */
    Page<CrawlCatalogNovelEntity> findByOwnerIdIsNullOrderByUpdatedAtDesc(Pageable pageable);

    @Query("""
        SELECT n FROM CrawlCatalogNovelEntity n
        WHERE n.coverUrl IS NULL OR n.coverUrl = ''
        ORDER BY n.updatedAt DESC
        """)
    Page<CrawlCatalogNovelEntity> findMissingCover(Pageable pageable);

    /** 用户私人书库（上传入库）按更新时间倒序。 */
    Page<CrawlCatalogNovelEntity> findByOwnerIdOrderByUpdatedAtDesc(Long ownerId, Pageable pageable);

    List<CrawlCatalogNovelEntity> findByOwnerId(Long ownerId);

    boolean existsByUploaderFileId(String uploaderFileId);

    @Query("SELECT n FROM CrawlCatalogNovelEntity n WHERE n.ownerId = :ownerId AND n.uploaderFileId = :fileId")
    Optional<CrawlCatalogNovelEntity> findByOwnerAndUploaderFile(Long ownerId, String fileId);

    /**
     * 我的书库：用户上传入库（owner_id=userId, source=upload） ∪ 用户收藏（user_library_collection）。
     */
    @Query("""
        SELECT DISTINCT n FROM CrawlCatalogNovelEntity n
        WHERE (n.ownerId = :userId AND n.source = 'upload')
           OR n.id IN (SELECT c.catalogNovelId FROM UserLibraryCollectionEntity c WHERE c.userId = :userId)
        ORDER BY n.updatedAt DESC
        """)
    Page<CrawlCatalogNovelEntity> findMyLibrary(@Param("userId") Long userId, Pageable pageable);
}
