package com.novel.agent.content.repository;

import com.novel.agent.content.entity.ChapterVersionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChapterVersionRepository extends JpaRepository<ChapterVersionEntity, String> {
    List<ChapterVersionEntity> findByChapterIdOrderByCreatedAtDesc(String chapterId);
}
