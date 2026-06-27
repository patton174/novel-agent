package cn.novelstudio.module.agent.support;

import cn.novelstudio.module.content.support.ContentLegacyDefaults;
import cn.novelstudio.platform.i18n.StudioMessages;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Cross-locale text markers for session titles, onboarding bubbles, and interaction filtering.
 */
@Component
public class AgentLocaleMarkers {

    private static final Locale ZH = Locale.forLanguageTag("zh-CN");
    private static final Locale EN = Locale.ENGLISH;

    private static final Pattern READ_CHAPTER_TITLE = Pattern.compile("^Read:\\s*#", Pattern.CASE_INSENSITIVE);
    private static final Pattern SIGNATURE_JSON_TITLE = Pattern.compile("^\\{'signature'");

    private final StudioMessages messages;
    private final List<String> onboardingMarkers;
    private final List<String> boilerplateTitlePrefixes;
    private final List<String> awaitingReplyMarkers;
    private final String uiLineLabelAlternation;

    public AgentLocaleMarkers(StudioMessages messages) {
        this.messages = messages;
        this.onboardingMarkers = distinctNonBlank(
            localeVariants("agent.text.marker.creating"),
            localeVariants("agent.text.marker.read_intro"),
            localeVariants("agent.text.marker.describe_scene"),
            localeVariants("agent.text.marker.worldview_mode")
        );
        this.boilerplateTitlePrefixes = distinctNonBlank(
            localeVariants("agent.session.title.boilerplate.empty_context"),
            localeVariants("agent.session.title.boilerplate.deletion")
        );
        this.awaitingReplyMarkers = distinctNonBlank(
            localeVariants("agent.interaction.awaiting_reply")
        );
        this.uiLineLabelAlternation = buildAlternation(localeVariants("agent.text.ui_line_labels"));
    }

    public boolean isOnboardingAssistantText(String raw) {
        if (raw == null || raw.isBlank()) {
            return false;
        }
        String text = raw.trim();
        for (String marker : onboardingMarkers) {
            if (text.contains(marker)) {
                return true;
            }
        }
        return false;
    }

    public boolean needsGeneratedSessionTitle(String title) {
        if (ContentLegacyDefaults.isPlaceholderSessionTitle(title)) {
            return true;
        }
        if (title == null || title.isBlank()) {
            return true;
        }
        String trimmed = title.trim();
        for (String prefix : boilerplateTitlePrefixes) {
            if (trimmed.startsWith(prefix)) {
                return true;
            }
        }
        if (READ_CHAPTER_TITLE.matcher(trimmed).find()) {
            return true;
        }
        if (SIGNATURE_JSON_TITLE.matcher(trimmed).find()) {
            return true;
        }
        return false;
    }

    public boolean isNonPersistableInteractionLine(String line) {
        if (line == null || line.isBlank()) {
            return true;
        }
        for (String marker : awaitingReplyMarkers) {
            if (line.contains(marker) || line.toLowerCase().contains(marker.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        if (line.startsWith("AskUser") || line.startsWith("ask_user")) {
            return true;
        }
        // Tool trace summaries like "Glob：…" / "Read：…" must not land in the user bubble.
        return line.matches("^[A-Za-z][A-Za-z0-9_\\-]{0,31}：.+");
    }

    public String uiLineLabelAlternation() {
        return uiLineLabelAlternation;
    }

    public String truncateSessionTitle(String content) {
        if (content == null || content.isBlank()) {
            return messages.get("content.session.default_title");
        }
        String clean = content.replaceAll("\\s+", " ").trim();
        int maxLen = 18;
        if (clean.length() <= maxLen) {
            return clean;
        }
        return clean.substring(0, maxLen) + messages.get("agent.session.title.truncated_suffix");
    }

    private List<String> localeVariants(String key) {
        List<String> variants = new ArrayList<>(2);
        addLocalizedValue(variants, messages.get(key, ZH));
        addLocalizedValue(variants, messages.get(key, EN));
        addLocalizedValue(variants, messages.get(key));
        return variants;
    }

    private static void addLocalizedValue(List<String> target, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        if (value.contains("|")) {
            for (String part : value.split("\\|")) {
                addMarker(target, part);
            }
            return;
        }
        addMarker(target, value);
    }

    private static void addMarker(List<String> target, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        target.add(value.trim());
    }

    @SafeVarargs
    private static List<String> distinctNonBlank(List<String>... groups) {
        List<String> out = new ArrayList<>();
        for (List<String> group : groups) {
            for (String item : group) {
                if (item != null && !item.isBlank() && !out.contains(item)) {
                    out.add(item);
                }
            }
        }
        return out;
    }

    private static String buildAlternation(List<String> rawValues) {
        List<String> labels = new ArrayList<>();
        for (String raw : rawValues) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            for (String part : raw.split("\\|")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty() && !labels.contains(trimmed)) {
                    labels.add(trimmed);
                }
            }
        }
        if (labels.isEmpty()) {
            return "Thinking|Tool call|Skill call|Writing body";
        }
        return String.join("|", labels.stream().map(Pattern::quote).toList());
    }
}
