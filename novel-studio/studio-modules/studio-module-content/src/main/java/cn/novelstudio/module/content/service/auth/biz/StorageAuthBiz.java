package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.module.content.dto.StoragePresignRequest;
import cn.novelstudio.module.content.dto.StoragePresignResponse;
import cn.novelstudio.platform.storage.presign.StorageAccessDeniedException;
import cn.novelstudio.platform.storage.presign.StoragePresignResult;
import cn.novelstudio.platform.storage.presign.StoragePresignService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StorageAuthBiz extends BaseBiz {

    private final StoragePresignService storagePresignService;

    public Result<StoragePresignResponse> presign(long userId, StoragePresignRequest request) {
        if (request == null || request.key() == null || request.key().isBlank()) {
            badRequestKeyed("storage.key.required");
        }
        try {
            StoragePresignResult result = storagePresignService.presign(userId, request.key());
            return ok(new StoragePresignResponse(result.url(), result.expiresAt()));
        } catch (StorageAccessDeniedException ex) {
            forbiddenKeyed(ResultCode.FORBIDDEN, ex.getMessage());
            return null;
        }
    }
}
