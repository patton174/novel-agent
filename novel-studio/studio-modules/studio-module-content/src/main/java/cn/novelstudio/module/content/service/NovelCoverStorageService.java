package cn.novelstudio.module.content.service;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.platform.media.GeneratedImage;
import cn.novelstudio.platform.storage.StorageBackend;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class NovelCoverStorageService {

    private final StorageBackend storage;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .version(HttpClient.Version.HTTP_1_1)
        .build();

    public String saveCover(long userId, String novelId, GeneratedImage image) {
        byte[] bytes = resolveBytes(image);
        if (bytes == null || bytes.length == 0) {
            throw BizException.of(ResultCode.IMAGE_GENERATION_FAILED);
        }
        String key = "covers/" + userId + "/" + novelId + "/" + Instant.now().toEpochMilli() + ".png";
        storage.save(new ByteArrayInputStream(bytes), key);
        return key;
    }

    public InputStream load(String storageKey) {
        return storage.load(storageKey);
    }

    public void deleteQuietly(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }
        storage.delete(storageKey);
    }

    private byte[] resolveBytes(GeneratedImage image) {
        if (image.hasBase64()) {
            try {
                return Base64.getDecoder().decode(image.base64().trim());
            } catch (IllegalArgumentException ex) {
                log.warn("封面 base64 解码失败: {}", ex.getMessage());
            }
        }
        if (image.hasUrl()) {
            return download(image.url());
        }
        return null;
    }

    private byte[] download(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(60))
                .GET()
                .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return response.body();
            }
            log.warn("封面下载失败 status={} url={}", response.statusCode(), url);
        } catch (Exception ex) {
            log.warn("封面下载异常 url={}: {}", url, ex.getMessage());
        }
        return null;
    }
}
