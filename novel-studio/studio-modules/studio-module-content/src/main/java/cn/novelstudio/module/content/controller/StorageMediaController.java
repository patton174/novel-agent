package cn.novelstudio.module.content.controller;

import cn.novelstudio.platform.storage.presign.StorageAccessDeniedException;
import cn.novelstudio.platform.storage.presign.StorageMediaTypeResolver;
import cn.novelstudio.platform.storage.presign.StoragePresignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.InputStream;

@RestController
@RequestMapping("/api/content/media")
@RequiredArgsConstructor
public class StorageMediaController {

    private final StoragePresignService storagePresignService;
    private final StorageMediaTypeResolver mediaTypeResolver;

    @GetMapping("/object")
    public ResponseEntity<StreamingResponseBody> serveObject(
        @RequestParam String key,
        @RequestParam long uid,
        @RequestParam long exp,
        @RequestParam String sig
    ) {
        try {
            InputStream in = storagePresignService.openSignedObject(key, uid, exp, sig);
            StreamingResponseBody body = outputStream -> {
                try (in) {
                    in.transferTo(outputStream);
                }
            };
            MediaType mediaType = MediaType.parseMediaType(mediaTypeResolver.resolve(key));
            return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                .contentType(mediaType)
                .body(body);
        } catch (StorageAccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }
}
