package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.dto.UploadFileDTO;
import cn.novelstudio.module.content.entity.CrawlCatalogChapterEntity;
import cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity;
import cn.novelstudio.module.content.entity.UploadedFileEntity;
import cn.novelstudio.module.content.repository.CrawlCatalogChapterRepository;
import cn.novelstudio.module.content.repository.CrawlCatalogNovelRepository;
import cn.novelstudio.module.content.repository.UploadedFileRepository;
import cn.novelstudio.module.content.storage.StorageBackend;
import cn.novelstudio.module.content.storage.UploadStorageProperties;
import cn.novelstudio.kernel.tools.IdWorker;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import cn.novelstudio.platform.messaging.upload.FileParseMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import java.util.UUID;

/**
 * 上传编排：落盘 → 写元数据(pending) → 发 MQ；提供进度查询、删除、解析回写。
 *
 * <p>MQ 发送用 {@link ObjectProvider} 可选注入：MQ 未启用时保持 pending，不阻断上传。
 * {@link #finalizeParse} / {@link #markParsing} 由 Part 2 的 FileParseListener 调用。
 */
@Service
public class UploadService {

    private static final Duration PROGRESS_TTL = Duration.ofHours(1);
    private static final String PROGRESS_KEY_PREFIX = "parse:progress:";

    private final UploadedFileRepository fileRepo;
    private final CrawlCatalogNovelRepository catalogRepo;
    private final CrawlCatalogChapterRepository catalogChapterRepo;
    private final StorageBackend storage;
    private final UploadStorageProperties props;
    private final ObjectProvider<IMessageProducer> producerProvider;
    private final StringRedisTemplate redis;

    public UploadService(UploadedFileRepository fileRepo,
                         CrawlCatalogNovelRepository catalogRepo,
                         CrawlCatalogChapterRepository catalogChapterRepo,
                         StorageBackend storage,
                         UploadStorageProperties props,
                         ObjectProvider<IMessageProducer> producerProvider,
                         StringRedisTemplate redis) {
        this.fileRepo = fileRepo;
        this.catalogRepo = catalogRepo;
        this.catalogChapterRepo = catalogChapterRepo;
        this.storage = storage;
        this.props = props;
        this.producerProvider = producerProvider;
        this.redis = redis;
    }

    /** 解析文件名扩展名为归一化格式（markdown→md）；不支持的格式抛 IAE。 */
    public String resolveFormat(String originalName) {
        int dot = originalName.lastIndexOf('.');
        if (dot < 0) {
            throw new IllegalArgumentException("缺少文件扩展名");
        }
        String ext = originalName.substring(dot + 1).toLowerCase();
        if (!props.getAllowedFormats().contains(ext)) {
            throw new IllegalArgumentException("不支持的格式: " + ext);
        }
        return "markdown".equals(ext) ? "md" : ext;
    }

    /** 生成 dated + uuid 的存储 key（不含原始名，防路径信息泄露）。 */
    public String buildStorageKey(String originalName) {
        String ext = originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase();
        String date = LocalDate.now(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        return date + "/" + UUID.randomUUID() + "." + ext;
    }

    /** 落盘 + 写元数据(pending) + 发 MQ。返回 fileId。 */
    @Transactional
    public String createUpload(Long ownerId, String ownerType, String originalName,
                               String mimeType, long size, InputStream in, String format) {
        String key = buildStorageKey(originalName);
        storage.save(in, key);
        UploadedFileEntity e = new UploadedFileEntity();
        e.setOwnerId(ownerId);
        e.setOwnerType(ownerType);
        e.setOriginalName(originalName);
        e.setStorageKey(key);
        e.setMimeType(mimeType);
        e.setSizeBytes(size);
        e.setFormat(format);
        e.setStatus("pending");
        e = fileRepo.save(e);
        setProgress(e.getId(), 0);
        publishParse(e.getId(), ownerId, ownerType, key, format, originalName);
        return e.getId();
    }

    /** 发布解析 MQ 消息；MQ 未启用则静默（保持 pending）。 */
    public void publishParse(String fileId, Long ownerId, String ownerType,
                             String key, String format, String name) {
        IMessageProducer producer = producerProvider.getIfAvailable();
        if (producer == null) {
            return;
        }
        producer.send(MqTopic.FILE_PARSE, new FileParseMessage(fileId, ownerId, ownerType, key, format, name));
    }

    public void setProgress(String fileId, int pct) {
        redis.opsForValue().set(PROGRESS_KEY_PREFIX + fileId, String.valueOf(pct), PROGRESS_TTL);
    }

    public Integer getProgress(String fileId) {
        String v = redis.opsForValue().get(PROGRESS_KEY_PREFIX + fileId);
        if (v == null) {
            return null;
        }
        try {
            return Integer.parseInt(v);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** 实体 → 视图；parsing 时进度取 Redis，ready=100，pending=0。 */
    public UploadFileDTO toDto(UploadedFileEntity e) {
        Integer progress = null;
        if ("parsing".equals(e.getStatus())) {
            progress = getProgress(e.getId());
        } else if ("ready".equals(e.getStatus())) {
            progress = 100;
        } else if ("pending".equals(e.getStatus())) {
            progress = 0;
        }
        return new UploadFileDTO(
            e.getId(),
            e.getStatus(),
            progress,
            e.getOriginalName(),
            e.getSizeBytes(),
            e.getFormat(),
            e.getParseError(),
            e.getCatalogNovelId(),
            e.getCreatedAt() == null ? null : e.getCreatedAt().toEpochMilli()
        );
    }

    /** 校验文件归属：admin 可访问全部；user 只能访问自己的。 */
    public UploadedFileEntity requireOwned(String fileId, Long ownerId, String ownerType) {
        UploadedFileEntity e = fileRepo.findById(fileId)
            .orElseThrow(() -> new IllegalArgumentException("文件不存在"));
        if ("user".equals(ownerType) && !Objects.equals(e.getOwnerId(), ownerId)) {
            throw new IllegalArgumentException("无权访问该文件");
        }
        return e;
    }

    /** 删除文件（落盘 + 元数据）；已解析的 catalog 保留不级联。 */
    @Transactional
    public void delete(UploadedFileEntity e) {
        storage.delete(e.getStorageKey());
        fileRepo.delete(e);
    }

    /** 标记 parsing（由 FileParseListener 消费时调用）。 */
    @Transactional
    public void markParsing(String fileId) {
        fileRepo.findById(fileId).ifPresent(e -> {
            e.setStatus("parsing");
            fileRepo.save(e);
        });
    }

    /**
     * 解析回写：根据 python 返回结果建 catalog novel + 章节，置 ready/failed。
     * 幂等：已有 catalog 则仅置 ready。
     */
    @Transactional
    public void finalizeParse(String fileId, JsonNode result) {
        UploadedFileEntity e = fileRepo.findById(fileId).orElseThrow();
        if (result != null && result.has("error")) {
            e.setStatus("failed");
            String detail = result.has("detail") ? result.path("detail").asText() : "";
            e.setParseError(result.path("error").asText() + (detail.isEmpty() ? "" : ": " + detail));
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
        CrawlCatalogNovelEntity novel = new CrawlCatalogNovelEntity();
        novel.setTitle(result == null ? e.getOriginalName() : result.path("title").asText(e.getOriginalName()));
        novel.setOwnerId(e.getOwnerId());
        novel.setSource("upload");
        novel.setUploaderFileId(fileId);
        novel.setChapterCount(0);
        novel = catalogRepo.save(novel);

        int idx = 1;
        if (result != null && result.has("chapters") && result.path("chapters").isArray()) {
            ArrayNode chapters = (ArrayNode) result.path("chapters");
            if (!chapters.isEmpty()) {
                for (JsonNode ch : chapters) {
                    CrawlCatalogChapterEntity c = new CrawlCatalogChapterEntity();
                    c.setId(IdWorker.nextIdStr());
                    c.setCatalogNovelId(novel.getId());
                    c.setTitle(ch.path("title").asText("第" + idx + "章"));
                    c.setContent(ch.path("content").asText(""));
                    c.setSortOrder(ch.path("sort_order").asInt(idx));
                    catalogChapterRepo.save(c);
                    idx++;
                }
                novel.setChapterCount(idx - 1);
            }
        }
        if (idx == 1) {
            // 无章节：text 作为单章
            String text = result == null ? "" : result.path("text").asText("");
            CrawlCatalogChapterEntity c = new CrawlCatalogChapterEntity();
            c.setId(IdWorker.nextIdStr());
            c.setCatalogNovelId(novel.getId());
            c.setTitle(e.getOriginalName());
            c.setContent(text);
            c.setSortOrder(1);
            catalogChapterRepo.save(c);
            novel.setChapterCount(1);
        }
        catalogRepo.save(novel);
        e.setCatalogNovelId(novel.getId());
        e.setStatus("ready");
        fileRepo.save(e);
        setProgress(fileId, 100);
    }
}
