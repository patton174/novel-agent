package cn.novelstudio.module.worker.listener;

import cn.novelstudio.module.content.client.PythonParseClient;
import cn.novelstudio.module.content.service.UploadService;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import cn.novelstudio.platform.messaging.upload.FileParseMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * 消费 file.parse 队列：标记 parsing → 触发 python 异步解析（立即返回）。
 *
 * <p>python 在后台解析并实时写 Redis 进度，完成后回调
 * {@code /internal/upload/{fileId}/finalize}（InternalUploadFinalizeController）回写 catalog+状态。
 * 本 listener 不再同步等待解析结果，避免大文件阻塞 MQ consumer。
 * 兜底：UploadParseReaper 定期将超时的 parsing 置 failed。
 */
@Component
public class FileParseListener {

    private static final Logger log = LoggerFactory.getLogger(FileParseListener.class);

    private final ObjectMapper objectMapper;
    private final PythonParseClient parseClient;
    private final UploadService uploadService;

    public FileParseListener(ObjectMapper objectMapper, PythonParseClient parseClient, UploadService uploadService) {
        this.objectMapper = objectMapper;
        this.parseClient = parseClient;
        this.uploadService = uploadService;
    }

    @RabbitListener(queuesToDeclare = @Queue(name = "agent.file.parse.queue", durable = "true"))
    public void onParse(String message) {
        MqListenerSupport.safeHandle(log, message, "file.parse failed", this::handle);
    }

    private void handle(String message) throws Exception {
        FileParseMessage payload = objectMapper.readValue(message, FileParseMessage.class);
        // 标记 parsing（前端据此进入轮询，进度取自 Redis）
        uploadService.markParsing(payload.fileId());
        // 触发 python 异步解析（立即返回 202，结果由回调交付）
        parseClient.parse(payload.fileId(), payload.storageKey(),
            payload.format(), payload.originalName());
    }
}
