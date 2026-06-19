package com.novel.agent.content.service;

import com.novel.agent.content.client.BillingFeatureClient;
import com.novel.agent.content.entity.ChapterEntity;
import com.novel.agent.content.entity.NovelEntity;
import com.novel.agent.content.repository.ChapterRepository;
import com.novel.agent.content.repository.NovelRepository;
import com.novel.agent.content.support.ContentExceptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NovelExportService {

    private final NovelRepository novelRepository;
    private final ChapterRepository chapterRepository;
    private final BillingFeatureClient billingFeatureClient;

    public ExportPayload exportTxt(long userId, String novelId) {
        billingFeatureClient.assertFeature(userId, "txt_export");
        return buildExport(userId, novelId, "txt");
    }

    public ExportPayload exportPdf(long userId, String novelId) {
        billingFeatureClient.assertFeature(userId, "pdf_export");
        return buildExport(userId, novelId, "pdf");
    }

    private ExportPayload buildExport(long userId, String novelId, String ext) {
        NovelEntity novel = novelRepository.findByIdAndUserId(novelId, userId)
            .orElseThrow(ContentExceptions::novelNotFound);
        List<ChapterEntity> chapters = chapterRepository.findByNovelIdOrderBySortOrderAscCreatedAtAsc(novelId);
        StringBuilder body = new StringBuilder();
        body.append(novel.getTitle()).append("\n\n");
        for (ChapterEntity chapter : chapters) {
            body.append(chapter.getTitle()).append("\n\n");
            if (chapter.getContent() != null && !chapter.getContent().isBlank()) {
                body.append(chapter.getContent().trim()).append("\n\n");
            }
            body.append("---\n\n");
        }
        String safeName = novel.getTitle().replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        if (safeName.isBlank()) {
            safeName = "novel";
        }
        return new ExportPayload(body.toString(), safeName + "." + ext);
    }

    public record ExportPayload(String body, String filename) {}
}
