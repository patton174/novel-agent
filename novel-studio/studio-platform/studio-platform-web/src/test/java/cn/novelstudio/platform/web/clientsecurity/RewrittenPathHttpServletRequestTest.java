package cn.novelstudio.platform.web.clientsecurity;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RewrittenPathHttpServletRequestTest {

    @Test
    void exposesBusinessQueryParametersAfterRouteRewrite() {
        HttpServletRequest original = mock(HttpServletRequest.class);
        when(original.getQueryString()).thenReturn("_na_t=1&_na_n=n&_na_k=k&_na_s=s");

        RewrittenPathHttpServletRequest request = new RewrittenPathHttpServletRequest(
            original,
            "/api/content/auth/novels/novel-1/memory-nodes/flat",
            "scope=%E6%95%85%E4%BA%8B%E5%A4%A7%E7%BA%B2&includeContent=false&_na_t=1&_na_n=n&_na_k=k&_na_s=s"
        );

        assertEquals("故事大纲", request.getParameter("scope"));
        assertEquals("false", request.getParameter("includeContent"));
        assertNull(original.getParameter("scope"));
    }
}
