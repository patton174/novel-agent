package cn.novelstudio.module.billing.controller.crm;

import cn.novelstudio.module.billing.dto.idr.IdrCouponCreateReq;
import cn.novelstudio.module.billing.dto.idr.IdrCouponItemResp;
import cn.novelstudio.module.billing.dto.idr.IdrCouponUpdateReq;
import cn.novelstudio.module.billing.dto.idr.IdrMerchantBasicResp;
import cn.novelstudio.module.billing.dto.idr.IdrPricingCreateReq;
import cn.novelstudio.module.billing.dto.idr.IdrPricingItemResp;
import cn.novelstudio.module.billing.dto.idr.IdrPricingUpdateReq;
import cn.novelstudio.module.billing.dto.idr.IdrProjectDetailResp;
import cn.novelstudio.module.billing.dto.idr.IdrProjectListResp;
import cn.novelstudio.module.billing.dto.idr.IdrSkuCreateReq;
import cn.novelstudio.module.billing.dto.idr.IdrSkuDetailResp;
import cn.novelstudio.module.billing.dto.idr.IdrSkuInventoryUpdateReq;
import cn.novelstudio.module.billing.dto.idr.IdrSkuItemResp;
import cn.novelstudio.module.billing.dto.idr.IdrSkuUpdateReq;
import cn.novelstudio.module.billing.service.IdrCatalogBiz;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    @PutMapping("/skus/{skuId}")
    public Result<IdrSkuItemResp> updateSku(
        @PathVariable String skuId,
        @RequestBody IdrSkuUpdateReq req
    ) {
        return ok(idrCatalogBiz.updateSku(skuId, req));
    }

    @PostMapping("/projects/{projectId}/skus")
    public Result<IdrSkuItemResp> createSku(
        @PathVariable String projectId,
        @RequestBody IdrSkuCreateReq req
    ) {
        return ok(idrCatalogBiz.createSku(projectId, req));
    }

    @PostMapping("/projects/{projectId}/pricings")
    public Result<IdrPricingItemResp> createPricing(
        @PathVariable String projectId,
        @RequestBody IdrPricingCreateReq req
    ) {
        return ok(idrCatalogBiz.createPricing(projectId, req));
    }

    @PutMapping("/pricings/{pricingId}")
    public Result<IdrPricingItemResp> updatePricing(
        @PathVariable String pricingId,
        @RequestBody IdrPricingUpdateReq req
    ) {
        return ok(idrCatalogBiz.updatePricing(pricingId, req));
    }

    @PostMapping("/projects/{projectId}/coupons")
    public Result<IdrCouponItemResp> createCoupon(
        @PathVariable String projectId,
        @RequestBody IdrCouponCreateReq req
    ) {
        return ok(idrCatalogBiz.createCoupon(projectId, req));
    }

    @PutMapping("/coupons/{couponId}")
    public Result<IdrCouponItemResp> updateCoupon(
        @PathVariable String couponId,
        @RequestBody IdrCouponUpdateReq req
    ) {
        return ok(idrCatalogBiz.updateCoupon(couponId, req));
    }
}
