package cn.novelstudio.module.upload.service;

import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.upload.bridge.UploadCatalogBridge;
import cn.novelstudio.module.upload.entity.UploadedFileEntity;
import cn.novelstudio.module.upload.repository.UploadedFileRepository;
import cn.novelstudio.platform.i18n.ResultLocalizer;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import cn.novelstudio.platform.storage.StorageBackend;
import cn.novelstudio.platform.storage.UploadStorageProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UploadServiceTest {

    UploadedFileRepository fileRepo;
    UploadCatalogBridge catalogBridge;
    StorageBackend storage;
    UploadStorageProperties props;
    ObjectProvider<IMessageProducer> producerProvider;
    StringRedisTemplate redis;
    ResultLocalizer resultLocalizer;
    UploadService svc;

    @BeforeEach
    void setup(@TempDir Path tmp) {
        fileRepo = mock(UploadedFileRepository.class);
        catalogBridge = mock(UploadCatalogBridge.class);
        storage = mock(StorageBackend.class);
        props = new UploadStorageProperties();
        props.setStorageDir(tmp.toString());
        producerProvider = mock(ObjectProvider.class);
        when(producerProvider.getIfAvailable()).thenReturn(null);
        redis = mock(StringRedisTemplate.class);
        when(redis.opsForValue()).thenReturn(mock(ValueOperations.class));
        resultLocalizer = mock(ResultLocalizer.class);
        when(resultLocalizer.resolveLiteral(any())).thenAnswer(inv -> inv.getArgument(0));
        svc = new UploadService(
            fileRepo, catalogBridge, storage, props, producerProvider, redis, resultLocalizer, null
        );
    }

    @Test
    void resolveFormat_lowercasesExtension() {
        assertThat(svc.resolveFormat("Book.EPUB")).isEqualTo("epub");
    }

    @Test
    void resolveFormat_normalizesMarkdownToMd() {
        assertThat(svc.resolveFormat("notes.markdown")).isEqualTo("md");
    }

    @Test
    void resolveFormat_rejectsMissingExtension() {
        assertThatThrownBy(() -> svc.resolveFormat("noext"))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("upload.missing_extension");
    }

    @Test
    void resolveFormat_rejectsUnknown() {
        assertThatThrownBy(() -> svc.resolveFormat("a.zip"))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("upload.format_unsupported");
    }

    @Test
    void buildStorageKey_isDatedWithUuid_noOriginalName() {
        String key = svc.buildStorageKey("my book.epub");
        assertThat(key).matches("\\d{4}/\\d{2}/\\d{2}/[\\w-]+\\.epub");
        assertThat(key).doesNotContain("my book");
    }

    @Test
    void requireOwned_throws_whenFileMissing() {
        when(fileRepo.findById("nope")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> svc.requireOwned("nope", 10L, "user"))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("upload.file_not_found");
    }

    @Test
    void requireOwned_userCannotAccessOthersFile() {
        UploadedFileEntity e = new UploadedFileEntity();
        e.setOwnerId(99L);
        when(fileRepo.findById("f1")).thenReturn(Optional.of(e));
        assertThatThrownBy(() -> svc.requireOwned("f1", 10L, "user"))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("upload.file_forbidden");
    }

    @Test
    void createUpload_savesPendingAndPublishes() {
        UploadedFileEntity saved = new UploadedFileEntity();
        saved.setId("fid");
        saved.setStatus("pending");
        saved.setOwnerId(10L);
        saved.setOwnerType("user");
        when(fileRepo.save(any())).thenReturn(saved);

        String id = svc.createUpload(10L, "user", "a.epub", "application/epub", 100L,
            new java.io.ByteArrayInputStream("x".getBytes()), "epub");

        assertThat(id).isEqualTo("fid");
        verify(storage).save(any(), any());
        verify(fileRepo).save(any());
    }
}
