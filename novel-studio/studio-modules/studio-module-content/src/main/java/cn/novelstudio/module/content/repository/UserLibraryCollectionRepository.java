package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.UserLibraryCollectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserLibraryCollectionRepository
    extends JpaRepository<UserLibraryCollectionEntity, UserLibraryCollectionEntity.PK> {

    boolean existsByUserIdAndCatalogNovelId(Long userId, String catalogNovelId);

    long deleteByUserIdAndCatalogNovelId(Long userId, String catalogNovelId);
}
