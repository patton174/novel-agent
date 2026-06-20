package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.SiteDanmakuCreateReq;
import cn.novelstudio.module.billing.entity.SiteDanmakuEntity;
import cn.novelstudio.module.billing.repository.SiteDanmakuRepository;
import cn.novelstudio.module.billing.support.IpRegionResolver;
import cn.novelstudio.kernel.exception.BizException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SiteDanmakuBizTest {

    @Test
    void rejectsDuplicateDanmakuForSameUser() {
        SiteDanmakuRepository repo = mock(SiteDanmakuRepository.class);
        IpRegionResolver ip = mock(IpRegionResolver.class);
        when(repo.existsByUserId(7L)).thenReturn(true);

        SiteDanmakuBiz biz = new SiteDanmakuBiz(repo, ip);

        assertThatThrownBy(() -> biz.create(new SiteDanmakuCreateReq("重复评价"), 7L, "u7", "1.1.1.1"))
            .isInstanceOf(BizException.class)
            .hasMessageContaining("已评价");
    }

    @Test
    void allowsGuestWithoutUserId() {
        SiteDanmakuRepository repo = mock(SiteDanmakuRepository.class);
        IpRegionResolver ip = mock(IpRegionResolver.class);
        when(ip.resolveRegion(any(String.class))).thenReturn("北京");
        // save 默认返回 null 会让 toResp(null) NPE，这里回传实体让访客路径走完，
        // 本测试真正关心的是 existsByUserId 对访客从不被调用
        when(repo.save(any(SiteDanmakuEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        SiteDanmakuBiz biz = new SiteDanmakuBiz(repo, ip);
        // 访客（userId=null）不应触发去重，正常落库
        biz.create(new SiteDanmakuCreateReq("访客留言"), null, null, "1.1.1.1");
        verify(repo, never()).existsByUserId(anyLong());
    }
}
