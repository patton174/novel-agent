package cn.novelstudio.module.upload.controller.internal;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.upload.service.UploadService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/internal/upload")
@RequiredArgsConstructor
public class InternalUploadFinalizeController {

    private final UploadService uploadService;

    @PostMapping("/{fileId}/finalize")
    public Result<Void> finalize(@PathVariable String fileId, @RequestBody JsonNode result) {
        boolean hasError = result != null
            && !result.path("error").isNull()
            && !result.path("error").asText("").isBlank();
        log.info("parse finalize callback fileId={} hasError={} chapters={}",
            fileId, hasError,
            result != null && result.has("chapters") ? result.path("chapters").size() : 0);
        uploadService.finalizeParse(fileId, result);
        return Result.ok();
    }
}
