package cn.novelstudio.module.content.service.crawl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.content.crawl.CrawlLogLevel;
import cn.novelstudio.module.content.service.crawl.dto.CrawlLogEntryDTO;
import cn.novelstudio.module.content.service.crawl.dto.CrawlLogsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlJobLogService {

    private static final String LIST_PREFIX = "crawl:log:list:";
    private static final String SEQ_PREFIX = "crawl:log:seq:";
    private static final String CHANNEL_PREFIX = "crawl:log:";
    private static final int MAX_ENTRIES = 1000;
    private static final Duration TTL = Duration.ofDays(7);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void append(String jobId, CrawlLogLevel level, String message) {
        if (jobId == null || jobId.isBlank() || message == null || message.isBlank()) {
            return;
        }
        String trimmed = message.trim();
        if (trimmed.length() > 2000) {
            trimmed = trimmed.substring(0, 2000) + "…";
        }
        try {
            long seq = nextSeq(jobId);
            CrawlLogEntryDTO entry = new CrawlLogEntryDTO(seq, level.name(), trimmed, System.currentTimeMillis());
            String json = objectMapper.writeValueAsString(entry);
            String listKey = listKey(jobId);
            redisTemplate.opsForList().rightPush(listKey, json);
            redisTemplate.expire(listKey, TTL);
            redisTemplate.expire(seqKey(jobId), TTL);
            redisTemplate.opsForList().trim(listKey, -MAX_ENTRIES, -1);
            redisTemplate.convertAndSend(channel(jobId), json);
        } catch (JsonProcessingException ex) {
            log.warn("序列化爬虫日志失败 jobId={}: {}", jobId, ex.getMessage());
        }
    }

    public CrawlLogsResponse listAfter(String jobId, long afterSeq) {
        List<String> raw = redisTemplate.opsForList().range(listKey(jobId), 0, -1);
        if (raw == null || raw.isEmpty()) {
            return new CrawlLogsResponse(List.of(), afterSeq);
        }
        List<CrawlLogEntryDTO> logs = new ArrayList<>();
        long maxSeq = afterSeq;
        for (String item : raw) {
            CrawlLogEntryDTO entry = parseEntry(item);
            if (entry == null) {
                continue;
            }
            if (entry.seq() > afterSeq) {
                logs.add(entry);
            }
            if (entry.seq() > maxSeq) {
                maxSeq = entry.seq();
            }
        }
        return new CrawlLogsResponse(logs, maxSeq);
    }

    public void clear(String jobId) {
        if (jobId == null || jobId.isBlank()) {
            return;
        }
        redisTemplate.delete(listKey(jobId));
        redisTemplate.delete(seqKey(jobId));
    }

    private long nextSeq(String jobId) {
        Long seq = redisTemplate.opsForValue().increment(seqKey(jobId));
        return seq == null ? 1L : seq;
    }

    private CrawlLogEntryDTO parseEntry(String json) {
        try {
            return objectMapper.readValue(json, CrawlLogEntryDTO.class);
        } catch (Exception ex) {
            return null;
        }
    }

    private static String listKey(String jobId) {
        return LIST_PREFIX + jobId;
    }

    private static String seqKey(String jobId) {
        return SEQ_PREFIX + jobId;
    }

    private static String channel(String jobId) {
        return CHANNEL_PREFIX + jobId;
    }
}
