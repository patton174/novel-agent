package cn.novelstudio.platform.web.clientsecurity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

final class RewrittenPathHttpServletRequest extends HttpServletRequestWrapper {

    private final String path;
    private final String query;

    RewrittenPathHttpServletRequest(HttpServletRequest request, String path, String query) {
        super(request);
        this.path = path;
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
    public String getQueryString() {
        return query;
    }
}
