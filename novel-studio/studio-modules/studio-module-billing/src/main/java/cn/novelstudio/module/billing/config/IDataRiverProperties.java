package cn.novelstudio.module.billing.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

@Data
@ConfigurationProperties(prefix = "billing.idatariver")
public class IDataRiverProperties {

    private boolean enabled = false;
    private String baseUrl = "https://open.idatariver.com";
    private String merchantSecret = "";
    /** 默认项目 id；可被 product_plan.idr_project_id 覆盖 */
    private String projectId = "";
    /** 对外 HTTPS 域名，用于 redirectUrl / callbackUrl */
    private String publicBaseUrl = "https://www.novel-agent.cn";
    private String locale = "zh-cn";
    private String defaultPayMethod = "alipay";
    /** plan code -> sku id（可被 product_plan.idr_sku_id 覆盖） */
    private Map<String, String> planSkuIds = new HashMap<>();
}
