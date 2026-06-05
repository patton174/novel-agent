package com.novel.agent.content.service;

import com.novel.agent.content.dto.CreateVolumeRequest;
import com.novel.agent.content.dto.UpdateVolumeRequest;
import com.novel.agent.content.dto.VolumeDTO;
import com.novel.agent.content.entity.ChapterEntity;
import com.novel.agent.content.entity.VolumeEntity;
import com.novel.agent.content.repository.ChapterRepository;
import com.novel.agent.content.repository.NovelRepository;
import com.novel.agent.content.repository.VolumeRepository;
import com.novel.agent.content.support.ContentExceptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VolumeService {

    private final VolumeRepository volumeRepository;
    private final ChapterRepository chapterRepository;
    private final NovelRepository novelRepository;

    @Transactional
    public List<VolumeDTO> listVolumes(Long userId, String novelId) {
        assertNovelOwned(userId, novelId);
        ensureDefaultVolume(novelId);
        return volumeRepository.findByNovelIdOrderBySortOrderAscCreatedAtAsc(novelId)
            .stream()
            .map(this::toDto)
            .toList();
    }

    @Transactional
    public VolumeDTO createVolume(Long userId, String novelId, CreateVolumeRequest request) {
        assertNovelOwned(userId, novelId);
        VolumeEntity entity = new VolumeEntity();
        entity.setNovelId(novelId);
        entity.setTitle(request.title().trim());
        entity.setDescription(request.description());
        if (request.sortOrder() != null) {
            entity.setSortOrder(request.sortOrder());
        } else {
            entity.setSortOrder(volumeRepository.countByNovelId(novelId) + 1);
        }
        return toDto(volumeRepository.save(entity));
    }

    @Transactional
    public VolumeDTO updateVolume(Long userId, String volumeId, UpdateVolumeRequest request) {
        VolumeEntity entity = findOwnedVolume(userId, volumeId);
        if (request.title() != null && !request.title().isBlank()) {
            entity.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            entity.setDescription(request.description());
        }
        if (request.sortOrder() != null) {
            entity.setSortOrder(request.sortOrder());
        }
        return toDto(volumeRepository.save(entity));
    }

    @Transactional
    public List<VolumeDTO> reorderVolumes(Long userId, String novelId, List<String> volumeIds) {
        assertNovelOwned(userId, novelId);
        ensureDefaultVolume(novelId);
        List<VolumeEntity> existing = volumeRepository.findByNovelIdOrderBySortOrderAscCreatedAtAsc(novelId);
        if (volumeIds.size() != existing.size()) {
            throw ContentExceptions.badRequest("卷列表不完整");
        }
        java.util.Set<String> expected = existing.stream()
            .map(VolumeEntity::getId)
            .collect(java.util.stream.Collectors.toSet());
        if (!expected.equals(new java.util.HashSet<>(volumeIds))) {
            throw ContentExceptions.badRequest("卷 ID 不匹配");
        }
        for (int i = 0; i < volumeIds.size(); i++) {
            VolumeEntity entity = volumeRepository.findByIdAndNovelId(volumeIds.get(i), novelId)
                .orElseThrow(ContentExceptions::volumeNotFound);
            entity.setSortOrder(i + 1);
            volumeRepository.save(entity);
        }
        return listVolumes(userId, novelId);
    }

    @Transactional
    public void deleteVolume(Long userId, String volumeId) {
        VolumeEntity entity = findOwnedVolume(userId, volumeId);
        if (volumeRepository.countByNovelId(entity.getNovelId()) <= 1) {
            throw ContentExceptions.badRequest("至少保留一卷");
        }
        VolumeEntity fallback = volumeRepository.findByNovelIdOrderBySortOrderAscCreatedAtAsc(entity.getNovelId())
            .stream()
            .filter(v -> !v.getId().equals(volumeId))
            .findFirst()
            .orElseThrow(() -> ContentExceptions.badRequest("至少保留一卷"));
        for (ChapterEntity chapter : chapterRepository.findByVolumeIdOrderBySortOrderAscCreatedAtAsc(volumeId)) {
            chapter.setVolumeId(fallback.getId());
            chapterRepository.save(chapter);
        }
        volumeRepository.delete(entity);
    }

    @Transactional
    public VolumeEntity ensureDefaultVolume(String novelId) {
        List<VolumeEntity> volumes = volumeRepository.findByNovelIdOrderBySortOrderAscCreatedAtAsc(novelId);
        VolumeEntity defaultVolume;
        if (volumes.isEmpty()) {
            VolumeEntity entity = new VolumeEntity();
            entity.setNovelId(novelId);
            entity.setTitle("第一卷");
            entity.setSortOrder(1);
            defaultVolume = volumeRepository.save(entity);
        } else {
            defaultVolume = volumes.get(0);
        }
        migrateOrphanChapters(novelId, defaultVolume.getId());
        return defaultVolume;
    }

    public VolumeEntity resolveVolume(Long userId, String novelId, String volumeId) {
        assertNovelOwned(userId, novelId);
        VolumeEntity defaultVolume = ensureDefaultVolume(novelId);
        if (volumeId == null || volumeId.isBlank()) {
            return defaultVolume;
        }
        return volumeRepository.findByIdAndNovelId(volumeId, novelId)
            .orElse(defaultVolume);
    }

    @Transactional
    public VolumeEntity createDefaultVolume(String novelId) {
        return ensureDefaultVolume(novelId);
    }

    public VolumeEntity findOwnedVolumeEntity(Long userId, String volumeId) {
        return findOwnedVolume(userId, volumeId);
    }

    private void migrateOrphanChapters(String novelId, String volumeId) {
        for (ChapterEntity chapter : chapterRepository.findByNovelIdAndVolumeIdIsNull(novelId)) {
            chapter.setVolumeId(volumeId);
            chapterRepository.save(chapter);
        }
    }

    private VolumeEntity findOwnedVolume(Long userId, String volumeId) {
        VolumeEntity entity = volumeRepository.findById(volumeId)
            .orElseThrow(ContentExceptions::volumeNotFound);
        assertNovelOwned(userId, entity.getNovelId());
        return entity;
    }

    private void assertNovelOwned(Long userId, String novelId) {
        novelRepository.findByIdAndUserId(novelId, userId)
            .orElseThrow(ContentExceptions::novelNotFound);
    }

    private VolumeDTO toDto(VolumeEntity entity) {
        int chapterCount = chapterRepository.countByVolumeId(entity.getId());
        return new VolumeDTO(
            entity.getId(),
            entity.getNovelId(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getSortOrder() == null ? 0 : entity.getSortOrder(),
            chapterCount,
            entity.getCreatedAt().toEpochMilli(),
            entity.getUpdatedAt().toEpochMilli()
        );
    }
}
