package cn.novelstudio.platform.scheduling;

import org.springframework.stereotype.Component;

import java.util.List;

/** 运行时注册表：供管理台展示已启用的 {@link StudioScheduledJob}。 */
@Component
public class StudioJobCatalog {

    private final List<StudioScheduledJob> jobs;

    public StudioJobCatalog(List<StudioScheduledJob> jobs) {
        this.jobs = jobs;
    }

    public List<StudioJobDescriptor> list() {
        return jobs.stream()
            .map(job -> new StudioJobDescriptor(
                job.jobId(),
                job.initialDelayMs(),
                job.fixedDelayMs()
            ))
            .toList();
    }

    public record StudioJobDescriptor(String jobId, long initialDelayMs, long fixedDelayMs) {
    }
}
