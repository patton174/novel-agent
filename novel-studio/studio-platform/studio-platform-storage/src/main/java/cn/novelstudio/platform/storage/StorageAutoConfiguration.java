package cn.novelstudio.platform.storage;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;

@AutoConfiguration
@EnableConfigurationProperties(UploadStorageProperties.class)
@ComponentScan(basePackageClasses = LocalDiskStorageBackend.class)
public class StorageAutoConfiguration {
}
