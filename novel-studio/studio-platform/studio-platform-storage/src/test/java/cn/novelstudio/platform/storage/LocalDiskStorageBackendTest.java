package cn.novelstudio.platform.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalDiskStorageBackendTest {

    @Test
    void save_load_delete_roundtrip(@TempDir Path tmp) throws Exception {
        UploadStorageProperties props = new UploadStorageProperties();
        props.setStorageDir(tmp.toString());
        LocalDiskStorageBackend storage = new LocalDiskStorageBackend(props);
        byte[] data = "hello".getBytes();
        storage.save(new ByteArrayInputStream(data), "2026/06/19/abc.epub");
        assertThat(storage.exists("2026/06/19/abc.epub")).isTrue();
        byte[] loaded = storage.load("2026/06/19/abc.epub").readAllBytes();
        assertThat(loaded).isEqualTo(data);
        storage.delete("2026/06/19/abc.epub");
        assertThat(storage.exists("2026/06/19/abc.epub")).isFalse();
    }

    @Test
    void save_rejectsPathTraversal(@TempDir Path tmp) {
        UploadStorageProperties props = new UploadStorageProperties();
        props.setStorageDir(tmp.toString());
        LocalDiskStorageBackend storage = new LocalDiskStorageBackend(props);
        assertThatThrownBy(() ->
            storage.save(new ByteArrayInputStream("x".getBytes()), "../evil.txt")
        ).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void save_createsNestedDirectories(@TempDir Path tmp) throws Exception {
        UploadStorageProperties props = new UploadStorageProperties();
        props.setStorageDir(tmp.toString());
        LocalDiskStorageBackend storage = new LocalDiskStorageBackend(props);
        storage.save(new ByteArrayInputStream("d".getBytes()), "a/b/c.txt");
        assertThat(Files.exists(tmp.resolve("a/b/c.txt"))).isTrue();
    }
}
