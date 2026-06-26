package cn.novelstudio.module.upload.batch;

import cn.novelstudio.module.upload.repository.UploadedFileRepository;
import cn.novelstudio.module.upload.service.UploadService;
import cn.novelstudio.platform.scheduling.batch.BatchJobEnvelope;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 批量重试 failed/pending 上传解析。
 * jobType: {@code upload.parse.retry}
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UploadParseRetryBatchHandler implements BatchJobHandler {

    public static final String JOB_TYPE = "upload.parse.retry";

    private final UploadedFileRepository fileRepo;
    private final UploadService uploadService;

    @Override
    public String jobType() {
        return JOB_TYPE;
    }

    @Override
    public void handle(BatchJobEnvelope envelope) {
        if (envelope.itemIds() == null || envelope.itemIds().isEmpty()) {
            return;
        }
        for (String fileId : envelope.itemIds()) {
            fileRepo.findById(fileId).ifPresent(e -> {
                if (!"failed".equals(e.getStatus()) && !"pending".equals(e.getStatus())) {
                    return;
                }
                e.setStatus("pending");
                e.setParseError(null);
                fileRepo.save(e);
                uploadService.publishParse(
                    e.getId(), e.getOwnerId(), e.getOwnerType(),
                    e.getStorageKey(), e.getFormat(), e.getOriginalName()
                );
                log.info("upload parse retry queued fileId={} batchId={}", fileId, envelope.batchId());
            });
        }
    }
}
