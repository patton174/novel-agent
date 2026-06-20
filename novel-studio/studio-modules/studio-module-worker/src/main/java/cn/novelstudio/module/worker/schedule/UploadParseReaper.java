package cn.novelstudio.module.worker.schedule;

import cn.novelstudio.module.content.service.UploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 兜底回收：python 异步解析回调丢失 / 后台任务死亡时，文件会永久卡在 parsing。
 * 每 2 分钟扫一次，将超过 {@link #TIMEOUT_SECONDS} 无进展的 parsing/pending 置 failed。
 *
 * <p>需 @EnableScheduling（已在 NovelStudioApplication 开启）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UploadParseReaper {

    /** 解析超时阈值（秒）。python 大文件解析 + 回调应在 10 分钟内完成。 */
    static final long TIMEOUT_SECONDS = 600;

    private final UploadService uploadService;

    @Scheduled(fixedDelayString = "${worker.upload.reaper-interval-ms:120000}",
               initialDelayString = "${worker.upload.reaper-initial-ms:120000}")
    public void reap() {
        try {
            int n = uploadService.reapStale(TIMEOUT_SECONDS);
            if (n > 0) {
                log.warn("upload parse reaper: marked {} stale file(s) failed", n);
            }
        } catch (Exception e) {
            log.warn("upload parse reaper failed: {}", e.getMessage());
        }
    }
}
