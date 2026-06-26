package cn.novelstudio.module.worker.listener;

import cn.novelstudio.module.upload.client.PythonParseClient;
import cn.novelstudio.module.upload.service.UploadService;
import cn.novelstudio.module.worker.support.MqListenerSupport;
import cn.novelstudio.platform.messaging.upload.FileParseMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

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
        uploadService.markParsing(payload.fileId());
        parseClient.parse(payload.fileId(), payload.storageKey(),
            payload.format(), payload.originalName());
    }
}
