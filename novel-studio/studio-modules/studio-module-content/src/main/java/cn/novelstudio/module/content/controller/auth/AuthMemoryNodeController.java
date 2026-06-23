package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.content.dto.CreateMemoryNodeRequest;
import cn.novelstudio.module.content.dto.MemoryNodeDTO;
import cn.novelstudio.module.content.dto.MoveMemoryNodeRequest;
import cn.novelstudio.module.content.dto.UpdateMemoryNodeRequest;
import cn.novelstudio.module.content.service.auth.biz.AuthMemoryNodeBiz;
import cn.novelstudio.platform.web.BaseController;
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
@RequestMapping("/api/content/auth/novels/{novelId}/memory-nodes")
@RequiredArgsConstructor
public class AuthMemoryNodeController extends BaseController {

    private final AuthMemoryNodeBiz biz;

    @GetMapping("/flat")
    public Result<List<MemoryNodeDTO>> listAllInScope(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @RequestParam(name = "scope") String scope,
        @RequestParam(name = "includeContent", defaultValue = "true") boolean includeContent
    ) {
        return biz.listAllInScope(parseUserId(userId), novelId, scope, includeContent);
    }

    @GetMapping
    public Result<List<MemoryNodeDTO>> listNodes(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @RequestParam(name = "scope") String scope,
        @RequestParam(name = "parentId", required = false) String parentId
    ) {
        return biz.listNodes(parseUserId(userId), novelId, scope, parentId);
    }

    @GetMapping("/tree")
    public Result<Map<String, Object>> getTree(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @RequestParam(name = "scope") String scope
    ) {
        return biz.getTree(parseUserId(userId), novelId, scope);
    }

    @GetMapping("/tree-index")
    public Result<Map<String, Object>> getTreeIndex(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId
    ) {
        return biz.getTreeIndex(parseUserId(userId), novelId);
    }

    @GetMapping("/{memoryId}")
    public Result<MemoryNodeDTO> getNode(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @PathVariable(name = "memoryId") String memoryId
    ) {
        return biz.getNode(parseUserId(userId), novelId, memoryId);
    }

    @PostMapping
    public Result<MemoryNodeDTO> createNode(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @Valid @RequestBody CreateMemoryNodeRequest request
    ) {
        return biz.createNode(parseUserId(userId), novelId, request);
    }

    @PutMapping("/{memoryId}")
    public Result<MemoryNodeDTO> updateNode(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @PathVariable(name = "memoryId") String memoryId,
        @Valid @RequestBody UpdateMemoryNodeRequest request
    ) {
        return biz.updateNode(parseUserId(userId), novelId, memoryId, request);
    }

    @PostMapping("/{memoryId}/move")
    public Result<MemoryNodeDTO> moveNode(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @PathVariable(name = "memoryId") String memoryId,
        @Valid @RequestBody MoveMemoryNodeRequest request
    ) {
        return biz.moveNode(parseUserId(userId), novelId, memoryId, request);
    }

    @DeleteMapping("/{memoryId}")
    public Result<Map<String, Object>> deleteNode(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable(name = "novelId") String novelId,
        @PathVariable(name = "memoryId") String memoryId,
        @RequestParam(name = "cascade", defaultValue = "true") boolean cascade
    ) {
        return biz.deleteNode(parseUserId(userId), novelId, memoryId, cascade);
    }
}
