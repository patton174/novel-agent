package cn.novelstudio.platform.scheduling;

/** DB {@code scheduled_job_config.schedule_type} 取值。 */
public enum ScheduleType {

    FIXED_DELAY("fixed_delay"),
    CRON("cron");

    private final String dbValue;

    ScheduleType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String dbValue() {
        return dbValue;
    }

    public static ScheduleType fromDbValue(String value) {
        if (value == null || value.isBlank()) {
            return FIXED_DELAY;
        }
        for (ScheduleType type : values()) {
            if (type.dbValue.equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("unknown schedule_type: " + value);
    }
}
