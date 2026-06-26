package cn.novelstudio.platform.scheduling;

import cn.novelstudio.platform.scheduling.batch.BatchJobHistoryStore;
import cn.novelstudio.platform.scheduling.batch.RabbitBatchJobDispatcher;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableScheduling;

@AutoConfiguration
@EnableScheduling
@EnableConfigurationProperties(StudioSchedulingProperties.class)
@ComponentScan(basePackageClasses = {StudioJobRunner.class, StudioJobRegistrar.class, StudioJobCatalog.class, BatchJobHistoryStore.class})
@Import(RabbitBatchJobDispatcher.class)
public class StudioSchedulingAutoConfiguration {
}
