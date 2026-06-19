package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.content.dto.UploadFileDTO;
import cn.novelstudio.module.content.service.auth.biz.AuthUploadBiz;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/** 用户上传端点：/api/content/auth/upload/*。 */
@RestController
@RequestMapping("/api/content/auth/upload")
@RequiredArgsConstructor
public class AuthUploadController extends BaseController {

    private final AuthUploadBiz biz;

    @PostMapping("/file")
    public Result<UploadFileDTO> upload(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "title", required = false) String title
    ) throws IOException {
        return biz.upload(parseUserId(userId),
            file.getOriginalFilename(), file.getContentType(),
            file.getSize(), file.getInputStream());
    }

    @GetMapping("/files")
    public Result<Page<UploadFileDTO>> list(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return biz.list(parseUserId(userId), pageCurrent, pageSize);
    }

    @GetMapping("/files/{fileId}")
    public Result<UploadFileDTO> get(@RequestHeader("X-User-Id") String userId,
                                     @PathVariable String fileId) {
        return biz.get(parseUserId(userId), fileId);
    }

    @DeleteMapping("/files/{fileId}")
    public Result<Void> delete(@RequestHeader("X-User-Id") String userId,
                               @PathVariable String fileId) {
        return biz.delete(parseUserId(userId), fileId);
    }

    @PostMapping("/files/{fileId}/retry")
    public Result<UploadFileDTO> retry(@RequestHeader("X-User-Id") String userId,
                                       @PathVariable String fileId) {
        return biz.retry(parseUserId(userId), fileId);
    }

    @GetMapping("/quota")
    public Result<Map<String, Object>> quota(@RequestHeader("X-User-Id") String userId) {
        return biz.quota(parseUserId(userId));
    }
}
