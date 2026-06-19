package com.novel.agent.pyai.orchestration;

import java.util.Map;
import java.util.Set;

/**
 * CC tool visibility — keep in sync with python-ai {@code cc_visibility.py}
 * and frontend {@code agentOrchestration.ts} / {@code agentToolNames.ts}.
 */
public final class CcToolVisibility {

    private static final Set<String> HIDDEN_UI_TOOLS = Set.of(
        "output", "end", "PlanResult", "StepResult", "Brief", "TodoWrite"
    );

    private static final Set<String> LEGACY_HIDDEN_TOOLS = Set.of(
        "orchestrator", "plan", "write_chapter"
    );

    private static final Map<String, String> LEGACY_ALIASES = Map.ofEntries(
        Map.entry("chapter_list", "Glob"),
        Map.entry("chapter_read", "Read"),
        Map.entry("chapter_create", "Write"),
        Map.entry("chapter_update", "Edit"),
        Map.entry("chapter_delete", "Delete"),
        Map.entry("memory_read", "Read"),
        Map.entry("memory_create", "Write"),
        Map.entry("memory_update", "Edit"),
        Map.entry("memory_delete", "Delete"),
        Map.entry("memory_patch", "Edit"),
        Map.entry("choose", "AskUser"),
        Map.entry("ask_user", "AskUser"),
        Map.entry("context_search", "Grep")
    );

    private CcToolVisibility() {}

    public static boolean isHiddenUiTool(String tool) {
        if (tool == null || tool.isBlank()) {
            return false;
        }
        String name = tool.trim();
        return HIDDEN_UI_TOOLS.contains(name) || LEGACY_HIDDEN_TOOLS.contains(name);
    }

    /**
     * Hidden tools omit tool.started/progress, but tool.completed must reach the client when it
     * carries UI state (e.g. TodoWrite {@code todos} for the message todo panel).
     */
    public static boolean shouldForwardToolCompletedToClient(String tool) {
        return "TodoWrite".equals(tool == null ? "" : tool.trim());
    }

    public static boolean isAskUserTool(String tool) {
        if (tool == null || tool.isBlank()) {
            return false;
        }
        String name = tool.trim();
        return "AskUser".equals(name) || "ask_user".equals(name) || "choose".equals(name);
    }

    /**
     * Do not forward {@code step.started} for AskUser — UI uses {@code tool.started/completed}.
     */
    public static boolean shouldSkipStepStartedForward(String tool) {
        return isAskUserTool(tool);
    }

    /**
     * Bridge {@code step.llm.delta} to {@code message.delta} (legacy {@code output} tool only).
     */
    public static boolean shouldBridgeLlmToChat(String tool) {
        return "output".equals(tool);
    }

    public static boolean isMemoryVfsPath(String path) {
        return path != null && path.contains("/memory/");
    }

    public static String normalizeToolName(String tool) {
        if (tool == null || tool.isBlank()) {
            return "";
        }
        String name = tool.trim();
        return LEGACY_ALIASES.getOrDefault(name, name);
    }
}
