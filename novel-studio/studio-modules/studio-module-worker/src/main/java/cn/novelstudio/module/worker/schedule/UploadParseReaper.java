package cn.novelstudio.module.worker.schedule;

import cn.novelstudio.module.upload.service.UploadService;
import cn.novelstudio.platform.scheduling.StudioScheduledJob;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class UploadParseReaper implements StudioScheduledJob {

    static final long TIMEOUT_SECONDS = 600;

    private final UploadService uploadService;

    @Value("${worker.upload.reaper-interval-ms:120000}")
    private long reaperIntervalMs;

    @Value("${worker.upload.reaper-initial-ms:120000}")
    private long reaperInitialMs;

    @Override
    public String jobId() {
        return "upload-parse-reaper";
    }

    @Override
    public long initialDelayMs() {
        return reaperInitialMs;
    }

    @Override
    public long fixedDelayMs() {
        return reaperIntervalMs;
    }

    @Override
    public void run() {
        int n = uploadService.reapStale(TIMEOUT_SECONDS);
        if (n > 0) {
            log.warn("upload parse reaper: marked {} stale file(s) failed", n);
        }
    }
}
