package cn.novelstudio.platform.scheduling;

import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.util.Optional;

/** 当前实例标识，写入 scheduled_job_run.instance_id。 */
@Component
public class SchedulingInstanceId {

    private final String value;

    public SchedulingInstanceId(StudioSchedulingProperties properties) {
        String configured = properties.getInstanceId();
        if (configured != null && !configured.isBlank()) {
            this.value = configured.trim();
        } else {
            this.value = Optional.ofNullable(System.getenv("HOSTNAME"))
                .filter(s -> !s.isBlank())
                .orElseGet(this::localHostName);
        }
    }

    public String get() {
        return value;
    }

    private String localHostName() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (Exception ex) {
            return "unknown";
        }
    }
}
