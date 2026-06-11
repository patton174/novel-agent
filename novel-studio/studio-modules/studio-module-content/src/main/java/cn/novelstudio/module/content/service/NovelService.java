package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.dto.CreateNovelRequest;
import cn.novelstudio.module.content.dto.NovelDTO;
import cn.novelstudio.module.content.dto.UpdateNovelRequest;
import cn.novelstudio.module.content.entity.NovelEntity;
import cn.novelstudio.module.content.repository.NovelRepository;
import cn.novelstudio.module.content.support.ContentExceptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NovelService {

    private final NovelRepository novelRepository;
    private final VolumeService volumeService;

    public List<NovelDTO> listNovels(Long userId) {
        return novelRepository.findByUserIdOrderByUpdatedAtDesc(userId)
            .stream()
            .map(this::toDto)
            .toList();
    }

    public NovelDTO getNovel(Long userId, String novelId) {
        return toDto(findOwned(userId, novelId));
    }

    @Transactional
    public NovelDTO createNovel(Long userId, CreateNovelRequest request) {
        NovelEntity entity = new NovelEntity();
        entity.setUserId(userId);
        entity.setTitle(request.title().trim());
        entity.setDescription(request.description());
        entity.setGenre(request.genre());
        entity.setStyle(request.style());
        if (request.targetChapterWords() != null) {
            entity.setTargetChapterWords(request.targetChapterWords());
        }
        NovelEntity saved = novelRepository.save(entity);
        volumeService.createDefaultVolume(saved.getId());
        return toDto(saved);
    }

    @Transactional
    public NovelDTO updateNovel(Long userId, String novelId, UpdateNovelRequest request) {
        NovelEntity entity = findOwned(userId, novelId);
        if (request.title() != null && !request.title().isBlank()) {
            entity.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            entity.setDescription(request.description());
        }
        if (request.genre() != null) {
            entity.setGenre(request.genre());
        }
        if (request.style() != null) {
            entity.setStyle(request.style());
        }
        if (request.targetChapterWords() != null) {
            entity.setTargetChapterWords(request.targetChapterWords());
        }
        return toDto(novelRepository.save(entity));
    }

    @Transactional
    public void deleteNovel(Long userId, String novelId) {
        NovelEntity entity = findOwned(userId, novelId);
        novelRepository.delete(entity);
    }

    private NovelEntity findOwned(Long userId, String novelId) {
        return novelRepository.findByIdAndUserId(novelId, userId)
            .orElseThrow(ContentExceptions::novelNotFound);
    }

    private NovelDTO toDto(NovelEntity entity) {
        return new NovelDTO(
            entity.getId(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getGenre(),
            entity.getStyle(),
            entity.getTargetChapterWords() == null ? 3000 : entity.getTargetChapterWords(),
            entity.getCoverUrl(),
            entity.getCreatedAt().toEpochMilli(),
            entity.getUpdatedAt().toEpochMilli()
        );
    }
}
