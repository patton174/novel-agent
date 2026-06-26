package cn.novelstudio.platform.storage;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

import java.util.List;

/**
 * 上传存储与校验配置，绑定 {@code app.upload.*}。
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "app.upload")
public class UploadStorageProperties {

    private String storageDir = "./data/uploads";

    private DataSize maxFileSize = DataSize.ofMegabytes(50);

    private List<String> allowedFormats = List.of("txt", "md", "markdown", "epub", "pdf", "docx");
}
