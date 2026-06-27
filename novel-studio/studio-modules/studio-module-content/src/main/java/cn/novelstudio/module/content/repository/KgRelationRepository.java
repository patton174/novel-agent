package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.KgRelationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface KgRelationRepository extends JpaRepository<KgRelationEntity, String> {

    List<KgRelationEntity> findByNovelId(String novelId);

    List<KgRelationEntity> findByNovelIdAndSrcName(String novelId, String srcName);

    @Modifying
    @Query("DELETE FROM KgRelationEntity r WHERE r.novelId = :novelId")
    void deleteByNovelId(String novelId);
}
