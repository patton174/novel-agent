package cn.novelstudio.kernel.base;

/**
 * 统一分页入参。
 */
public record PageQuery(int pageCurrent, int pageSize) {

    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    public PageQuery {
        if (pageCurrent <= 0) {
            pageCurrent = 1;
        }
        if (pageSize <= 0) {
            pageSize = DEFAULT_SIZE;
        } else if (pageSize > MAX_SIZE) {
            pageSize = MAX_SIZE;
        }
    }

    public static PageQuery of(int pageCurrent, int pageSize) {
        return new PageQuery(pageCurrent, pageSize);
    }

    public int offset() {
        return (pageCurrent - 1) * pageSize;
    }
}
