package cn.novelstudio.module.content.service;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.module.content.dto.CoverPromptResponse;
import cn.novelstudio.module.content.dto.NovelDTO;
import cn.novelstudio.module.content.entity.NovelEntity;
import cn.novelstudio.module.content.client.BillingFeatureClient;
import cn.novelstudio.module.content.repository.NovelRepository;
import cn.novelstudio.module.content.support.ContentExceptions;
import cn.novelstudio.platform.media.PythonImageClient;
import cn.novelstudio.platform.media.GeneratedImage;
import cn.novelstudio.platform.media.config.ImageClientProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.OutputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class NovelCoverService {

    private final NovelRepository novelRepository;
    private final PythonImageClient pythonImageClient;
    private final ImageClientProperties imageClientProperties;
    private final CoverPromptClient coverPromptClient;
    private final BillingFeatureClient billingFeatureClient;
    private final NovelCoverStorageService coverStorageService;

    public CoverPromptResponse suggestCoverPrompt(
        Long userId,
        String novelId,
        String styleDraft,
        String sceneDraft,
        String draft,
        String mode
    ) {
        NovelEntity entity = novelRepository.findByIdAndUserId(novelId, userId)
            .orElseThrow(ContentExceptions::novelNotFound);
        return coverPromptClient.suggestPrompt(entity, styleDraft, sceneDraft, draft, mode);
    }

    public void streamCoverPrompt(
        Long userId,
        String novelId,
        String styleDraft,
        String sceneDraft,
        String draft,
        String mode,
        OutputStream outputStream
    ) {
        NovelEntity entity = novelRepository.findByIdAndUserId(novelId, userId)
            .orElseThrow(ContentExceptions::novelNotFound);
        coverPromptClient.streamPrompt(entity, styleDraft, sceneDraft, draft, mode, outputStream);
    }

    @Transactional
    public NovelDTO generateCover(
        Long userId,
        String novelId,
        String customPrompt,
        String stylePrompt,
        String scenePrompt
    ) {
        billingFeatureClient.assertFeature(userId, "custom_model");
        if (!pythonImageClient.enabled()) {
            throw BizException.keyed(ResultCode.IMAGE_GENERATION_FAILED, "content.image.service_not_configured");
        }
        NovelEntity entity = novelRepository.findByIdAndUserId(novelId, userId)
            .orElseThrow(ContentExceptions::novelNotFound);

        String prompt = resolveCoverPrompt(entity, customPrompt, stylePrompt, scenePrompt);
        log.info("封面生图 novelId={} title={} prompt={}", novelId, entity.getTitle(), prompt);
        GeneratedImage image = pythonImageClient.textToImage(
            prompt,
            imageClientProperties.getCoverSize(),
            true
        );
        if (!image.hasUrl() && !image.hasBase64()) {
            log.warn("封面生图未返回有效数据 novelId={}", novelId);
            throw BizException.keyed(ResultCode.IMAGE_GENERATION_FAILED, ResultCode.IMAGE_GENERATION_FAILED.getMessageKey());
        }

        String previousKey = entity.getCoverStorageKey();
        String storageKey = coverStorageService.saveCover(userId, novelId, image);
        entity.setCoverStorageKey(storageKey);
        entity.setCoverUrl(null);
        NovelEntity saved = novelRepository.save(entity);
        coverStorageService.deleteQuietly(previousKey);
        return toDto(saved);
    }

    static String resolveCoverPrompt(
        NovelEntity entity,
        String customPrompt,
        String stylePrompt,
        String scenePrompt
    ) {
        if (customPrompt != null && !customPrompt.isBlank()) {
            return customPrompt.trim();
        }
        String style = stylePrompt == null ? "" : stylePrompt.trim();
        String scene = scenePrompt == null ? "" : scenePrompt.trim();
        if (!style.isBlank() && !scene.isBlank()) {
            return style + ", " + scene;
        }
        if (!scene.isBlank()) {
            return scene;
        }
        if (!style.isBlank()) {
            return style;
        }
        return buildDefaultCoverPrompt(entity, null);
    }

    static NovelDTO toDto(NovelEntity entity) {
        return new NovelDTO(
            entity.getId(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getGenre(),
            entity.getStyle(),
            entity.getTargetChapterWords() == null ? 3000 : entity.getTargetChapterWords(),
            entity.getCoverUrl(),
            entity.getCoverStorageKey(),
            hasCover(entity),
            entity.getCreatedAt().toEpochMilli(),
            entity.getUpdatedAt().toEpochMilli()
        );
    }

    public static boolean hasCover(NovelEntity entity) {
        String key = entity.getCoverStorageKey();
        if (key != null && !key.isBlank()) {
            return true;
        }
        String url = entity.getCoverUrl();
        return url != null && !url.isBlank();
    }

    static String buildDefaultCoverPrompt(NovelEntity entity, String draft) {
        if (draft != null && !draft.isBlank()) {
            return draft.trim();
        }
        String title = entity.getTitle() == null ? "" : entity.getTitle().trim();
        String genre = entity.getGenre() == null ? "" : entity.getGenre().trim();
        String style = entity.getStyle() == null ? "" : entity.getStyle().trim();
        String desc = entity.getDescription() == null ? "" : entity.getDescription().trim();
        if (desc.length() > 200) {
            desc = desc.substring(0, 200);
        }
        String styleEn = "3d render, semi-realistic CG, game poster art, cinematic lighting, rim light, high contrast, vertical 9:16, fanqie web novel cover";
        String sceneZh = String.join(
            "，",
            "竖版9:16手机海报",
            "人物半身特写居中略偏下，眼神直视观众，情绪强烈",
            "3D半写实CG质感，深色渐变虚化背景，强边缘光丁达尔逆光，粒子光效",
            "画面上方三分之一横跨画幅超大加粗立体描金主标题",
            title.isBlank() ? "" : "《" + title + "》",
            "番茄小说流量封面高饱和高对比",
            genre.isBlank() ? "" : "品类：" + genre,
            style.isBlank() ? "" : "叙事：" + style,
            desc.isBlank() ? "" : "情绪：" + desc
        ).replaceAll("，+", "，").replaceAll("^，|，$", "");
        return styleEn + ", " + sceneZh;
    }
}
