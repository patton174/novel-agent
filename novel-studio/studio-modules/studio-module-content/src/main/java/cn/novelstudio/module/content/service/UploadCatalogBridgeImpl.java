package cn.novelstudio.module.content.service;

import cn.novelstudio.kernel.tools.IdWorker;
import cn.novelstudio.module.content.entity.CrawlCatalogChapterEntity;
import cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity;
import cn.novelstudio.module.content.repository.CrawlCatalogChapterRepository;
import cn.novelstudio.module.content.repository.CrawlCatalogNovelRepository;
import cn.novelstudio.module.upload.bridge.UploadCatalogBridge;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import cn.novelstudio.platform.i18n.StudioMessages;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UploadCatalogBridgeImpl implements UploadCatalogBridge {

    private final CrawlCatalogNovelRepository catalogRepo;
    private final CrawlCatalogChapterRepository catalogChapterRepo;
    private final StudioMessages messages;

    @Override
    public boolean catalogExists(String catalogNovelId) {
        return catalogNovelId != null && catalogRepo.existsById(catalogNovelId);
    }

    @Override
    @Transactional
    public String importParsedUpload(String fileId, Long ownerId, String originalName, JsonNode result) {
        CrawlCatalogNovelEntity novel = new CrawlCatalogNovelEntity();
        novel.setTitle(result == null ? originalName : result.path("title").asText(originalName));
        novel.setOwnerId(ownerId);
        novel.setSource("upload");
        novel.setUploaderFileId(fileId);
        novel.setChapterCount(0);
        novel = catalogRepo.save(novel);

        int idx = 1;
        if (result != null && result.has("chapters") && result.path("chapters").isArray()) {
            ArrayNode chapters = (ArrayNode) result.path("chapters");
            if (!chapters.isEmpty()) {
                final int batch = 200;
                List<CrawlCatalogChapterEntity> buf = new ArrayList<>(batch);
                for (JsonNode ch : chapters) {
                    CrawlCatalogChapterEntity c = new CrawlCatalogChapterEntity();
                    c.setId(IdWorker.nextIdStr());
                    c.setCatalogNovelId(novel.getId());
                    c.setTitle(ch.path("title").asText(messages.get("content.chapter.default_title", idx)));
                    c.setContent(ch.path("content").asText(""));
                    c.setSortOrder(ch.path("sort_order").asInt(idx));
                    buf.add(c);
                    idx++;
                    if (buf.size() >= batch) {
                        catalogChapterRepo.saveAll(buf);
                        catalogChapterRepo.flush();
                        buf.clear();
                    }
                }
                if (!buf.isEmpty()) {
                    catalogChapterRepo.saveAll(buf);
                    catalogChapterRepo.flush();
                }
                novel.setChapterCount(idx - 1);
            }
        }
        if (idx == 1) {
            String text = result == null ? "" : result.path("text").asText("");
            CrawlCatalogChapterEntity c = new CrawlCatalogChapterEntity();
            c.setId(IdWorker.nextIdStr());
            c.setCatalogNovelId(novel.getId());
            c.setTitle(originalName);
            c.setContent(text);
            c.setSortOrder(1);
            catalogChapterRepo.save(c);
            novel.setChapterCount(1);
        }
        catalogRepo.save(novel);
        return novel.getId();
    }
}
