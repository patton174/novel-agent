package cn.novelstudio.platform.web.clientsecurity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

final class RewrittenPathHttpServletRequest extends HttpServletRequestWrapper {

    private final String path;
    private final String query;

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
}
