package cn.novelstudio.module.billing.controller.crm;

import cn.novelstudio.module.billing.dto.GiftCampaignCreateReq;
import cn.novelstudio.module.billing.dto.GiftCampaignCrmResp;
import cn.novelstudio.module.billing.dto.GiftCampaignUpdateReq;
import cn.novelstudio.module.billing.dto.GiftCodeCrmResp;
import cn.novelstudio.module.billing.dto.GiftCodeGenerateReq;
import cn.novelstudio.module.billing.dto.GiftCodeGenerateResp;
import cn.novelstudio.module.billing.service.biz.GiftCampaignCrmBiz;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.AuthRoleSupport;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/billing/crm/gift-campaigns")
@RequiredArgsConstructor
public class GiftCrmController extends BaseController {

    private final GiftCampaignCrmBiz giftCampaignCrmBiz;

    @GetMapping
    public Result<List<GiftCampaignCrmResp>> list(
        @RequestHeader(value = "X-User-Roles", required = false) String roles
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return giftCampaignCrmBiz.listAll();
    }

    @GetMapping("/{id}")
    public Result<GiftCampaignCrmResp> get(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable long id
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return giftCampaignCrmBiz.get(id);
    }

    @PostMapping
    public Result<GiftCampaignCrmResp> create(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody GiftCampaignCreateReq req
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return giftCampaignCrmBiz.create(req, parseOptionalUserId(actorHeader));
    }

    @PutMapping("/{id}")
    public Result<GiftCampaignCrmResp> update(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody GiftCampaignUpdateReq req
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return giftCampaignCrmBiz.update(id, req, parseOptionalUserId(actorHeader));
    }

    @DeleteMapping("/{id}")
    public Result<Void> deactivate(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader
    ) {
        AuthRoleSupport.requireAdmin(roles);
        giftCampaignCrmBiz.deactivate(id, parseOptionalUserId(actorHeader));
        return Result.ok();
    }

    @PostMapping("/{id}/disable")
    public Result<GiftCampaignCrmResp> disable(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return giftCampaignCrmBiz.deactivate(id, parseOptionalUserId(actorHeader));
    }

    @GetMapping("/{id}/codes")
    public Result<List<GiftCodeCrmResp>> listCodes(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable long id
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return giftCampaignCrmBiz.listCodes(id);
    }

    @PostMapping("/{id}/generate-codes")
    public Result<GiftCodeGenerateResp> generateCodes(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable long id,
        @RequestHeader(value = "X-User-Id", required = false) String actorHeader,
        @Valid @RequestBody GiftCodeGenerateReq req
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return giftCampaignCrmBiz.generateCodes(id, req, parseOptionalUserId(actorHeader));
    }

    private static Long parseOptionalUserId(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(header.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
