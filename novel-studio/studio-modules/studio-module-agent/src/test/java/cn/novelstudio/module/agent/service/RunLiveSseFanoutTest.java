package cn.novelstudio.module.agent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RunLiveSseFanoutTest {

    @Test
    void duplicatePayloadIsDeliveredOnlyOnce() {
        RunLiveSseFanout fanout = new RunLiveSseFanout(new ObjectMapper());
        List<String> frames = new ArrayList<>();
        String payload = """
            {"event_id":"evt_1","type":"message.delta","sequence":3,"payload":{"text":"hi"}}
            """.trim();

        fanout.register("run_1", frames::add);
        fanout.onLivePayload("run_1", payload);
        fanout.onLivePayload("run_1", payload);

        assertEquals(1, frames.size());
    }

    @Test
    void terminalPayloadCompletesOnlyOnce() {
        RunLiveSseFanout fanout = new RunLiveSseFanout(new ObjectMapper());
        List<String> frames = new ArrayList<>();
        List<String> terminalPayloads = new ArrayList<>();
        String payload = """
            {"event_id":"evt_done","type":"run.completed","sequence":10,"payload":{"status":"completed"}}
            """.trim();

        fanout.register("run_1", frames::add);
        fanout.registerTerminalHandler("run_1", terminalPayloads::add);
        fanout.onLivePayload("run_1", payload);
        fanout.onLivePayload("run_1", payload);

        assertEquals(2, frames.size());
        assertEquals(1, terminalPayloads.size());
    }
}
