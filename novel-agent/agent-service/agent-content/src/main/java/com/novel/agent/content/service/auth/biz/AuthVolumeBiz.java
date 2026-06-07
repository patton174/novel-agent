package com.novel.agent.content.service.auth.biz;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.content.dto.ChapterSummaryDTO;
import com.novel.agent.content.dto.CreateVolumeRequest;
import com.novel.agent.content.dto.UpdateVolumeRequest;
import com.novel.agent.content.dto.VolumeDTO;
import com.novel.agent.content.service.ChapterService;
import com.novel.agent.content.service.VolumeService;
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
