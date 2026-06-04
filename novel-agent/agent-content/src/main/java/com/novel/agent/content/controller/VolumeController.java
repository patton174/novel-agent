package com.novel.agent.content.controller;

import com.novel.agent.content.dto.ChapterSummaryDTO;
import com.novel.agent.content.dto.CreateVolumeRequest;
import com.novel.agent.content.dto.ReorderIdsRequest;
import com.novel.agent.content.dto.UpdateVolumeRequest;
import com.novel.agent.content.dto.VolumeDTO;
import com.novel.agent.content.service.ChapterService;
import com.novel.agent.content.service.VolumeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class VolumeController {

    private final VolumeService volumeService;
    private final ChapterService chapterService;

    @GetMapping("/api/content/novels/{novelId}/volumes")
    public ResponseEntity<List<VolumeDTO>> listByNovel(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId
    ) {
        return ResponseEntity.ok(volumeService.listVolumes(parseUserId(userId), novelId));
    }

    @PostMapping("/api/content/novels/{novelId}/volumes")
    public ResponseEntity<VolumeDTO> create(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId,
        @Valid @RequestBody CreateVolumeRequest request
    ) {
        return ResponseEntity.ok(volumeService.createVolume(parseUserId(userId), novelId, request));
    }

    @PutMapping("/api/content/volumes/{volumeId}")
    public ResponseEntity<VolumeDTO> update(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String volumeId,
        @Valid @RequestBody UpdateVolumeRequest request
    ) {
        return ResponseEntity.ok(volumeService.updateVolume(parseUserId(userId), volumeId, request));
    }

    @DeleteMapping("/api/content/volumes/{volumeId}")
    public ResponseEntity<Map<String, Object>> delete(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String volumeId
    ) {
        volumeService.deleteVolume(parseUserId(userId), volumeId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/api/content/novels/{novelId}/volumes/reorder")
    public ResponseEntity<List<VolumeDTO>> reorderVolumes(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId,
        @Valid @RequestBody ReorderIdsRequest request
    ) {
        return ResponseEntity.ok(volumeService.reorderVolumes(parseUserId(userId), novelId, request.ids()));
    }

    @PostMapping("/api/content/volumes/{volumeId}/chapters/reorder")
    public ResponseEntity<List<ChapterSummaryDTO>> reorderChapters(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String volumeId,
        @Valid @RequestBody ReorderIdsRequest request
    ) {
        return ResponseEntity.ok(
            chapterService.reorderChaptersInVolume(parseUserId(userId), volumeId, request.ids())
        );
    }

    private static Long parseUserId(String userIdHeader) {
        return Long.parseLong(userIdHeader.trim());
    }
}
