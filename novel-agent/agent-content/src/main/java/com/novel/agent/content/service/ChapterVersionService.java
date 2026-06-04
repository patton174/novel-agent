package com.novel.agent.content.service;

import com.novel.agent.content.dto.ChapterVersionDTO;
import com.novel.agent.content.entity.ChapterEntity;
import com.novel.agent.content.entity.ChapterVersionEntity;
import com.novel.agent.content.repository.ChapterRepository;
import com.novel.agent.content.repository.ChapterVersionRepository;
import com.novel.agent.content.repository.NovelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChapterVersionService {

    private final ChapterVersionRepository versionRepository;
    private final ChapterRepository chapterRepository;
    private final NovelRepository novelRepository;

    public List<ChapterVersionDTO> listVersions(Long userId, String chapterId, int limit) {
        assertChapterOwned(userId, chapterId);
        int safeLimit = Math.max(1, Math.min(limit, 50));
        return versionRepository.findByChapterIdOrderByCreatedAtDesc(chapterId)
            .stream()
            .limit(safeLimit)
            .map(this::toDto)
            .toList();
    }

    public ChapterVersionEntity findOwnedVersion(Long userId, String chapterId, String versionId) {
        assertChapterOwned(userId, chapterId);
        ChapterVersionEntity version = versionRepository.findById(versionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "版本不存在"));
        if (!chapterId.equals(version.getChapterId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "版本与章节不匹配");
        }
        return version;
    }

    @Transactional
    public ChapterVersionDTO snapshot(ChapterEntity entity, String source) {
        ChapterVersionEntity version = new ChapterVersionEntity();
        version.setChapterId(entity.getId());
        version.setNovelId(entity.getNovelId());
        version.setTitle(entity.getTitle());
        version.setContent(entity.getContent() == null ? "" : entity.getContent());
        version.setSource(source == null || source.isBlank() ? "user" : source);
        return toDto(versionRepository.save(version));
    }

    private void assertChapterOwned(Long userId, String chapterId) {
        ChapterEntity entity = chapterRepository.findById(chapterId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "章节不存在"));
        novelRepository.findByIdAndUserId(entity.getNovelId(), userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "小说不存在"));
    }

    private ChapterVersionDTO toDto(ChapterVersionEntity entity) {
        return new ChapterVersionDTO(
            entity.getId(),
            entity.getChapterId(),
            entity.getNovelId(),
            entity.getTitle(),
            entity.getContent(),
            entity.getWordCount() == null ? 0 : entity.getWordCount(),
            entity.getSource(),
            entity.getCreatedAt().toEpochMilli()
        );
    }
}
