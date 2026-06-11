package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.content.service.auth.biz.AuthNovelAgentContextBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/content/auth/novels/{novelId}/agent-context")
@RequiredArgsConstructor
public class AuthNovelAgentContextController extends BaseController {

    private final AuthNovelAgentContextBiz biz;

    @GetMapping
    public Result<Map<String, Object>> buildContext(
        @RequestHeader(name = "X-User-Id") String userId,
        @PathVariable String novelId,
        @RequestParam(name = "chapterId", required = false) String chapterId
    ) {
        return biz.buildContext(parseUserId(userId), novelId, chapterId);
    }
}
