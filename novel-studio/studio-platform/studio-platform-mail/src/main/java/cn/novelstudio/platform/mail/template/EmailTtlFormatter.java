package cn.novelstudio.platform.mail.template;

import cn.novelstudio.platform.i18n.StudioMessages;
import org.springframework.stereotype.Component;

@Component
public class EmailTtlFormatter {

    private final StudioMessages messages;

    public EmailTtlFormatter(StudioMessages messages) {
        this.messages = messages;
    }

    public String formatLabel(long ttlSeconds) {
        if (ttlSeconds <= 0) {
            return messages.get("mail.ttl.limited");
        }
        if (ttlSeconds % 86_400 == 0) {
            return messages.get("mail.ttl.days", ttlSeconds / 86_400);
        }
        if (ttlSeconds % 3_600 == 0) {
            return messages.get("mail.ttl.hours", ttlSeconds / 3_600);
        }
        if (ttlSeconds % 60 == 0) {
            return messages.get("mail.ttl.minutes", ttlSeconds / 60);
        }
        return messages.get("mail.ttl.seconds", ttlSeconds);
    }
}
