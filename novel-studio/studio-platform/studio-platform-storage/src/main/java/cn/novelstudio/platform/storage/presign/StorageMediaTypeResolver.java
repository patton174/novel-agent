package cn.novelstudio.platform.storage.presign;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class StorageMediaTypeResolver {

    private static final Map<String, String> BY_EXT = Map.ofEntries(
        Map.entry("png", "image/png"),
        Map.entry("jpg", "image/jpeg"),
        Map.entry("jpeg", "image/jpeg"),
        Map.entry("webp", "image/webp"),
        Map.entry("gif", "image/gif"),
        Map.entry("svg", "image/svg+xml"),
        Map.entry("pdf", "application/pdf"),
        Map.entry("epub", "application/epub+zip"),
        Map.entry("txt", "text/plain"),
        Map.entry("md", "text/markdown")
    );

    public String resolve(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return "application/octet-stream";
        }
        int dot = storageKey.lastIndexOf('.');
        if (dot < 0 || dot == storageKey.length() - 1) {
            return "application/octet-stream";
        }
        String ext = storageKey.substring(dot + 1).toLowerCase();
        return BY_EXT.getOrDefault(ext, "application/octet-stream");
    }
}
