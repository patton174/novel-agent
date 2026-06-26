package cn.novelstudio.module.content.support;

import cn.novelstudio.module.content.dto.ChapterDTO;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.OutputStream;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * NDJSON stream for Agent ReadChapter — one JSON object per line.
 * {@code meta} → {@code delta}* → {@code done}.
 */
public final class ChapterReadStreamWriter {

    private static final ObjectMapper JSON = new ObjectMapper();

    private ChapterReadStreamWriter() {}

    public record SliceView(
        ChapterDTO chapter,
        int listIndex,
        String[] sliceLines,
        int offsetOut,
        int totalLines,
        int returnedLines,
        boolean hasMore,
        Integer nextOffset
    ) {}

    public static void write(OutputStream out, SliceView view, String readMoreFooter) throws IOException {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("type", "meta");
        meta.put("chapterId", view.chapter().id());
        meta.put("listIndex", view.listIndex());
        meta.put("title", view.chapter().title());
        meta.put("totalLines", view.totalLines());
        meta.put("offset", view.offsetOut());
        meta.put("returnedLines", view.returnedLines());
        meta.put("hasMore", view.hasMore());
        if (view.nextOffset() != null) {
            meta.put("nextOffset", view.nextOffset());
        }
        writeLine(out, meta);

        for (int i = 0; i < view.sliceLines().length; i++) {
            String delta = String.format("%6d\t%s%n", view.offsetOut() + i, view.sliceLines()[i]);
            writeLine(out, Map.of("type", "delta", "text", delta));
        }
        if (view.hasMore() && view.nextOffset() != null && readMoreFooter != null && !readMoreFooter.isBlank()) {
            writeLine(out, Map.of("type", "delta", "text", readMoreFooter));
        }
        writeLine(out, Map.of("type", "done"));
    }

    private static void writeLine(OutputStream out, Map<String, Object> obj) throws IOException {
        out.write(JSON.writeValueAsBytes(obj));
        out.write('\n');
        out.flush();
    }
}
