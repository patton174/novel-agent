package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.SiteDanmakuCreateReq;
import cn.novelstudio.module.billing.dto.SiteDanmakuResp;
import cn.novelstudio.module.billing.entity.SiteDanmakuEntity;
import cn.novelstudio.module.billing.repository.SiteDanmakuRepository;
import cn.novelstudio.module.billing.support.IpRegionResolver;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.platform.i18n.AppLocale;
import cn.novelstudio.platform.i18n.LocaleContext;
import cn.novelstudio.platform.i18n.StudioMessages;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SiteDanmakuBizTest {

    @AfterEach
    void tearDown() {
        LocaleContext.clear();
    }

    private static StudioMessages stubMessages() {
        StudioMessages messages = mock(StudioMessages.class);
        when(messages.get(anyString())).thenAnswer(inv -> inv.getArgument(0));
        when(messages.get(anyString(), any())).thenAnswer(inv -> inv.getArgument(0));
        return messages;
    }

    @Test
    void rejectsDuplicateDanmakuForSameUser() {
        SiteDanmakuRepository repo = mock(SiteDanmakuRepository.class);
        IpRegionResolver ip = mock(IpRegionResolver.class);
        when(repo.existsByUserId(7L)).thenReturn(true);

        SiteDanmakuBiz biz = new SiteDanmakuBiz(repo, ip, stubMessages());

        assertThatThrownBy(() -> biz.create(new SiteDanmakuCreateReq("重复评价"), 7L, "u7", "1.1.1.1"))
            .isInstanceOf(BizException.class)
            .hasMessageContaining("billing.danmaku.already_reviewed");
    }

    @Test
    void allowsGuestWithoutUserId() {
        SiteDanmakuRepository repo = mock(SiteDanmakuRepository.class);
        IpRegionResolver ip = mock(IpRegionResolver.class);
        when(ip.resolveRegion(any(String.class))).thenReturn("北京");
        when(repo.save(any(SiteDanmakuEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        SiteDanmakuBiz biz = new SiteDanmakuBiz(repo, ip, stubMessages());
        biz.create(new SiteDanmakuCreateReq("访客留言"), null, null, "1.1.1.1");
        verify(repo, never()).existsByUserId(anyLong());
    }

    @Test
    void listRecent_enWithoutTranslation_fallsBackToZhWithMetadata() {
        SiteDanmakuRepository repo = mock(SiteDanmakuRepository.class);
        IpRegionResolver ip = mock(IpRegionResolver.class);

        SiteDanmakuEntity row = new SiteDanmakuEntity();
        row.setId(9L);
        row.setMessage("中文评价");
        row.setAuthorName("墨染青衫");
        row.setRegion("上海");
        when(repo.findTop120ByOrderByCreatedAtDesc()).thenReturn(List.of(row));

        LocaleContext.set(AppLocale.EN);
        SiteDanmakuBiz biz = new SiteDanmakuBiz(repo, ip, stubMessages());
        SiteDanmakuResp resp = biz.listRecent().data().getFirst();

        assertThat(resp.message()).isEqualTo("中文评价");
        assertThat(resp.authorName()).isEqualTo("墨染青衫");
        assertThat(resp.requestedLocale()).isEqualTo(AppLocale.EN.tag());
        assertThat(resp.resolvedLocale()).isEqualTo(AppLocale.ZH_CN.tag());
        assertThat(resp.localeResolved()).isTrue();
    }

    @Test
    void listRecent_enWithTranslation_usesEnglishMessage() {
        SiteDanmakuRepository repo = mock(SiteDanmakuRepository.class);
        IpRegionResolver ip = mock(IpRegionResolver.class);

        SiteDanmakuEntity row = new SiteDanmakuEntity();
        row.setId(10L);
        row.setMessage("中文评价");
        row.setMessageEn("English review");
        row.setAuthorName("墨染青衫");
        when(repo.findTop120ByOrderByCreatedAtDesc()).thenReturn(List.of(row));

        LocaleContext.set(AppLocale.EN);
        SiteDanmakuBiz biz = new SiteDanmakuBiz(repo, ip, stubMessages());
        SiteDanmakuResp resp = biz.listRecent().data().getFirst();

        assertThat(resp.message()).isEqualTo("English review");
        assertThat(resp.localeResolved()).isFalse();
    }
}
