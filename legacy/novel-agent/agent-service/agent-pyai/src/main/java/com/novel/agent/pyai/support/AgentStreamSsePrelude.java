package com.novel.agent.pyai.support;

import java.util.UUID;

/**
 * Immediate SSE frame so clients receive bytes before the Python agent stream connects.
 */
public final class AgentStreamSsePrelude {

    public static final String EVENT_GATEWAY_CONNECTED = "gateway.connected";

    private AgentStreamSsePrelude() {}

    public static String connectedFrame() {
        String eventId = "evt_pyai_" + UUID.randomUUID().toString().replace("-", "");
        String data = String.format(
            "{\"event_id\":\"%s\",\"type\":\"%s\",\"payload\":{\"status\":\"accepted\"}}",
            eventId,
            EVENT_GATEWAY_CONNECTED
        );
        return "event: agent-event\ndata: " + data + "\n\n";
    }
}
