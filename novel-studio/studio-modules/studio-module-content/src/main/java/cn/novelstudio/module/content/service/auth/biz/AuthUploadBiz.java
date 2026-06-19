package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.module.billing.service.biz.FeatureGateBiz;
import cn.novelstudio.module.content.dto.UploadFileDTO;
import cn.novelstudio.module.content.entity.UploadedFileEntity;
import cn.novelstudio.module.content.repository.UploadedFileRepository;
import cn.novelstudio.module.content.service.UploadService;
import cn.novelstudio.platform.web.utils.SpringPageSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/** 用户上传 facade：配额检查 + 委托 UploadService 落盘/查询/删除/重试。 */
@Component
@RequiredArgsConstructor
public class AuthUploadBiz extends BaseBiz {

    static final String FEATURE_LIBRARY_UPLOAD_LIMIT = "library_upload_limit";

    private final UploadService uploadService;
    private final UploadedFileRepository fileRepo;
    private final FeatureGateBiz featureGateBiz;

    public Result<UploadFileDTO> upload(Long userId, String originalName, String mimeType,
                                        long size, InputStream in) {
        // 配额检查：limit=null 表示不限量
        Integer limit = featureGateBiz.getFeatureLimit(userId, FEATURE_LIBRARY_UPLOAD_LIMIT);
        long used = fileRepo.countActiveByOwner(userId);
        if (limit != null && used >= limit) {
            throw BizException.of(ResultCode.BILLING_QUOTA_EXCEEDED);
        }
        String format = uploadService.resolveFormat(originalName);
        String fileId = uploadService.createUpload(userId, "user", originalName, mimeType, size, in, format);
        UploadedFileEntity e = fileRepo.findById(fileId).orElseThrow();
        return ok(uploadService.toDto(e));
    }

    public Result<Page<UploadFileDTO>> list(Long userId, int pageCurrent, int pageSize) {
        var page = fileRepo.findByOwnerIdOrderByCreatedAtDesc(
            userId, PageRequest.of(Math.max(0, pageCurrent - 1), pageSize));
        return ok(SpringPageSupport.map(page, uploadService::toDto, pageCurrent, pageSize));
    }

    public Result<UploadFileDTO> get(Long userId, String fileId) {
        UploadedFileEntity e = uploadService.requireOwned(fileId, userId, "user");
        return ok(uploadService.toDto(e));
    }

    public Result<Void> delete(Long userId, String fileId) {
        UploadedFileEntity e = uploadService.requireOwned(fileId, userId, "user");
        uploadService.delete(e);
        return ok();
    }

    public Result<Map<String, Object>> quota(Long userId) {
        Integer limit = featureGateBiz.getFeatureLimit(userId, FEATURE_LIBRARY_UPLOAD_LIMIT);
        long used = fileRepo.countActiveByOwner(userId);
        Map<String, Object> body = new HashMap<>();
        body.put("limit", limit == null ? "unlimited" : limit);
        body.put("used", used);
        body.put("remaining", limit == null ? "unlimited" : Math.max(0, limit - (int) used));
        return ok(body);
    }

    public Result<UploadFileDTO> retry(Long userId, String fileId) {
        UploadedFileEntity e = uploadService.requireOwned(fileId, userId, "user");
        e.setStatus("pending");
        e.setParseError(null);
        fileRepo.save(e);
        uploadService.publishParse(e.getId(), userId, "user", e.getStorageKey(), e.getFormat(), e.getOriginalName());
        return ok(uploadService.toDto(e));
    }
}
