package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity;
import cn.novelstudio.module.content.entity.UserLibraryCollectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserLibraryCollectionRepository
    extends JpaRepository<UserLibraryCollectionEntity, UserLibraryCollectionEntity.PK> {

    boolean existsByUserIdAndCatalogNovelId(Long userId, String catalogNovelId);

    long deleteByUserIdAndCatalogNovelId(Long userId, String catalogNovelId);

    @Query("""
        SELECT n FROM CrawlCatalogNovelEntity n
        WHERE n.id IN (SELECT c.catalogNovelId FROM UserLibraryCollectionEntity c WHERE c.userId = :userId)
        """)
    List<CrawlCatalogNovelEntity> findCatalogNovelsByUserId(@Param("userId") Long userId);
}
