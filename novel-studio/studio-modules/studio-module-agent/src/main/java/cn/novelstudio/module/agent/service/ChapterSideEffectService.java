package cn.novelstudio.module.agent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.content.dto.CreateChapterRequest;
import cn.novelstudio.module.content.dto.UpdateChapterRequest;
import cn.novelstudio.module.content.service.auth.biz.AuthChapterBiz;
import cn.novelstudio.module.content.service.auth.biz.AuthNovelBiz;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class ChapterSideEffectService {

    private final AuthChapterBiz chapterBiz;
    private final AuthNovelBiz novelBiz;
    private final ObjectMapper objectMapper;

    public ChapterSideEffectService(
        AuthChapterBiz chapterBiz,
        AuthNovelBiz novelBiz,
        ObjectMapper objectMapper
    ) {
        this.chapterBiz = chapterBiz;
        this.novelBiz = novelBiz;
        this.objectMapper = objectMapper;
    }

    @SuppressWarnings("unchecked")
    public void applySideEffects(Long userId, String novelId, Map<String, Object> contextPatch) {
        if (contextPatch == null || contextPatch.isEmpty() || userId == null) {
            return;
        }

        Object writeRaw = contextPatch.get("chapter_write");
        if (!(writeRaw instanceof Map<?, ?> writeMap)) {
            return;
        }
        Map<String, Object> write = objectMapper.convertValue(writeMap, Map.class);
        if (Boolean.TRUE.equals(write.get("persisted"))) {
            contextPatch.remove("chapter_write");
            return;
        }

        Object content = write.get("content");
        if (content == null) {
            return;
        }

        String title = write.get("title") == null ? null : String.valueOf(write.get("title"));
        Object sortOrder = write.get("sort_order");
        if (sortOrder == null) {
            sortOrder = write.get("sortOrder");
        }
        Integer sortOrderValue = sortOrder instanceof Number num ? num.intValue() : null;
        String contentText = String.valueOf(content);

        Object chapterId = write.get("chapter_id");
        try {
            if (chapterId != null) {
                final String chapterIdStr = String.valueOf(chapterId);
                try {
                    updateChapter(userId, chapterIdStr, title, contentText, sortOrderValue);
                } catch (NotFoundException notFound) {
                    if (novelId == null || novelId.isBlank()) {
                        throw formatPersistException(write, notFound);
                    }
                    createChapter(userId, novelId, title, contentText, sortOrderValue);
                }
            } else if (novelId != null && !novelId.isBlank()) {
                createChapter(userId, novelId, title, contentText, sortOrderValue);
            } else {
                throw BizException.of(
                    ResultCode.BAD_REQUEST,
                    formatPersistMessage(write, "chapter_write missing novel context")
                );
            }
        } catch (BizException ex) {
            throw ex;
        } catch (Exception ex) {
            throw formatPersistException(write, ex);
        }
        contextPatch.remove("chapter_write");
    }

    private void updateChapter(
        Long userId,
        String chapterId,
        String title,
        String content,
        Integer sortOrder
    ) {
        chapterBiz.update(
            userId,
            chapterId,
            new UpdateChapterRequest(title, content, null, sortOrder),
            "ai"
        );
    }

    private void createChapter(
        Long userId,
        String novelId,
        String title,
        String content,
        Integer sortOrder
    ) {
        novelBiz.createChapter(
            userId,
            novelId,
            new CreateChapterRequest(
                title == null || title.isBlank() ? "未命名章节" : title,
                content,
                null,
                null,
                sortOrder
            )
        );
    }

    private RuntimeException formatPersistException(Map<String, Object> write, Exception ex) {
        return BizException.of(ResultCode.ERROR, formatPersistMessage(write, ex.getMessage()));
    }

    public static String formatPersistMessage(Map<String, Object> write, String detail) {
        String label = String.valueOf(write.getOrDefault("display_label", write.getOrDefault("title", "章节")));
        String cid = String.valueOf(write.getOrDefault("chapter_id", ""));
        Object listIndex = write.get("list_index");
        StringBuilder sb = new StringBuilder("章节写入作品库失败：").append(label);
        if (listIndex instanceof Number num && num.intValue() > 0) {
            sb.append("（作品列表第").append(num.intValue()).append("章）");
        }
        if (cid != null && !cid.isBlank() && !"null".equals(cid)) {
            sb.append("；chapter_id=").append(cid);
        }
        sb.append("；错误：").append(detail == null ? "unknown" : detail);
        return sb.toString();
    }
}
