package com.novel.agent.content.service;

import com.novel.agent.content.dto.ReindexStatusDTO;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

@Service
public class ReindexJobService {

    private final ConcurrentHashMap<String, JobState> jobs = new ConcurrentHashMap<>();

    public ReindexStatusDTO start(String novelId, int chapters) {
        JobState job = new JobState(novelId, chapters, System.currentTimeMillis());
        jobs.put(novelId, job);
        return toDto(job);
    }

    public ReindexStatusDTO getStatus(String novelId) {
        JobState job = jobs.get(novelId);
        if (job == null) {
            return idle(novelId);
        }
        return toDto(job);
    }

    public boolean isRunning(String novelId) {
        JobState job = jobs.get(novelId);
        return job != null && "running".equals(job.status);
    }

    public void updateProgress(String novelId, int processed, int indexed) {
        JobState job = jobs.get(novelId);
        if (job == null || !"running".equals(job.status)) {
            return;
        }
        job.processed = processed;
        job.indexed = indexed;
    }

    public void complete(String novelId, int indexed) {
        JobState job = jobs.get(novelId);
        if (job == null) {
            return;
        }
        job.status = "completed";
        job.indexed = indexed;
        job.processed = job.chapters;
        job.finishedAt = System.currentTimeMillis();
    }

    public void fail(String novelId, String error) {
        JobState job = jobs.get(novelId);
        if (job == null) {
            return;
        }
        job.status = "failed";
        job.error = error == null ? "unknown" : error;
        job.finishedAt = System.currentTimeMillis();
    }

    private static ReindexStatusDTO idle(String novelId) {
        return new ReindexStatusDTO(true, "idle", novelId, 0, 0, 0, null, 0L, null);
    }

    private static ReindexStatusDTO toDto(JobState job) {
        return new ReindexStatusDTO(
            true,
            job.status,
            job.novelId,
            job.chapters,
            job.indexed,
            job.processed,
            job.error,
            job.startedAt,
            job.finishedAt
        );
    }

    private static final class JobState {
        private final String novelId;
        private final int chapters;
        private final long startedAt;
        private String status = "running";
        private int indexed;
        private int processed;
        private String error;
        private Long finishedAt;

        private JobState(String novelId, int chapters, long startedAt) {
            this.novelId = novelId;
            this.chapters = chapters;
            this.startedAt = startedAt;
        }
    }
}
