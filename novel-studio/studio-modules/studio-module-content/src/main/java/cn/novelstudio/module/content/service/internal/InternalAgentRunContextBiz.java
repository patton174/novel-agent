package cn.novelstudio.module.content.service.internal;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.content.service.auth.biz.AuthNovelAgentContextBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class InternalAgentRunContextBiz {

    private final AuthNovelAgentContextBiz novelAgentContextBiz;

    public Map<String, Object> aggregate(
        Long userId,
        String novelId,
        String chapterId,
        String sessionId
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        Map<String, Object> novelContext = Map.of();
        if (userId != null && userId > 0 && novelId != null && !novelId.isBlank()) {
            Result<Map<String, Object>> novelResult = novelAgentContextBiz.buildContext(
                userId,
                novelId,
                chapterId
            );
            if (novelResult != null && novelResult.data() != null) {
                novelContext = novelResult.data();
            }
        }
        body.put("novelContext", novelContext);
        body.put("history", List.of());
        if (sessionId != null && !sessionId.isBlank()) {
            body.put("sessionId", sessionId);
        }
        return body;
    }
}
