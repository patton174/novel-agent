package cn.novelstudio.platform.storage;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;

@AutoConfiguration
@EnableConfigurationProperties(UploadStorageProperties.class)
@ComponentScan(basePackages = "cn.novelstudio.platform.storage")
public class StorageAutoConfiguration {
}
