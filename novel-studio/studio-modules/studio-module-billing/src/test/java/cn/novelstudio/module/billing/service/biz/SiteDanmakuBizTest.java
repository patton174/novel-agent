package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.SiteDanmakuCreateReq;
import cn.novelstudio.module.billing.entity.SiteDanmakuEntity;
import cn.novelstudio.module.billing.repository.SiteDanmakuRepository;
import cn.novelstudio.module.billing.support.IpRegionResolver;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.platform.i18n.StudioMessages;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SiteDanmakuBizTest {

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
}
