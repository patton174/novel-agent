package cn.novelstudio.module.content.client;

import cn.novelstudio.module.content.config.ContentRuntimeProperties;
import cn.novelstudio.module.content.storage.StorageBackend;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * 调用 python-ai {@code POST /internal/parse}：multipart 传文件字节流 + format/originalName/fileId，
 * 返回 {@code {title, chapters:[{title,content,sort_order}], text, error?}}。
 *
 * <p>Part 1 仅提供可编译的客户端；实际调用由 Part 2 的 FileParseListener 触发。
 */
@Component
public class PythonParseClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String internalKey;
    private final StorageBackend storage;

    public PythonParseClient(
        RestClient pythonRestClient,
        ObjectMapper objectMapper,
        ContentRuntimeProperties props,
        StorageBackend storage
    ) {
        this.restClient = pythonRestClient;
        this.objectMapper = objectMapper;
        this.internalKey = props.internalServiceKey();
        this.storage = storage;
    }

    public JsonNode parse(String fileId, String storageKey, String format, String originalName) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", new InputStreamResource(storage.load(storageKey)) {
            @Override
            public String getFilename() {
                return originalName;
            }
        }).filename(originalName).contentType(MediaType.APPLICATION_OCTET_STREAM);
        builder.part("format", format);
        builder.part("originalName", originalName);
        builder.part("fileId", fileId);

        return restClient.post()
            .uri("/internal/parse")
            .header("X-Internal-Service-Key", internalKey)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(builder.build())
            .retrieve()
            .body(JsonNode.class);
    }
}
