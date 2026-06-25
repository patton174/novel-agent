package cn.novelstudio.module.billing.controller.crm;

import cn.novelstudio.module.billing.dto.idr.IdrMerchantBasicResp;
import cn.novelstudio.module.billing.dto.idr.IdrProjectDetailResp;
import cn.novelstudio.module.billing.dto.idr.IdrProjectListResp;
import cn.novelstudio.module.billing.dto.idr.IdrSkuDetailResp;
import cn.novelstudio.module.billing.dto.idr.IdrSkuInventoryUpdateReq;
import cn.novelstudio.module.billing.service.IdrCatalogBiz;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing/crm/idatariver")
@RequiredArgsConstructor
public class IdrCrmController extends BaseController {

    private final IdrCatalogBiz idrCatalogBiz;

    @GetMapping("/merchant")
    public Result<IdrMerchantBasicResp> merchantBasic() {
        return ok(idrCatalogBiz.merchantBasic());
    }

    @GetMapping("/projects")
    public Result<IdrProjectListResp> listProjects() {
        return ok(idrCatalogBiz.listProjects());
    }

    @GetMapping("/projects/{projectId}")
    public Result<IdrProjectDetailResp> projectDetail(@PathVariable String projectId) {
        return ok(idrCatalogBiz.projectDetail(projectId));
    }

    @GetMapping("/skus/{skuId}")
    public Result<IdrSkuDetailResp> skuDetail(@PathVariable String skuId) {
        return ok(idrCatalogBiz.skuDetail(skuId));
    }

    @PutMapping("/skus/{skuId}/inventory")
    public Result<IdrSkuDetailResp> updateSkuInventory(
        @PathVariable String skuId,
        @RequestBody IdrSkuInventoryUpdateReq req
    ) {
        return ok(idrCatalogBiz.updateSkuInventory(skuId, req));
    }
}
