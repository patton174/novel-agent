package cn.novelstudio.module.agent.controller;

import cn.novelstudio.module.agent.service.biz.AgentMemoryBiz;
import cn.novelstudio.module.agent.support.BlockingWebSupport;
import cn.novelstudio.module.agent.support.PyaiRequestSupport;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/agent/memory")
public class AgentMemoryController {

    private final AgentMemoryBiz biz;
    private final BlockingWebSupport blockingWebSupport;

    public AgentMemoryController(AgentMemoryBiz biz, BlockingWebSupport blockingWebSupport) {
        this.biz = biz;
        this.blockingWebSupport = blockingWebSupport;
    }

    @GetMapping("/novel/{novelId}")
    public Mono<Map<String, Object>> getNovelMemory(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER, required = false) String userIdHeader,
        @PathVariable("novelId") String novelId
    ) {
        Long userId = PyaiRequestSupport.parseUserId(userIdHeader);
        return blockingWebSupport.mono(() -> biz.getNovelMemory(userId, novelId));
    }

    @PostMapping(value = "/novel/{novelId}/patch", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> patchNovelMemory(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER, required = false) String userIdHeader,
        @PathVariable("novelId") String novelId,
        @RequestBody Map<String, Object> body
    ) {
        Long userId = PyaiRequestSupport.parseUserId(userIdHeader);
        return blockingWebSupport.mono(() -> biz.patchNovelMemory(userId, novelId, body));
    }

    @PostMapping(value = "/novel/{novelId}/delete", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> deleteNovelMemory(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER, required = false) String userIdHeader,
        @PathVariable("novelId") String novelId,
        @RequestBody Map<String, Object> body
    ) {
        Long userId = PyaiRequestSupport.parseUserId(userIdHeader);
        return blockingWebSupport.mono(() -> biz.deleteNovelMemory(userId, novelId, body));
    }

    @PostMapping(value = "/novel/{novelId}/clear", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> clearNovelMemory(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER, required = false) String userIdHeader,
        @PathVariable("novelId") String novelId,
        @RequestBody Map<String, Object> body
    ) {
        Long userId = PyaiRequestSupport.parseUserId(userIdHeader);
        return blockingWebSupport.mono(() -> biz.clearNovelMemory(userId, novelId, body));
    }

    @GetMapping("/{sessionId}")
    public Mono<Map<String, Object>> getMemory(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER, required = false) String userIdHeader,
        @PathVariable("sessionId") String sessionId
    ) {
        Long userId = PyaiRequestSupport.parseUserId(userIdHeader);
        return blockingWebSupport.mono(() -> biz.getSessionMemory(userId, sessionId));
    }

    @PostMapping(value = "/{sessionId}/patch", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> patchMemory(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER, required = false) String userIdHeader,
        @PathVariable("sessionId") String sessionId,
        @RequestBody Map<String, Object> body
    ) {
        PyaiRequestSupport.parseUserId(userIdHeader);
        return blockingWebSupport.mono(() -> {
            biz.rejectSessionPatch();
            return Map.<String, Object>of();
        });
    }
}
