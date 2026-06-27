package cn.novelstudio.module.upload.service;

import cn.novelstudio.module.upload.bridge.UploadCatalogBridge;
import cn.novelstudio.module.upload.client.UploadNotificationClient;
import cn.novelstudio.module.upload.support.UploadExceptions;
import cn.novelstudio.module.upload.dto.UploadFileDTO;
import cn.novelstudio.module.upload.entity.UploadedFileEntity;
import cn.novelstudio.module.upload.repository.UploadedFileRepository;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import cn.novelstudio.platform.messaging.upload.FileParseMessage;
import cn.novelstudio.platform.i18n.ResultLocalizer;
import cn.novelstudio.platform.storage.StorageBackend;
import cn.novelstudio.platform.storage.UploadStorageProperties;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class UploadService {

    private static final Duration PROGRESS_TTL = Duration.ofHours(1);
    private static final String PROGRESS_KEY_PREFIX = "parse:progress:";

    private final UploadedFileRepository fileRepo;
    private final UploadCatalogBridge catalogBridge;
    private final StorageBackend storage;
    private final UploadStorageProperties props;
    private final ObjectProvider<IMessageProducer> producerProvider;
    private final StringRedisTemplate redis;
    private final ResultLocalizer resultLocalizer;
    private final UploadNotificationClient notificationClient;

    public UploadService(UploadedFileRepository fileRepo,
                         UploadCatalogBridge catalogBridge,
                         StorageBackend storage,
                         UploadStorageProperties props,
                         ObjectProvider<IMessageProducer> producerProvider,
                         StringRedisTemplate redis,
                         ResultLocalizer resultLocalizer,
                         @Autowired(required = false) UploadNotificationClient notificationClient) {
        this.fileRepo = fileRepo;
        this.catalogBridge = catalogBridge;
        this.storage = storage;
        this.props = props;
        this.producerProvider = producerProvider;
        this.redis = redis;
        this.resultLocalizer = resultLocalizer;
        this.notificationClient = notificationClient;
    }

    public String resolveFormat(String originalName) {
        int dot = originalName.lastIndexOf('.');
        if (dot < 0) {
            throw UploadExceptions.missingExtension();
        }
        String ext = originalName.substring(dot + 1).toLowerCase();
        if (!props.getAllowedFormats().contains(ext)) {
            throw UploadExceptions.formatUnsupported(ext);
        }
        return "markdown".equals(ext) ? "md" : ext;
    }

    public String buildStorageKey(String originalName) {
        String ext = originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase();
        String date = LocalDate.now(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        return date + "/" + UUID.randomUUID() + "." + ext;
    }

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
            localizeParseError(e.getParseError()),
            e.getCatalogNovelId(),
            e.getCreatedAt() == null ? null : e.getCreatedAt().toEpochMilli()
        );
    }

    public UploadedFileEntity requireOwned(String fileId, Long ownerId, String ownerType) {
        UploadedFileEntity e = fileRepo.findById(fileId)
            .orElseThrow(UploadExceptions::fileNotFound);
        if ("user".equals(ownerType) && !Objects.equals(e.getOwnerId(), ownerId)) {
            throw UploadExceptions.fileForbidden();
        }
        return e;
    }

    @Transactional
    public void delete(UploadedFileEntity e) {
        storage.delete(e.getStorageKey());
        fileRepo.delete(e);
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
        JsonNode errorNode = result == null ? null : result.path("error");
        if (errorNode != null && !errorNode.isNull() && !errorNode.asText("").isBlank()) {
            e.setStatus("failed");
            JsonNode detailNode = result.path("detail");
            String detail = (detailNode == null || detailNode.isNull()) ? "" : detailNode.asText("");
            e.setParseError(errorNode.asText() + (detail.isEmpty() ? "" : ": " + detail));
            fileRepo.save(e);
            return;
        }
        if (e.getCatalogNovelId() != null && catalogBridge.catalogExists(e.getCatalogNovelId())) {
            e.setStatus("ready");
            fileRepo.save(e);
            setProgress(fileId, 100);
            notifyUploadComplete(e, fileId);
            return;
        }
        String catalogNovelId = catalogBridge.importParsedUpload(fileId, e.getOwnerId(), e.getOriginalName(), result);
        e.setCatalogNovelId(catalogNovelId);
        e.setStatus("ready");
        fileRepo.save(e);
        setProgress(fileId, 100);
        notifyUploadComplete(e, fileId);
    }

    private void notifyUploadComplete(UploadedFileEntity e, String fileId) {
        if (notificationClient != null && e.getOwnerId() != null) {
            notificationClient.sendUploadComplete(
                e.getOwnerId(),
                fileId,
                e.getCatalogNovelId(),
                e.getOriginalName()
            );
        }
    }

    @Transactional
    public void markFailed(String fileId, String error) {
        fileRepo.findById(fileId).ifPresent(e -> {
            e.setStatus("failed");
            e.setParseError(error);
            fileRepo.save(e);
        });
    }

    @Transactional
    public int reapStale(long timeoutSeconds) {
        Instant before = Instant.now().minusSeconds(timeoutSeconds);
        List<UploadedFileEntity> stale = fileRepo.findByStatusInAndUpdatedAtBefore(
            List.of("parsing", "pending"), before);
        for (UploadedFileEntity e : stale) {
            e.setStatus("failed");
            e.setParseError("upload.parse_timeout|" + timeoutSeconds);
            fileRepo.save(e);
        }
        return stale.size();
    }

    private String localizeParseError(String stored) {
        if (stored == null || stored.isBlank()) {
            return stored;
        }
        int sep = stored.indexOf('|');
        if (sep > 0) {
            String key = stored.substring(0, sep);
            String arg = stored.substring(sep + 1);
            if (key.matches("^[a-z][a-z0-9_.]*$")) {
                return resultLocalizer.resolveLiteral(key, arg);
            }
        }
        return resultLocalizer.resolveLiteral(stored);
    }
}
