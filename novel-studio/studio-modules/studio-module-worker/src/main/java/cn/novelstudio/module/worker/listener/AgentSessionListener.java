package cn.novelstudio.module.worker.listener;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.module.content.dto.AppendMessageRequest;
import cn.novelstudio.module.content.dto.UpsertSessionRequest;
import cn.novelstudio.module.content.service.auth.biz.AuthContentSessionBiz;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class AgentSessionListener {

    private static final Logger log = LoggerFactory.getLogger(AgentSessionListener.class);

    private final ObjectMapper objectMapper;
    private final AuthContentSessionBiz sessionBiz;

    public AgentSessionListener(ObjectMapper objectMapper, AuthContentSessionBiz sessionBiz) {
        this.objectMapper = objectMapper;
        this.sessionBiz = sessionBiz;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.session.queue", durable = "true"))
    public void onPersistSession(String message) {
        MqListenerSupport.safeHandle(log, message, "持久化会话消息失败", this::handle);
    }

    private void handle(String message) throws Exception {
        JsonNode payload = objectMapper.readTree(message);
        long userId = payload.path("user_id").asLong(0L);
        String sessionId = payload.path("session_id").asText("");
        String runId = payload.path("run_id").asText("");
        String messageId = payload.path("message_id").asText("");
        String userMessage = payload.path("user_message").asText("");
        String assistantMessage = payload.path("assistant_message").asText("");

        if (userId <= 0 || sessionId.isBlank()) {
            return;
        }
        upsertSession(userId, sessionId, userMessage);
        if (!userMessage.isBlank()) {
            append(userId, sessionId, "user", userMessage, runId, messageId + ":user");
        }
        if (!assistantMessage.isBlank()) {
            append(userId, sessionId, "assistant", assistantMessage, runId, messageId + ":assistant");
        }
        log.info("会话已持久化: userId={}, sessionId={}, runId={}, messageId={}", userId, sessionId, runId, messageId);
    }

    private void upsertSession(long userId, String sessionId, String seed) {
        // Blank title: ContentSessionService localizes via content.session.default_title on read.
        String title = seed == null || seed.isBlank()
            ? ""
            : (seed.length() > 18 ? seed.substring(0, 18) + "..." : seed);
        sessionBiz.upsert(String.valueOf(userId), new UpsertSessionRequest(sessionId, title, null));
    }

    private void append(long userId, String sessionId, String role, String content, String runId, String messageId) {
        sessionBiz.appendMessage(
            String.valueOf(userId),
            sessionId,
            new AppendMessageRequest(sessionId, role, content, runId, messageId, "auto")
        );
    }
}
