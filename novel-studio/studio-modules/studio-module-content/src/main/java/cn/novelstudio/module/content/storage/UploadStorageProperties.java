package cn.novelstudio.module.content.storage;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;

import java.util.List;

/**
 * 上传存储与校验配置，绑定 {@code app.upload.*}。
 *
 * <p>注意：{@code maxFileSize} 用 {@link DataSize} 以支持 yaml 形如 {@code 50MB} 的字面量
 * （plan 原稿为 {@code long}，但 {@code 50MB} 无法绑定到 long，故改用 Spring 原生 DataSize）。
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.upload")
public class UploadStorageProperties {

    /** 落盘根目录。 */
    private String storageDir = "./data/uploads";

    /** 单文件大小上限（默认 50MB）。 */
    private DataSize maxFileSize = DataSize.ofMegabytes(50);

    /** 允许的格式（扩展名小写）。 */
    private List<String> allowedFormats = List.of("txt", "md", "markdown", "epub", "pdf", "docx");
}
