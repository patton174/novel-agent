package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.content.dto.ChapterSummaryDTO;
import cn.novelstudio.module.content.dto.CreateVolumeRequest;
import cn.novelstudio.module.content.dto.ReorderIdsRequest;
import cn.novelstudio.module.content.dto.UpdateVolumeRequest;
import cn.novelstudio.module.content.dto.VolumeDTO;
import cn.novelstudio.module.content.service.auth.biz.AuthVolumeBiz;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AuthVolumeController extends BaseController {

    private final AuthVolumeBiz biz;

    @GetMapping("/api/content/auth/novels/{novelId}/volumes")
    public Result<List<VolumeDTO>> listByNovel(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return biz.listByNovel(parseUserId(userId), novelId);
    }

    @PostMapping("/api/content/auth/novels/{novelId}/volumes")
    public Result<VolumeDTO> create(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId,
        @Valid @RequestBody CreateVolumeRequest request
    ) {
        return biz.create(parseUserId(userId), novelId, request);
    }

    @PutMapping("/api/content/auth/volumes/{volumeId}")
    public Result<VolumeDTO> update(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String volumeId,
        @Valid @RequestBody UpdateVolumeRequest request
    ) {
        return biz.update(parseUserId(userId), volumeId, request);
    }

    @DeleteMapping("/api/content/auth/volumes/{volumeId}")
    public Result<Map<String, Object>> delete(@RequestHeader("X-User-Id") String userId, @PathVariable String volumeId) {
        return biz.delete(parseUserId(userId), volumeId);
    }

    @PostMapping("/api/content/auth/novels/{novelId}/volumes/reorder")
    public Result<List<VolumeDTO>> reorderVolumes(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String novelId,
        @Valid @RequestBody ReorderIdsRequest request
    ) {
        return biz.reorderVolumes(parseUserId(userId), novelId, request.ids());
    }

    @PostMapping("/api/content/auth/volumes/{volumeId}/chapters/reorder")
    public Result<List<ChapterSummaryDTO>> reorderChapters(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String volumeId,
        @Valid @RequestBody ReorderIdsRequest request
    ) {
        return biz.reorderChapters(parseUserId(userId), volumeId, request.ids());
    }
}
