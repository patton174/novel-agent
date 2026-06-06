package com.novel.agent.common.image;

/**
 * Agnes Images API 单次生成结果。
 */
public record GeneratedImage(String url, String base64) {

    public boolean hasUrl() {
        return url != null && !url.isBlank();
    }

    public boolean hasBase64() {
        return base64 != null && !base64.isBlank();
    }
}
