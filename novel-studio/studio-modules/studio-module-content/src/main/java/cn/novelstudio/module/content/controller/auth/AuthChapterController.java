package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.content.dto.ChapterDTO;
import cn.novelstudio.module.content.dto.ChapterReadSliceDTO;
import cn.novelstudio.module.content.dto.ChapterVersionDTO;
import cn.novelstudio.module.content.dto.UpdateChapterRequest;
import cn.novelstudio.module.content.service.auth.biz.AuthChapterBiz;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/content/auth/chapters")
@RequiredArgsConstructor
public class AuthChapterController extends BaseController {

    private final AuthChapterBiz biz;

    @GetMapping("/{chapterId}")
    public Result<ChapterDTO> get(@RequestHeader("X-User-Id") String userId, @PathVariable String chapterId) {
        return biz.get(parseUserId(userId), chapterId);
    }

    @GetMapping("/{chapterId}/read")
    public Result<ChapterReadSliceDTO> readSlice(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String chapterId,
        @RequestParam(required = false) Integer offset,
        @RequestParam(required = false) Integer limit
    ) {
        return biz.readSlice(parseUserId(userId), chapterId, offset, limit);
    }

    @PutMapping("/{chapterId}")
    public Result<ChapterDTO> update(
        @RequestHeader("X-User-Id") String userId,
        @RequestHeader(value = "X-Edit-Source", required = false) String editSource,
        @PathVariable String chapterId,
        @Valid @RequestBody UpdateChapterRequest request
    ) {
        return biz.update(parseUserId(userId), chapterId, request, editSource);
    }

    @DeleteMapping("/{chapterId}")
    public Result<Map<String, Object>> delete(@RequestHeader("X-User-Id") String userId, @PathVariable String chapterId) {
        return biz.delete(parseUserId(userId), chapterId);
    }

    @GetMapping("/{chapterId}/versions")
    public Result<List<ChapterVersionDTO>> listVersions(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String chapterId,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return biz.listVersions(parseUserId(userId), chapterId, limit);
    }

    @PostMapping("/{chapterId}/versions/{versionId}/restore")
    public Result<ChapterDTO> restoreVersion(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String chapterId,
        @PathVariable String versionId
    ) {
        return biz.restoreVersion(parseUserId(userId), chapterId, versionId);
    }
}
