package cn.novelstudio.module.upload.service.crm;

import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.upload.dto.UploadFileDTO;
import cn.novelstudio.module.upload.repository.UploadedFileRepository;
import cn.novelstudio.module.upload.service.UploadService;
import cn.novelstudio.platform.web.utils.SpringPageSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class UploadCrmBiz extends BaseBiz {

    private static final List<String> RETRYABLE = List.of("failed", "pending");

    private final UploadedFileRepository fileRepo;
    private final UploadService uploadService;

    public Result<Page<UploadFileDTO>> pageByStatus(int pageCurrent, int pageSize, String status) {
        List<String> statuses = resolveStatuses(status);
        var springPage = fileRepo.findByStatusInOrderByUpdatedAtDesc(
            statuses,
            PageRequest.of(Math.max(0, pageCurrent - 1), Math.max(1, Math.min(pageSize, 100)))
        );
        return ok(SpringPageSupport.map(springPage, uploadService::toDto, pageCurrent, pageSize));
    }

    private static List<String> resolveStatuses(String status) {
        if (status == null || status.isBlank() || "retryable".equalsIgnoreCase(status)) {
            return RETRYABLE;
        }
        String s = status.trim().toLowerCase(Locale.ROOT);
        return List.of(s);
    }
}
