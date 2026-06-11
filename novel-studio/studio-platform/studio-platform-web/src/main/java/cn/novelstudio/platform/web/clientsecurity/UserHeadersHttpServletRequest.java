package cn.novelstudio.platform.web.clientsecurity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

final class UserHeadersHttpServletRequest extends HttpServletRequestWrapper {

    private final Map<String, String> extraHeaders;

    UserHeadersHttpServletRequest(HttpServletRequest request, Map<String, String> extraHeaders) {
        super(request);
        this.extraHeaders = new HashMap<>();
        extraHeaders.forEach((k, v) -> {
            if (v != null && !v.isBlank()) {
                this.extraHeaders.put(k, v);
            }
        });
    }

    @Override
    public String getHeader(String name) {
        String value = extraHeaders.get(name);
        return value != null ? value : super.getHeader(name);
    }

    @Override
    public Enumeration<String> getHeaders(String name) {
        if (extraHeaders.containsKey(name)) {
            return Collections.enumeration(List.of(extraHeaders.get(name)));
        }
        return super.getHeaders(name);
    }
}
