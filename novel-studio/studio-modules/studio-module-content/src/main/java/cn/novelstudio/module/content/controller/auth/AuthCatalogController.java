package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.kernel.base.Page;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.content.dto.NovelDTO;
import cn.novelstudio.module.content.service.auth.biz.AuthCatalogBiz;
import cn.novelstudio.module.content.service.crawl.dto.CatalogChapterSummaryDTO;
import cn.novelstudio.module.content.service.crawl.dto.CatalogNovelDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/content/auth/catalog")
@RequiredArgsConstructor
public class AuthCatalogController extends BaseController {

    private final AuthCatalogBiz biz;

    @GetMapping("/novels")
    public Result<Page<CatalogNovelDTO>> page(
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return biz.page(pageCurrent, pageSize);
    }

    @GetMapping("/novels/{catalogNovelId}")
    public Result<CatalogNovelDTO> get(@PathVariable String catalogNovelId) {
        return biz.get(catalogNovelId);
    }

    @GetMapping("/novels/{catalogNovelId}/chapters")
    public Result<List<CatalogChapterSummaryDTO>> listChapters(@PathVariable String catalogNovelId) {
        return biz.listChapters(catalogNovelId);
    }

    @PostMapping("/novels/{catalogNovelId}/add")
    public Result<NovelDTO> addToLibrary(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String catalogNovelId
    ) {
        return biz.addToLibrary(parseUserId(userId), catalogNovelId);
    }

    @GetMapping("/my-library")
    public Result<Page<CatalogNovelDTO>> myLibrary(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "50") int pageSize
    ) {
        return biz.myLibrary(parseUserId(userId), pageCurrent, pageSize);
    }

    @PostMapping("/novels/{catalogNovelId}/collect")
    public Result<Void> collect(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String catalogNovelId
    ) {
        return biz.collect(parseUserId(userId), catalogNovelId);
    }
}
