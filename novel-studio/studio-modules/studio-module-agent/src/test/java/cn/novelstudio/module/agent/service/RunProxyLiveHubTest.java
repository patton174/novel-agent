package cn.novelstudio.module.agent.service;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RunProxyLiveHubTest {

    @Test
    void publish_reachesPrimaryAndResumeSink() {
        RunProxyLiveHub hub = new RunProxyLiveHub();
        List<String> primary = new ArrayList<>();
        List<String> resume = new ArrayList<>();
        hub.attach("run-1", primary::add);
        hub.attach("run-1", resume::add);

        hub.publish("run-1", "event: agent-event\ndata: {}\n\n");

        assertEquals(1, primary.size());
        assertEquals(1, resume.size());
    }

    @Test
    void detach_stopsDelivery() {
        RunProxyLiveHub hub = new RunProxyLiveHub();
        List<String> primary = new ArrayList<>();
        java.util.function.Consumer<String> sink = primary::add;
        hub.attach("run-1", sink);
        hub.detach("run-1", sink);

        hub.publish("run-1", "event: agent-event\ndata: {}\n\n");

        assertTrue(primary.isEmpty());
    }

    @Test
    void streamEnd_marksTerminal() {
        RunProxyLiveHub hub = new RunProxyLiveHub();
        List<String> resume = new ArrayList<>();
        hub.attach("run-1", resume::add);
        hub.publish("run-1", "event: stream-end\ndata: done\n\n");

        resume.clear();
        hub.attach("run-1", resume::add);
        hub.publish("run-1", "event: agent-event\ndata: {}\n\n");
        assertTrue(resume.isEmpty());
    }

    @Test
    void resumeSinkCompletesOnStreamEnd() {
        RunProxyLiveHub hub = new RunProxyLiveHub();
        AtomicBoolean done = new AtomicBoolean(false);
        hub.attach("run-1", frame -> {
            if (frame.startsWith("event: stream-end")) {
                done.set(true);
            }
        });
        hub.publish("run-1", "event: stream-end\ndata: done\n\n");
        assertTrue(done.get());
    }
}
