package com.novel.agent.pyai.support;

import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;

/**
 * Aggregates arbitrary text chunks into complete SSE frames (delimited by {@code \n\n}).
 */
public final class SseFrameAggregator {

    static final String FRAME_DELIMITER = "\n\n";

    private SseFrameAggregator() {}

    public static Flux<String> aggregate(Flux<String> chunks) {
        StringBuilder buffer = new StringBuilder();
        return chunks
            .concatMap(chunk -> {
                buffer.append(chunk);
                return drainCompleteFrames(buffer);
            })
            .concatWith(Flux.defer(() -> drainTail(buffer)));
    }

    private static Flux<String> drainCompleteFrames(StringBuilder buffer) {
        List<String> frames = new ArrayList<>();
        int delimiterIndex;
        while ((delimiterIndex = buffer.indexOf(FRAME_DELIMITER)) >= 0) {
            int frameEnd = delimiterIndex + FRAME_DELIMITER.length();
            frames.add(buffer.substring(0, frameEnd));
            buffer.delete(0, frameEnd);
        }
        return Flux.fromIterable(frames);
    }

    private static Flux<String> drainTail(StringBuilder buffer) {
        if (buffer.isEmpty()) {
            return Flux.empty();
        }
        String tail = buffer.toString();
        buffer.setLength(0);
        if (!tail.endsWith(FRAME_DELIMITER)) {
            tail = tail + FRAME_DELIMITER;
        }
        return Flux.just(tail);
    }
}
