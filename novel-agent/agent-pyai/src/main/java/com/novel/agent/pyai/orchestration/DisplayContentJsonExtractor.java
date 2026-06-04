package com.novel.agent.pyai.orchestration;

/**
 * Incrementally extract {@code display.content} string from partial StepResult JSON.
 */
public final class DisplayContentJsonExtractor {

    private final StringBuilder buffer = new StringBuilder();
    private String decodedEmitted = "";

    public String feed(String chunk) {
        if (chunk == null || chunk.isEmpty()) {
            return "";
        }
        buffer.append(chunk);
        String decoded = extractContentPartial();
        if (decoded == null || decoded.length() <= decodedEmitted.length()) {
            return "";
        }
        String delta = decoded.substring(decodedEmitted.length());
        decodedEmitted = decoded;
        return delta;
    }

    private String extractContentPartial() {
        String buf = buffer.toString();
        int displayIdx = buf.indexOf("\"display\"");
        if (displayIdx < 0) {
            return null;
        }
        int contentKey = buf.indexOf("\"content\"", displayIdx);
        if (contentKey < 0) {
            return null;
        }
        int colon = buf.indexOf(':', contentKey + "\"content\"".length());
        if (colon < 0) {
            return null;
        }
        int i = colon + 1;
        while (i < buf.length() && Character.isWhitespace(buf.charAt(i))) {
            i++;
        }
        if (i >= buf.length() || buf.charAt(i) != '"') {
            return null;
        }
        return parseJsonString(buf, i);
    }

    private String parseJsonString(String buf, int start) {
        if (buf.charAt(start) != '"') {
            return null;
        }
        int i = start + 1;
        StringBuilder out = new StringBuilder();
        while (i < buf.length()) {
            char c = buf.charAt(i);
            if (c == '"') {
                return out.toString();
            }
            if (c == '\\') {
                if (i + 1 >= buf.length()) {
                    return out.toString();
                }
                char n = buf.charAt(i + 1);
                switch (n) {
                    case 'n' -> out.append('\n');
                    case 'r' -> out.append('\r');
                    case 't' -> out.append('\t');
                    case '"', '\\', '/' -> out.append(n);
                    case 'u' -> {
                        if (i + 5 >= buf.length()) {
                            return out.toString();
                        }
                        try {
                            out.append((char) Integer.parseInt(buf.substring(i + 2, i + 6), 16));
                        } catch (NumberFormatException ex) {
                            out.append(n);
                        }
                    }
                    default -> out.append(n);
                }
                i += n == 'u' ? 6 : 2;
                continue;
            }
            out.append(c);
            i++;
        }
        return out.toString();
    }
}
