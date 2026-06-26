package cn.novelstudio.platform.scheduling.batch;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/** 最近批量任务历史（Redis list，最多保留 {@link #MAX} 条）。 */
@Component
@RequiredArgsConstructor
public class BatchJobHistoryStore {

    static final int MAX = 40;
    static final String KEY = "studio:batch:history";

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public void append(BatchJobHistoryEntry entry) {
        try {
            redis.opsForList().leftPush(KEY, objectMapper.writeValueAsString(entry));
            redis.opsForList().trim(KEY, 0, MAX - 1);
        } catch (Exception ignored) {
            // 历史记录失败不阻断主流程
        }
    }

    public List<BatchJobHistoryEntry> recent(int limit) {
        int n = Math.max(1, Math.min(limit, MAX));
        List<String> raw = redis.opsForList().range(KEY, 0, n - 1);
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        List<BatchJobHistoryEntry> out = new ArrayList<>(raw.size());
        for (String line : raw) {
            try {
                out.add(objectMapper.readValue(line, BatchJobHistoryEntry.class));
            } catch (Exception ignored) {
                // skip corrupt entry
            }
        }
        return out;
    }
}
