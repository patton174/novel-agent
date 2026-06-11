package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.dto.ChapterSummaryDTO;
import cn.novelstudio.module.content.dto.CreateVolumeRequest;
import cn.novelstudio.module.content.dto.UpdateVolumeRequest;
import cn.novelstudio.module.content.dto.VolumeDTO;
import cn.novelstudio.module.content.service.ChapterService;
import cn.novelstudio.module.content.service.VolumeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthVolumeBiz extends BaseBiz {

    private final VolumeService volumeService;
    private final ChapterService chapterService;

    public Result<List<VolumeDTO>> listByNovel(Long userId, String novelId) {
        return ok(volumeService.listVolumes(userId, novelId));
    }

    public Result<VolumeDTO> create(Long userId, String novelId, CreateVolumeRequest request) {
        return ok(volumeService.createVolume(userId, novelId, request));
    }

    public Result<VolumeDTO> update(Long userId, String volumeId, UpdateVolumeRequest request) {
        return ok(volumeService.updateVolume(userId, volumeId, request));
    }

    public Result<Map<String, Object>> delete(Long userId, String volumeId) {
        volumeService.deleteVolume(userId, volumeId);
        return ok(Map.of("ok", true));
    }

    public Result<List<VolumeDTO>> reorderVolumes(Long userId, String novelId, List<String> ids) {
        return ok(volumeService.reorderVolumes(userId, novelId, ids));
    }

    public Result<List<ChapterSummaryDTO>> reorderChapters(Long userId, String volumeId, List<String> ids) {
        return ok(chapterService.reorderChaptersInVolume(userId, volumeId, ids));
    }
}
