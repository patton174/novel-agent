package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.KgEntityEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KgEntityRepositoryTest {

    @Mock
    KgEntityRepository repo;

    @Test
    void findByNovelId_returnsEntities() {
        KgEntityEntity e = new KgEntityEntity();
        e.setId("e1");
        e.setNovelId("n1");
        e.setName("林动");
        e.setType("character");
        when(repo.findByNovelId("n1")).thenReturn(List.of(e));

        List<KgEntityEntity> list = repo.findByNovelId("n1");

        assertThat(list).hasSize(1).extracting(KgEntityEntity::getName).contains("林动");
    }

    @Test
    void existsByNovelIdAndName_detects() {
        when(repo.existsByNovelIdAndName("n2", "张三")).thenReturn(true);
        when(repo.existsByNovelIdAndName("n2", "李四")).thenReturn(false);

        assertThat(repo.existsByNovelIdAndName("n2", "张三")).isTrue();
        assertThat(repo.existsByNovelIdAndName("n2", "李四")).isFalse();
    }

    @Test
    void findByNovelIdAndName_returnsOptional() {
        KgEntityEntity e = new KgEntityEntity();
        e.setId("e3");
        e.setNovelId("n3");
        e.setName("王五");
        e.setType("character");
        when(repo.findByNovelIdAndName("n3", "王五")).thenReturn(Optional.of(e));

        assertThat(repo.findByNovelIdAndName("n3", "王五")).isPresent();
        verify(repo).findByNovelIdAndName("n3", "王五");
    }
}
