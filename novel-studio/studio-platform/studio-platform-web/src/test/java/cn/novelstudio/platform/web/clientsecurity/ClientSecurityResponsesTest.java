package cn.novelstudio.platform.web.clientsecurity;

import cn.novelstudio.platform.i18n.AppLocale;
import cn.novelstudio.platform.i18n.I18nProperties;
import cn.novelstudio.platform.i18n.LocaleContext;
import cn.novelstudio.platform.i18n.ResultLocalizer;
import cn.novelstudio.platform.i18n.StudioMessages;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ClientSecurityResponsesTest {

    private ClientSecurityResponses responses;

    @BeforeEach
    void setUp() {
        ReloadableResourceBundleMessageSource source = new ReloadableResourceBundleMessageSource();
        source.setBasenames("classpath:i18n/messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        StudioMessages messages = new StudioMessages(source);
        I18nProperties properties = new I18nProperties();
        properties.setEnabled(true);
        responses = new ClientSecurityResponses(messages, new ResultLocalizer(messages, properties));
        LocaleContext.set(AppLocale.EN);
    }

    @AfterEach
    void tearDown() {
        LocaleContext.clear();
    }

    @Test
    void resolvesDirectMessageKey() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        responses.badRequest(response, "security.client.replay_window");
        assertTrue(response.getContentAsString().contains("Request expired"));
    }

    @Test
    void resolvesLegacyProtocolAlias() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        responses.badRequest(response, "REPLAY_WINDOW");
        assertTrue(response.getContentAsString().contains("Request expired"));
    }
}
