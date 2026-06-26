package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.dto.ChapterVersionDTO;
import cn.novelstudio.module.content.entity.ChapterEntity;
import cn.novelstudio.module.content.entity.ChapterVersionEntity;
import cn.novelstudio.module.content.repository.ChapterRepository;
import cn.novelstudio.module.content.repository.ChapterVersionRepository;
import cn.novelstudio.module.content.repository.NovelRepository;
import cn.novelstudio.module.content.support.ContentExceptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
            .orElseThrow(ContentExceptions::versionNotFound);
        if (!chapterId.equals(version.getChapterId())) {
            throw ContentExceptions.badRequest("content.chapter.version_mismatch");
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
            .orElseThrow(ContentExceptions::chapterNotFound);
        novelRepository.findByIdAndUserId(entity.getNovelId(), userId)
            .orElseThrow(ContentExceptions::novelNotFound);
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
