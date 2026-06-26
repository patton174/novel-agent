package cn.novelstudio.module.upload.client;

import cn.novelstudio.module.upload.config.UploadRuntimeProperties;
import cn.novelstudio.platform.storage.StorageBackend;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestClient;

import java.io.InputStream;

/**
 * 调用 python-ai {@code POST /internal/parse}：multipart 传文件字节流 + format/originalName/fileId，
 * 触发 python 后台异步解析（立即返回 202）。结果由 python 回调
 * {@code /internal/upload/{fileId}/finalize} 交付。
 */
@Component
public class PythonParseClient {

    private final RestClient restClient;
    private final String internalKey;
    private final StorageBackend storage;

    public PythonParseClient(
        RestClient pythonRestClient,
        UploadRuntimeProperties props,
        StorageBackend storage
    ) {
        this.restClient = pythonRestClient;
        this.internalKey = props.internalServiceKey();
        this.storage = storage;
    }

    public void parse(String fileId, String storageKey, String format, String originalName) {
        byte[] bytes;
        try (InputStream in = storage.load(storageKey)) {
            bytes = StreamUtils.copyToByteArray(in);
        } catch (Exception e) {
            throw new IllegalStateException("upload.read_failed");
        }

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        ByteArrayResource fileResource = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return originalName;
            }
        };
        builder.part("file", fileResource)
            .filename(originalName)
            .contentType(MediaType.APPLICATION_OCTET_STREAM);
        builder.part("format", format);
        builder.part("originalName", originalName);
        builder.part("fileId", fileId);

        restClient.post()
            .uri("/internal/parse")
            .header("X-Internal-Service-Key", internalKey)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(builder.build())
            .retrieve()
            .toBodilessEntity();
    }
}
