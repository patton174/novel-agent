package cn.novelstudio.module.content.service.catalog;

import cn.novelstudio.kernel.exception.ForbiddenException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.content.catalog.IndexStatus;
import cn.novelstudio.module.content.dto.LibraryReindexResultDTO;
import cn.novelstudio.module.content.dto.ReferencedBookDTO;
import cn.novelstudio.module.content.entity.CrawlCatalogChapterEntity;
import cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity;
import cn.novelstudio.module.content.repository.CrawlCatalogChapterRepository;
import cn.novelstudio.module.content.repository.CrawlCatalogNovelRepository;
import cn.novelstudio.module.content.repository.UserLibraryCollectionRepository;
import cn.novelstudio.module.content.service.ChapterService;
import cn.novelstudio.module.content.service.NovelService;
import cn.novelstudio.platform.i18n.StudioMessages;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.library.LibraryIndexMessage;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CatalogServiceLibraryTest {

    @Mock CrawlCatalogNovelRepository novelRepo;
    @Mock CrawlCatalogChapterRepository chapterRepo;
    @Mock UserLibraryCollectionRepository libraryCollectionRepository;
    @Mock NovelService novelService;
    @Mock ChapterService chapterService;
    @Mock ObjectProvider<IMessageProducer> messageProducerProvider;
    @Mock IMessageProducer messageProducer;
    @Mock StudioMessages messages;
    @InjectMocks CatalogService svc;

    @Test
    void indexStatus_mapsLegacyReadyToIndexed() {
        assertThat(IndexStatus.normalizeWire("ready")).isEqualTo("indexed");
        assertThat(IndexStatus.fromWire("ready")).isEqualTo(IndexStatus.INDEXED);
    }

    @Test
    void getReferencedBook_mapsLegacyReadyToIndexed() {
        CrawlCatalogNovelEntity n = new CrawlCatalogNovelEntity();
        n.setId("c-ready");
        n.setTitle("旧状态书");
        n.setIndexStatus("ready");
        n.setOwnerId(null);
        when(novelRepo.findById("c-ready")).thenReturn(Optional.of(n));
        when(chapterRepo.findByCatalogNovelIdOrderBySortOrderAsc("c-ready")).thenReturn(List.of());

        ReferencedBookDTO dto = svc.getReferencedBook("c-ready", 10L);

        assertThat(dto.getIndexStatus()).isEqualTo("indexed");
    }

    @Test
    void getReferencedBook_publicBook_returnsWithChapterTitles() {
        CrawlCatalogNovelEntity n = new CrawlCatalogNovelEntity();
        n.setId("c1");
        n.setTitle("凡人修仙传");
        n.setDescription("摘要");
        n.setIndexNamespace("catalog:c1");
        n.setIndexStatus("indexed");
        n.setOwnerId(null);
        when(novelRepo.findById("c1")).thenReturn(Optional.of(n));
        CrawlCatalogChapterEntity ch1 = new CrawlCatalogChapterEntity();
        ch1.setTitle("第一章");
        ch1.setSortOrder(1);
        CrawlCatalogChapterEntity ch2 = new CrawlCatalogChapterEntity();
        ch2.setTitle("第二章");
        ch2.setSortOrder(2);
        when(chapterRepo.findByCatalogNovelIdOrderBySortOrderAsc("c1")).thenReturn(List.of(ch1, ch2));

        ReferencedBookDTO dto = svc.getReferencedBook("c1", 10L);

        assertThat(dto.getTitle()).isEqualTo("凡人修仙传");
        assertThat(dto.getChapterTitles()).containsExactly("第一章", "第二章");
        assertThat(dto.getNamespace()).isEqualTo("catalog:c1");
    }

    @Test
    void getReferencedBook_privateBook_ownedByUser_ok() {
        CrawlCatalogNovelEntity n = new CrawlCatalogNovelEntity();
        n.setId("c2");
        n.setTitle("我的书");
        n.setOwnerId(10L);
        n.setSource("upload");
        n.setIndexNamespace("library:10:c2");
        when(novelRepo.findById("c2")).thenReturn(Optional.of(n));
        when(chapterRepo.findByCatalogNovelIdOrderBySortOrderAsc("c2")).thenReturn(List.of());

        ReferencedBookDTO dto = svc.getReferencedBook("c2", 10L);

        assertThat(dto.getNamespace()).isEqualTo("library:10:c2");
    }

    @Test
    void getReferencedBook_privateBook_notOwned_throws() {
        CrawlCatalogNovelEntity n = new CrawlCatalogNovelEntity();
        n.setId("c3");
        n.setOwnerId(99L);
        n.setSource("upload");
        when(novelRepo.findById("c3")).thenReturn(Optional.of(n));
        when(libraryCollectionRepository.existsByUserIdAndCatalogNovelId(10L, "c3")).thenReturn(false);

        assertThatThrownBy(() -> svc.getReferencedBook("c3", 10L))
            .isInstanceOf(RuntimeException.class);
    }

    @Test
    void reindexLibrary_ownerFailed_publishesMqAndReturnsPending() {
        CrawlCatalogNovelEntity n = new CrawlCatalogNovelEntity();
        n.setId("c4");
        n.setOwnerId(10L);
        n.setChapterCount(3);
        n.setIndexStatus("failed");
        when(novelRepo.findById("c4")).thenReturn(Optional.of(n));
        when(messageProducerProvider.getIfAvailable()).thenReturn(messageProducer);

        LibraryReindexResultDTO result = svc.reindexLibrary(10L, "c4");

        assertThat(result.catalogNovelId()).isEqualTo("c4");
        assertThat(result.indexStatus()).isEqualTo("pending");
        ArgumentCaptor<LibraryIndexMessage> captor = ArgumentCaptor.forClass(LibraryIndexMessage.class);
        verify(messageProducer).send(eq(MqTopic.LIBRARY_INDEX), captor.capture());
        assertThat(captor.getValue().catalogNovelId()).isEqualTo("c4");
        assertThat(captor.getValue().namespace()).isEqualTo("library:10:c4");
        assertThat(captor.getValue().userId()).isEqualTo(10L);
    }

    @Test
    void reindexLibrary_indexedStatus_rejected() {
        CrawlCatalogNovelEntity n = new CrawlCatalogNovelEntity();
        n.setId("c5");
        n.setOwnerId(10L);
        n.setChapterCount(2);
        n.setIndexStatus("indexed");
        when(novelRepo.findById("c5")).thenReturn(Optional.of(n));

        assertThatThrownBy(() -> svc.reindexLibrary(10L, "c5"))
            .isInstanceOf(ValidationException.class);
    }

    @Test
    void reindexLibrary_notInLibrary_forbidden() {
        CrawlCatalogNovelEntity n = new CrawlCatalogNovelEntity();
        n.setId("c6");
        n.setOwnerId(99L);
        n.setChapterCount(1);
        n.setIndexStatus("failed");
        when(novelRepo.findById("c6")).thenReturn(Optional.of(n));
        when(libraryCollectionRepository.existsByUserIdAndCatalogNovelId(10L, "c6")).thenReturn(false);

        assertThatThrownBy(() -> svc.reindexLibrary(10L, "c6"))
            .isInstanceOf(ForbiddenException.class);
    }
}
