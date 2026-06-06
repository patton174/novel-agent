package com.novel.agent.content.service;

import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.BizException;
import com.novel.agent.common.image.PythonImageClient;
import com.novel.agent.common.image.GeneratedImage;
import com.novel.agent.common.image.config.ImageClientProperties;
import com.novel.agent.content.dto.NovelDTO;
import com.novel.agent.content.entity.NovelEntity;
import com.novel.agent.content.repository.NovelRepository;
import com.novel.agent.content.support.ContentExceptions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NovelCoverService {

    private final NovelRepository novelRepository;
    private final PythonImageClient pythonImageClient;
    private final ImageClientProperties imageClientProperties;

    @Transactional
    public NovelDTO generateCover(Long userId, String novelId) {
        if (!pythonImageClient.enabled()) {
            throw BizException.of(ResultCode.IMAGE_GENERATION_FAILED, "图像生成服务未配置");
        }
        NovelEntity entity = novelRepository.findByIdAndUserId(novelId, userId)
            .orElseThrow(ContentExceptions::novelNotFound);

        String prompt = buildCoverPrompt(entity);
        GeneratedImage image = pythonImageClient.textToImage(
            prompt,
            imageClientProperties.getCoverSize(),
            false
        );
        if (!image.hasUrl()) {
            log.warn("封面生图未返回 URL novelId={}", novelId);
            throw BizException.of(ResultCode.IMAGE_GENERATION_FAILED);
        }
        entity.setCoverUrl(image.url());
        NovelEntity saved = novelRepository.save(entity);
        return toDto(saved);
    }

    private String buildCoverPrompt(NovelEntity entity) {
        StringBuilder sb = new StringBuilder();
        sb.append("Professional book cover illustration for a novel titled \"")
            .append(entity.getTitle().trim())
            .append("\"");
        if (entity.getGenre() != null && !entity.getGenre().isBlank()) {
            sb.append(", genre: ").append(entity.getGenre().trim());
        }
        if (entity.getStyle() != null && !entity.getStyle().isBlank()) {
            sb.append(", style: ").append(entity.getStyle().trim());
        }
        if (entity.getDescription() != null && !entity.getDescription().isBlank()) {
            String desc = entity.getDescription().trim();
            if (desc.length() > 200) {
                desc = desc.substring(0, 200);
            }
            sb.append(", theme: ").append(desc);
        }
        sb.append(
            ", vertical composition, cinematic lighting, rich colors, no text overlay, no watermark, high quality book cover art"
        );
        return sb.toString();
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
