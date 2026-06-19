package cn.novelstudio.module.content.service;

import cn.novelstudio.kernel.tools.IdWorker;
import cn.novelstudio.module.content.entity.CrawlCatalogChapterEntity;
import cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity;
import cn.novelstudio.module.content.entity.UploadedFileEntity;
import cn.novelstudio.module.content.repository.CrawlCatalogChapterRepository;
import cn.novelstudio.module.content.repository.CrawlCatalogNovelRepository;
import cn.novelstudio.module.content.repository.UploadedFileRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 上传文件解析回写：建 catalog novel + 章节，更新 uploaded_file 状态与进度。
 *
 * <p>本 worktree 为最小实现（仅 finalizeParse / markParsing / setProgress），
 * 完整上传/配额/控制器逻辑由 Part 1 提供，合并后对齐。
 */
@Service
public class UploadService {

    private static final Logger log = LoggerFactory.getLogger(UploadService.class);

    private final UploadedFileRepository fileRepo;
    private final CrawlCatalogNovelRepository catalogRepo;
    private final CrawlCatalogChapterRepository catalogChapterRepo;
    private final StringRedisTemplate redis;

    public UploadService(UploadedFileRepository fileRepo,
                         CrawlCatalogNovelRepository catalogRepo,
                         CrawlCatalogChapterRepository catalogChapterRepo,
                         StringRedisTemplate redis) {
        this.fileRepo = fileRepo;
        this.catalogRepo = catalogRepo;
        this.catalogChapterRepo = catalogChapterRepo;
        this.redis = redis;
    }

    @Transactional
    public void markParsing(String fileId) {
        fileRepo.findById(fileId).ifPresent(e -> {
            e.setStatus("parsing");
            fileRepo.save(e);
        });
    }

    @Transactional
    public void finalizeParse(String fileId, JsonNode result) {
        UploadedFileEntity e = fileRepo.findById(fileId).orElseThrow();
        if (result.has("error")) {
            e.setStatus("failed");
            e.setParseError(result.path("error").asText()
                + (result.has("detail") ? ": " + result.path("detail").asText() : ""));
            fileRepo.save(e);
            return;
        }
        // 幂等：已有 catalog 则跳过新建
        if (e.getCatalogNovelId() != null && catalogRepo.existsById(e.getCatalogNovelId())) {
            e.setStatus("ready");
            fileRepo.save(e);
            setProgress(fileId, 100);
            return;
        }
        // 建 catalog novel
        CrawlCatalogNovelEntity novel = new CrawlCatalogNovelEntity();
        novel.setTitle(result.path("title").asText(e.getOriginalName()));
        novel.setOwnerId(e.getOwnerId());
        novel.setSource("upload");
        novel.setUploaderFileId(fileId);
        novel.setChapterCount(0);
        novel = catalogRepo.save(novel);

        // 写章节（python 的 ParseResult 总是带 chapters 数组，可能为空）
        ArrayNode chapters = (ArrayNode) result.path("chapters");
        int idx = 1;
        if (chapters != null && !chapters.isEmpty()) {
            for (JsonNode ch : chapters) {
                CrawlCatalogChapterEntity c = new CrawlCatalogChapterEntity();
                c.setId(IdWorker.nextIdStr());
                c.setCatalogNovelId(novel.getId());
                c.setTitle(ch.path("title").asText("第" + idx + "章"));
                c.setContent(ch.path("content").asText(""));
                c.setSortOrder(ch.path("sort_order").asInt(idx));
                c.setWordCount(c.getContent().length());
                catalogChapterRepo.save(c);
                idx++;
            }
            novel.setChapterCount(idx - 1);
        } else {
            // text 单章
            String text = result.path("text").asText("");
            CrawlCatalogChapterEntity c = new CrawlCatalogChapterEntity();
            c.setId(IdWorker.nextIdStr());
            c.setCatalogNovelId(novel.getId());
            c.setTitle(e.getOriginalName());
            c.setContent(text);
            c.setSortOrder(1);
            c.setWordCount(text.length());
            catalogChapterRepo.save(c);
            novel.setChapterCount(1);
        }
        catalogRepo.save(novel);
        e.setCatalogNovelId(novel.getId());
        e.setStatus("ready");
        fileRepo.save(e);
        setProgress(fileId, 100);
    }

    /** 写解析进度到 Redis（非关键，失败不阻断解析）。 */
    private void setProgress(String fileId, int pct) {
        try {
            redis.opsForValue().set("parse:progress:" + fileId, String.valueOf(pct));
        } catch (Exception ex) {
            log.warn("set parse progress failed fileId={} err={}", fileId, ex.getMessage());
        }
    }
}
