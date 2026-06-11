package cn.novelstudio.module.billing.entity;

import lombok.Data;

import java.io.Serializable;

@Data
public class UsagePeriodSummaryId implements Serializable {

    private Long userId;
    private String periodYyyyMm;
}
