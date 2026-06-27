package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.KgEntityEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface KgEntityRepository extends JpaRepository<KgEntityEntity, String> {
    List<KgEntityEntity> findByNovelId(String novelId);

    Optional<KgEntityEntity> findByNovelIdAndName(String novelId, String name);

    boolean existsByNovelIdAndName(String novelId, String name);

    @Modifying
    @Query("DELETE FROM KgEntityEntity e WHERE e.novelId = :novelId")
    void deleteByNovelId(String novelId);
}
