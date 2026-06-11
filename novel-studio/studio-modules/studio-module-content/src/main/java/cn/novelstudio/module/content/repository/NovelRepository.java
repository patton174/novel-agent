package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.NovelEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface NovelRepository extends JpaRepository<NovelEntity, String> {
    List<NovelEntity> findByUserIdOrderByUpdatedAtDesc(Long userId);

    Optional<NovelEntity> findByIdAndUserId(String id, Long userId);

    long countByUserId(Long userId);

    @Query("SELECT COUNT(n) FROM NovelEntity n")
    long countAll();
}
