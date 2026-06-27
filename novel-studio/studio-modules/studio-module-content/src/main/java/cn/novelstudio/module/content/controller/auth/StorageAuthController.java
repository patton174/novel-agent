package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.content.dto.StoragePresignRequest;
import cn.novelstudio.module.content.dto.StoragePresignResponse;
import cn.novelstudio.module.content.service.auth.biz.StorageAuthBiz;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/content/auth/storage")
@RequiredArgsConstructor
public class StorageAuthController extends BaseController {

    private final StorageAuthBiz biz;

    @PostMapping("/presign")
    public Result<StoragePresignResponse> presign(
        @RequestHeader("X-User-Id") String userId,
        @Valid @RequestBody StoragePresignRequest request
    ) {
        return biz.presign(parseUserId(userId), request);
    }
}
