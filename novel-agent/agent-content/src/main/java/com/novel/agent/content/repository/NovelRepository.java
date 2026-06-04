package com.novel.agent.content.repository;

import com.novel.agent.content.entity.NovelEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NovelRepository extends JpaRepository<NovelEntity, String> {
    List<NovelEntity> findByUserIdOrderByUpdatedAtDesc(Long userId);

    Optional<NovelEntity> findByIdAndUserId(String id, Long userId);
}
