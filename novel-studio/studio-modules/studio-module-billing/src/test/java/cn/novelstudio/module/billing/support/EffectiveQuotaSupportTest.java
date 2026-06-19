package cn.novelstudio.module.billing.support;

import cn.novelstudio.module.billing.entity.UserQuotaOverrideEntity;
import cn.novelstudio.module.billing.repository.UserQuotaOverrideRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EffectiveQuotaSupportTest {

    @Test
    void resolveLibraryUploadLimit_planLimit_plus_bonuses() {
        UserQuotaOverrideRepository repo = mock(UserQuotaOverrideRepository.class);
        UserQuotaOverrideEntity o = new UserQuotaOverrideEntity();
        o.setLibraryUploadBonus(3);
        when(repo.findActiveByUserId(eq(10L), any())).thenReturn(List.of(o));
        EffectiveQuotaSupport support = new EffectiveQuotaSupport(repo);

        Integer limit = support.resolveLibraryUploadLimit(10L, 5); // planLimit=5
        assertThat(limit).isEqualTo(8); // 5 + 3
    }

    @Test
    void resolveLibraryUploadLimit_nullPlanLimit_meansUnlimited() {
        UserQuotaOverrideRepository repo = mock(UserQuotaOverrideRepository.class);
        when(repo.findActiveByUserId(anyLong(), any())).thenReturn(List.of());
        EffectiveQuotaSupport support = new EffectiveQuotaSupport(repo);
        Integer limit = support.resolveLibraryUploadLimit(10L, null); // null=无限
        assertThat(limit).isNull();
    }

    @Test
    void resolveLibraryUploadLimit_nullBonusTreatedAsZero() {
        UserQuotaOverrideRepository repo = mock(UserQuotaOverrideRepository.class);
        UserQuotaOverrideEntity o = new UserQuotaOverrideEntity();
        o.setLibraryUploadBonus(null); // null bonus 不应 NPE
        when(repo.findActiveByUserId(anyLong(), any())).thenReturn(List.of(o));
        EffectiveQuotaSupport support = new EffectiveQuotaSupport(repo);

        Integer limit = support.resolveLibraryUploadLimit(10L, 5);
        assertThat(limit).isEqualTo(5);
    }

    @Test
    void resolveLibraryUploadLimit_multipleBonusesSum() {
        UserQuotaOverrideRepository repo = mock(UserQuotaOverrideRepository.class);
        UserQuotaOverrideEntity a = new UserQuotaOverrideEntity();
        a.setLibraryUploadBonus(2);
        UserQuotaOverrideEntity b = new UserQuotaOverrideEntity();
        b.setLibraryUploadBonus(4);
        when(repo.findActiveByUserId(anyLong(), any())).thenReturn(List.of(a, b));
        EffectiveQuotaSupport support = new EffectiveQuotaSupport(repo);

        Integer limit = support.resolveLibraryUploadLimit(10L, 5);
        assertThat(limit).isEqualTo(11); // 5 + 2 + 4
    }
}
