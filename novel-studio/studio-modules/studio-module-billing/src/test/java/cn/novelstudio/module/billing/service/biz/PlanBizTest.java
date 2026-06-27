package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.dto.PlanPublicResp;
import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.repository.PlanFeatureRepository;
import cn.novelstudio.module.billing.repository.ProductPlanRepository;
import cn.novelstudio.module.billing.service.IDataRiverConfigService;
import cn.novelstudio.module.billing.config.IDataRiverProperties;
import cn.novelstudio.platform.i18n.AppLocale;
import cn.novelstudio.platform.i18n.LocaleContext;
import cn.novelstudio.platform.i18n.StudioMessages;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PlanBizTest {

    @AfterEach
    void tearDown() {
        LocaleContext.clear();
    }

    @Test
    void listPublicPlans_enLocale_usesMessageBundleNotDbChinese() {
        ProductPlanRepository planRepo = mock(ProductPlanRepository.class);
        PlanFeatureRepository featureRepo = mock(PlanFeatureRepository.class);
        StudioMessages messages = mock(StudioMessages.class);
        IDataRiverConfigService configService = mock(IDataRiverConfigService.class);
        IDataRiverProperties envProperties = mock(IDataRiverProperties.class);

        when(messages.getOrDefault(anyString(), anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            if ("plan.hobby.name".equals(key)) {
                return "Hobby";
            }
            if ("plan.hobby.desc".equals(key)) {
                return "Perfect for casual writers.";
            }
            return inv.getArgument(1);
        });
        when(messages.get(anyString())).thenAnswer(inv -> inv.getArgument(0));
        when(messages.get(anyString(), org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> inv.getArgument(0));
        when(featureRepo.findByPlanIdAndEnabledTrue(1L)).thenReturn(List.of());

        ProductPlanEntity hobby = new ProductPlanEntity();
        hobby.setId(1L);
        hobby.setCode("hobby");
        hobby.setName("体验版");
        hobby.setDescription("适合轻度创作");
        hobby.setPriceCents(0);
        hobby.setCurrency("CNY");
        hobby.setIsActive(true);
        hobby.setSortOrder(1);
        when(planRepo.findByIsActiveTrueOrderBySortOrderAsc()).thenReturn(List.of(hobby));

        LocaleContext.set(AppLocale.EN);
        PlanBiz biz = new PlanBiz(planRepo, featureRepo, messages, configService, envProperties);

        PlanPublicResp resp = biz.listPublicPlans().data().getFirst();

        assertThat(resp.name()).isEqualTo("Hobby");
        assertThat(resp.description()).isEqualTo("Perfect for casual writers.");
    }

    @Test
    void localizedPlanName_fallsBackToDbWhenBundleMissing() {
        ProductPlanRepository planRepo = mock(ProductPlanRepository.class);
        PlanFeatureRepository featureRepo = mock(PlanFeatureRepository.class);
        StudioMessages messages = mock(StudioMessages.class);
        IDataRiverConfigService configService = mock(IDataRiverConfigService.class);
        IDataRiverProperties envProperties = mock(IDataRiverProperties.class);

        when(messages.getOrDefault(anyString(), anyString())).thenAnswer(inv -> inv.getArgument(1));

        PlanBiz biz = new PlanBiz(planRepo, featureRepo, messages, configService, envProperties);
        ProductPlanEntity plan = new ProductPlanEntity();
        plan.setCode("custom");
        plan.setName("定制套餐");

        assertThat(biz.localizedPlanName(plan)).isEqualTo("定制套餐");
    }
}
