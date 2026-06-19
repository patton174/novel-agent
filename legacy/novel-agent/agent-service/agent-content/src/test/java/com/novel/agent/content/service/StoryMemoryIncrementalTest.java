package com.novel.agent.content.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.content.entity.NovelEntity;
import com.novel.agent.content.entity.NovelStoryMemoryEntity;
import com.novel.agent.content.repository.NovelRepository;
import com.novel.agent.content.repository.NovelStoryMemoryRepository;
import com.novel.agent.content.repository.StoryMemoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StoryMemoryIncrementalTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOps;
    @Mock
    private StoryMemoryRepository storyMemoryRepository;
    @Mock
    private NovelStoryMemoryRepository novelStoryMemoryRepository;
    @Mock
    private NovelRepository novelRepository;
    @Mock
    private ContentSessionService contentSessionService;
    @Mock
    private ObjectProvider<com.novel.agent.common.mq.producer.IMessageProducer> messageProducerProvider;

    private StoryMemoryService service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOps);
        service = new StoryMemoryService(
            redisTemplate,
            objectMapper,
            storyMemoryRepository,
            novelStoryMemoryRepository,
            novelRepository,
            contentSessionService,
            messageProducerProvider
        );
    }

    @Test
    void mergeScopePatch_updatesCharacterOnly() {
        Map<String, Object> memory = new LinkedHashMap<>();
        memory.put("world", new LinkedHashMap<>(Map.of("设定", "原设定")));
        memory.put("characters", new LinkedHashMap<>(Map.of(
            "张三", new LinkedHashMap<>(Map.of("外貌", "旧外貌"))
        )));

        StoryMemoryService.mergeScopePatch(
            memory,
            "character",
            "张三",
            Map.of("外貌", "新外貌", "性格", "冷静")
        );

        @SuppressWarnings("unchecked")
        Map<String, String> world = (Map<String, String>) memory.get("world");
        assertEquals("原设定", world.get("设定"));

        @SuppressWarnings("unchecked")
        Map<String, Map<String, String>> characters = (Map<String, Map<String, String>>) memory.get("characters");
        assertEquals("新外貌", characters.get("张三").get("外貌"));
        assertEquals("冷静", characters.get("张三").get("性格"));
    }

    @Test
    void persistNovelColdScopePatch_mergesIntoExistingPgRow() throws Exception {
        String existingJson = objectMapper.writeValueAsString(Map.of(
            "novel", Map.of(),
            "world", Map.of("设定", "保持不变"),
            "background", Map.of(),
            "characters", Map.of("李四", Map.of("定位", "配角")),
            "chapters", Map.of()
        ));
        NovelStoryMemoryEntity entity = new NovelStoryMemoryEntity(1L, "n1", existingJson);
        when(novelStoryMemoryRepository.findByUserIdAndNovelId(1L, "n1")).thenReturn(Optional.of(entity));
        when(novelRepository.findByIdAndUserId(eq("n1"), eq(1L))).thenReturn(Optional.of(new NovelEntity()));

        service.persistNovelColdScopePatch(
            "1",
            "n1",
            "character",
            "张三",
            Map.of("外貌", "高挑")
        );

        ArgumentCaptor<NovelStoryMemoryEntity> captor = ArgumentCaptor.forClass(NovelStoryMemoryEntity.class);
        verify(novelStoryMemoryRepository).save(captor.capture());
        @SuppressWarnings("unchecked")
        Map<String, Object> saved = objectMapper.readValue(captor.getValue().getMemoryJson(), Map.class);

        @SuppressWarnings("unchecked")
        Map<String, String> world = (Map<String, String>) saved.get("world");
        assertEquals("保持不变", world.get("设定"));

        @SuppressWarnings("unchecked")
        Map<String, Map<String, String>> characters = (Map<String, Map<String, String>>) saved.get("characters");
        assertEquals("高挑", characters.get("张三").get("外貌"));
        assertEquals("配角", characters.get("李四").get("定位"));
        assertTrue(saved.containsKey("chapters"));
    }
}
