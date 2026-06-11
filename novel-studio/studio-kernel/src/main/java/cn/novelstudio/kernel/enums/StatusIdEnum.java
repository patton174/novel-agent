package cn.novelstudio.kernel.enums;

/**
 * 通用状态枚举：启用 / 禁用。
 */
public enum StatusIdEnum {

    YES(1, "正常"),
    NO(0, "禁用");

    private final int code;
    private final String desc;

    StatusIdEnum(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public int getCode() {
        return code;
    }

    public String getDesc() {
        return desc;
    }
}
