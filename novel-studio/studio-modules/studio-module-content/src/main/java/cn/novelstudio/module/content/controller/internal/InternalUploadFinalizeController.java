package cn.novelstudio.module.content.controller.internal;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.content.service.UploadService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Python 解析完成回调：异步解析交付结果。
 *
 * <p>路径在 {@code /internal/**} 下，由 {@link cn.novelstudio.platform.web.internal.InternalServiceKeyInterceptor}
 * 自动校验 X-Internal-Service-Key。Python 解析（含异常）完成即回调此端点，由
 * {@link UploadService#finalizeParse} 回写 catalog + 状态（ready/failed）。
 */
@Slf4j
@RestController
@RequestMapping("/internal/upload")
@RequiredArgsConstructor
public class InternalUploadFinalizeController {

    private final UploadService uploadService;

    @PostMapping("/{fileId}/finalize")
    public Result<Void> finalize(@PathVariable String fileId, @RequestBody JsonNode result) {
        // pydantic model_dump() 中 error 键总是存在（成功时为 null），故需判断非 null
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
