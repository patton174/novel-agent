package cn.novelstudio.module.agent.service.biz;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.agent.service.StoryMemoryClient;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class AgentMemoryBiz extends BaseBiz {

    private final StoryMemoryClient storyMemoryClient;

    public AgentMemoryBiz(StoryMemoryClient storyMemoryClient) {
        this.storyMemoryClient = storyMemoryClient;
    }

    public Map<String, Object> getNovelMemory(Long userId, String novelId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("novel_id", novelId);
        body.put("memory", storyMemoryClient.loadMemory(userId, novelId));
        return body;
    }

    public Map<String, Object> patchNovelMemory(Long userId, String novelId, Map<String, Object> request) {
        Map<String, Object> result = storyMemoryClient.patchMemory(userId, novelId, request);
        requireMemoryOk(result, "patch failed");
        return enrichNovelResponse(userId, novelId, result);
    }

    public Map<String, Object> deleteNovelMemory(Long userId, String novelId, Map<String, Object> request) {
        Map<String, Object> result = storyMemoryClient.deleteMemory(userId, novelId, request);
        requireMemoryOk(result, "delete failed");
        return enrichNovelResponse(userId, novelId, result);
    }

    public Map<String, Object> clearNovelMemory(Long userId, String novelId, Map<String, Object> request) {
        Map<String, Object> result = storyMemoryClient.clearMemoryScope(userId, novelId, request);
        requireMemoryOk(result, "clear failed");
        Map<String, Object> response = new LinkedHashMap<>(result);
        response.put("novel_id", novelId);
        response.put("memory", storyMemoryClient.loadMemory(userId, novelId));
        return response;
    }

    public Map<String, Object> getSessionMemory(Long userId, String sessionId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("session_id", sessionId);
        body.put("memory", storyMemoryClient.loadMemoryBySession(userId, sessionId));
        return body;
    }

    public void rejectSessionPatch() {
        badRequest("use /api/agent/memory/novel/{novelId}/patch for story memory updates");
    }

    private Map<String, Object> enrichNovelResponse(Long userId, String novelId, Map<String, Object> result) {
        Map<String, Object> response = new LinkedHashMap<>(result);
        response.put("novel_id", novelId);
        if (!response.containsKey("memory")) {
            response.put("memory", storyMemoryClient.loadMemory(userId, novelId));
        }
        return response;
    }

    private void requireMemoryOk(Map<String, Object> result, String defaultMessage) {
        if (Boolean.FALSE.equals(result.get("ok"))) {
            Object reason = result.get("reason");
            if (reason == null) {
                reason = result.get("message");
            }
            badRequest(
                ResultCode.STORY_MEMORY_FAILED,
                String.valueOf(reason == null ? defaultMessage : reason)
            );
        }
    }
}
