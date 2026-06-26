package cn.novelstudio.module.agent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.content.dto.CreateChapterRequest;
import cn.novelstudio.module.content.dto.UpdateChapterRequest;
import cn.novelstudio.module.content.service.auth.biz.AuthChapterBiz;
import cn.novelstudio.module.content.service.auth.biz.AuthNovelBiz;
import cn.novelstudio.platform.i18n.StudioMessages;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class ChapterSideEffectService {

    private final AuthChapterBiz chapterBiz;
    private final AuthNovelBiz novelBiz;
    private final ObjectMapper objectMapper;
    private final StudioMessages messages;

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
                throw BizException.keyed(ResultCode.BAD_REQUEST, "agent.chapter.persist_missing_context");
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
                title == null || title.isBlank() ? messages.get("agent.chapter.unnamed_title") : title,
                content,
                null,
                null,
                sortOrder
            )
        );
    }

    private RuntimeException formatPersistException(Map<String, Object> write, Exception ex) {
        return BizException.keyed(ResultCode.ERROR, "agent.chapter.persist_failed", persistMessageArgs(write, ex.getMessage()));
    }

    private Object[] persistMessageArgs(Map<String, Object> write, String detail) {
        String label = String.valueOf(
            write.getOrDefault("display_label", write.getOrDefault("title", messages.get("agent.chapter.default_label")))
        );
        String listIndexPart = "";
        Object listIndex = write.get("list_index");
        if (listIndex instanceof Number num && num.intValue() > 0) {
            listIndexPart = messages.get("agent.chapter.persist_failed.list_index", num.intValue());
        }
        String cid = String.valueOf(write.getOrDefault("chapter_id", ""));
        String chapterIdPart = "";
        if (cid != null && !cid.isBlank() && !"null".equals(cid)) {
            chapterIdPart = messages.get("agent.chapter.persist_failed.chapter_id", cid);
        }
        String errorPart = messages.get(
            "agent.chapter.persist_failed.error",
            detail == null ? "unknown" : detail
        );
        return new Object[] { label, listIndexPart, chapterIdPart, errorPart };
    }
}
