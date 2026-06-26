package cn.novelstudio.module.upload.controller.crm;

import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.upload.dto.UploadFileDTO;
import cn.novelstudio.module.upload.service.crm.UploadCrmBiz;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/upload/crm")
@RequiredArgsConstructor
public class UploadCrmController extends BaseController {

    private final UploadCrmBiz biz;

    /** 管理台：按状态分页查询上传文件（默认 failed + pending）。 */
    @GetMapping("/files")
    public Result<Page<UploadFileDTO>> pageFiles(
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize,
        @RequestParam(defaultValue = "retryable") String status
    ) {
        return biz.pageByStatus(pageCurrent, pageSize, status);
    }
}
