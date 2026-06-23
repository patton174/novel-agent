package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.repository.MemoryNodeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemoryNodeServiceTest {

    @Mock
    private MemoryNodeRepository repository;

    @InjectMocks
    private MemoryNodeService service;

    @Test
    void buildAllScopesTreeIndex_returnsScopesFromDistinctJpql() {
        when(repository.findDistinctScopesByNovel(7L, "novel-1")).thenReturn(List.of("角色设定"));
        when(repository.findSummaryRowsByScope(eq(7L), eq("novel-1"), eq("角色设定")))
            .thenReturn(List.of(new Object[] {
                "root-1",
                "novel-1",
                "角色设定",
                null,
                0,
                "角色设定",
                "both",
                null,
                null,
            }, new Object[] {
                "child-1",
                "novel-1",
                "角色设定",
                "root-1",
                1,
                "林逸",
                "leaf",
                null,
                null,
            }));

        Map<String, Object> index = service.buildAllScopesTreeIndex(7L, "novel-1");

        assertFalse(index.isEmpty());
        @SuppressWarnings("unchecked")
        Map<String, Object> tree = (Map<String, Object>) index.get("角色设定");
        assertEquals(2, tree.get("count"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> roots = (List<Map<String, Object>>) tree.get("nodes");
        assertEquals(1, roots.size());
        assertEquals("root-1", roots.get(0).get("memory_id"));
    }
}
