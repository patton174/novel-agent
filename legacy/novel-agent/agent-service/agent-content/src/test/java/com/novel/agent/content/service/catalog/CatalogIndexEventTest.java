package com.novel.agent.content.service.catalog;

import com.novel.agent.common.mq.catalog.CatalogIndexMessage;
import com.novel.agent.common.mq.constant.MqTopic;
import com.novel.agent.common.mq.producer.IMessageProducer;
import com.novel.agent.content.entity.CrawlCatalogChapterEntity;
import com.novel.agent.content.entity.CrawlCatalogNovelEntity;
import com.novel.agent.content.repository.CrawlCatalogChapterRepository;
import com.novel.agent.content.repository.CrawlCatalogNovelRepository;
import com.novel.agent.content.repository.CrawlJobRepository;
import com.novel.agent.content.service.ChapterService;
import com.novel.agent.content.service.NovelService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CatalogIndexEventTest {

    @Mock
    private CrawlCatalogNovelRepository catalogNovelRepository;
    @Mock
    private CrawlCatalogChapterRepository catalogChapterRepository;
    @Mock
    private CrawlJobRepository crawlJobRepository;
    @Mock
    private NovelService novelService;
    @Mock
    private ChapterService chapterService;
    @Mock
    private IMessageProducer messageProducer;
    @Mock
    private ObjectProvider<IMessageProducer> messageProducerProvider;

    private CatalogService service;

    @BeforeEach
    void setUp() {
        when(messageProducerProvider.getIfAvailable()).thenReturn(messageProducer);
        service = new CatalogService(
            catalogNovelRepository,
            catalogChapterRepository,
            crawlJobRepository,
            novelService,
            chapterService,
            messageProducerProvider
        );
    }

    @Test
    void addChapter_publishesIndexEvent() {
        CrawlCatalogNovelEntity novel = new CrawlCatalogNovelEntity();
        novel.setId("cn1");
        when(catalogNovelRepository.findById("cn1")).thenReturn(Optional.of(novel));
        when(catalogChapterRepository.countByCatalogNovelId("cn1")).thenReturn(1);
        when(catalogChapterRepository.save(any())).thenAnswer(invocation -> {
            CrawlCatalogChapterEntity entity = invocation.getArgument(0);
            entity.setId("ch1");
            return entity;
        });

        service.addChapter("cn1", "第一章", "正文", 1, "http://x");

        ArgumentCaptor<CatalogIndexMessage> captor = ArgumentCaptor.forClass(CatalogIndexMessage.class);
        verify(messageProducer).send(eq(MqTopic.CATALOG_INDEX), captor.capture());
        CatalogIndexMessage payload = captor.getValue();
        assertEquals("cn1", payload.catalogNovelId());
        assertEquals("ch1", payload.chapterId());
        assertEquals("第一章", payload.title());
        assertEquals(1, payload.sortOrder());
    }
}
