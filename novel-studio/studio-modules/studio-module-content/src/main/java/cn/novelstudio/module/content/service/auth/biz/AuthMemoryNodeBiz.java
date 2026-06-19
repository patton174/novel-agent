package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.dto.CreateMemoryNodeRequest;
import cn.novelstudio.module.content.dto.MemoryNodeDTO;
import cn.novelstudio.module.content.dto.MoveMemoryNodeRequest;
import cn.novelstudio.module.content.dto.UpdateMemoryNodeRequest;
import cn.novelstudio.module.content.service.MemoryNodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthMemoryNodeBiz extends BaseBiz {

    private final MemoryNodeService memoryNodeService;

    public Result<List<MemoryNodeDTO>> listAllInScope(Long userId, String novelId, String scope) {
        return ok(memoryNodeService.listAllInScope(userId, novelId, scope));
    }

    public Result<List<MemoryNodeDTO>> listNodes(
        Long userId,
        String novelId,
        String scope,
        String parentId
    ) {
        return ok(memoryNodeService.listChildren(userId, novelId, scope, parentId));
    }

    public Result<Map<String, Object>> getTree(Long userId, String novelId, String scope) {
        return ok(memoryNodeService.buildTreeSummary(userId, novelId, scope));
    }

    public Result<Map<String, Object>> getTreeIndex(Long userId, String novelId) {
        return ok(memoryNodeService.buildAllScopesTreeIndex(userId, novelId));
    }

    public Result<MemoryNodeDTO> getNode(Long userId, String novelId, String memoryId) {
        return ok(memoryNodeService.getNode(userId, novelId, memoryId));
    }

    public Result<MemoryNodeDTO> createNode(
        Long userId,
        String novelId,
        CreateMemoryNodeRequest request
    ) {
        return ok(memoryNodeService.createNode(userId, novelId, request));
    }

    public Result<MemoryNodeDTO> updateNode(
        Long userId,
        String novelId,
        String memoryId,
        UpdateMemoryNodeRequest request
    ) {
        return ok(memoryNodeService.updateNode(userId, novelId, memoryId, request));
    }

    public Result<MemoryNodeDTO> moveNode(
        Long userId,
        String novelId,
        String memoryId,
        MoveMemoryNodeRequest request
    ) {
        return ok(memoryNodeService.moveNode(userId, novelId, memoryId, request));
    }

    public Result<Map<String, Object>> deleteNode(
        Long userId,
        String novelId,
        String memoryId,
        boolean cascade
    ) {
        memoryNodeService.deleteNode(userId, novelId, memoryId, cascade);
        return ok(Map.of("ok", true, "memory_id", memoryId, "cascade", cascade));
    }
}
