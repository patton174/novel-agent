package cn.novelstudio.platform.web.clientsecurity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class RewrittenPathHttpServletRequest extends HttpServletRequestWrapper {

    private final String path;
    private final String query;
    private Map<String, String[]> parameterMap;

    RewrittenPathHttpServletRequest(HttpServletRequest request, String path, String query) {
        super(request);
        this.path = path.startsWith("/") ? path : "/" + path;
        this.query = query;
    }

    @Override
    public String getRequestURI() {
        return path;
    }

    @Override
    public String getServletPath() {
        return path;
    }

    @Override
    public String getPathInfo() {
        return null;
    }

    @Override
    public StringBuffer getRequestURL() {
        StringBuffer url = new StringBuffer();
        String scheme = getScheme();
        int port = getServerPort();
        url.append(scheme).append("://").append(getServerName());
        if (("http".equals(scheme) && port != 80) || ("https".equals(scheme) && port != 443)) {
            url.append(':').append(port);
        }
        url.append(path);
        return url;
    }

    @Override
    public String getQueryString() {
        return query;
    }

    @Override
    public String getParameter(String name) {
        String[] values = parsedParameters().get(name);
        return values != null && values.length > 0 ? values[0] : null;
    }

    @Override
    public Map<String, String[]> getParameterMap() {
        return Collections.unmodifiableMap(parsedParameters());
    }

    @Override
    public Enumeration<String> getParameterNames() {
        return Collections.enumeration(parsedParameters().keySet());
    }

    @Override
    public String[] getParameterValues(String name) {
        return parsedParameters().get(name);
    }

    private Map<String, String[]> parsedParameters() {
        if (parameterMap == null) {
            parameterMap = parseQueryParameters(query);
        }
        return parameterMap;
    }

    private static Map<String, String[]> parseQueryParameters(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) {
            return Map.of();
        }
        Map<String, List<String>> grouped = new LinkedHashMap<>();
        for (String pair : rawQuery.split("&")) {
            if (pair.isBlank()) {
                continue;
            }
            int eq = pair.indexOf('=');
            String key = decodeComponent(eq >= 0 ? pair.substring(0, eq) : pair);
            String value = eq >= 0 ? decodeComponent(pair.substring(eq + 1)) : "";
            grouped.computeIfAbsent(key, ignored -> new ArrayList<>()).add(value);
        }
        Map<String, String[]> out = new LinkedHashMap<>();
        grouped.forEach((key, values) -> out.put(key, values.toArray(String[]::new)));
        return out;
    }

    private static String decodeComponent(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}
