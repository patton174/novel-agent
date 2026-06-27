package cn.novelstudio.module.billing.dto;

import java.util.List;

public record GiftCodeGenerateResp(
    int generated,
    List<String> codes
) {
}
