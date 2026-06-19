package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.content.service.agent.RunLiveLocalEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class RunLiveLocalEventListener {

    private final RunLiveRedisSubscriber runLiveRedisSubscriber;

    public RunLiveLocalEventListener(RunLiveRedisSubscriber runLiveRedisSubscriber) {
        this.runLiveRedisSubscriber = runLiveRedisSubscriber;
    }

    @EventListener
    public void onRunLiveLocalEvent(RunLiveLocalEvent event) {
        if (event == null) {
            return;
        }
        runLiveRedisSubscriber.onLocalPayload(event.runId(), event.payloadJson());
    }
}
