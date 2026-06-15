package cn.novelstudio.module.content.entity;

import lombok.Data;

import java.io.Serializable;
import java.time.LocalDate;

@Data
public class UserWritingActivityDailyId implements Serializable {

    private Long userId;
    private LocalDate activityDate;
}
