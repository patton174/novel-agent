package cn.novelstudio.platform.scheduling;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "studio.scheduling")
public class StudioSchedulingProperties {

    /** 是否启用分布式定时任务（多实例时仅持锁节点执行）。 */
    private boolean enabled = true;

    /** 默认任务锁 TTL（秒），应大于单次任务最长执行时间。 */
    private long defaultLockSeconds = 300;
}
