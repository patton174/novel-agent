package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface CrawlCatalogNovelRepository extends JpaRepository<CrawlCatalogNovelEntity, String> {

    Page<CrawlCatalogNovelEntity> findAllByOrderByUpdatedAtDesc(Pageable pageable);

    @Query("""
        SELECT n FROM CrawlCatalogNovelEntity n
        WHERE n.coverUrl IS NULL OR n.coverUrl = ''
        ORDER BY n.updatedAt DESC
        """)
    Page<CrawlCatalogNovelEntity> findMissingCover(Pageable pageable);

    /** 用户私人书库（上传入库）按更新时间倒序。 */
    Page<CrawlCatalogNovelEntity> findByOwnerIdOrderByUpdatedAtDesc(Long ownerId, Pageable pageable);

    boolean existsByUploaderFileId(String uploaderFileId);

    @Query("SELECT n FROM CrawlCatalogNovelEntity n WHERE n.ownerId = :ownerId AND n.uploaderFileId = :fileId")
    Optional<CrawlCatalogNovelEntity> findByOwnerAndUploaderFile(Long ownerId, String fileId);
}
