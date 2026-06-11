package cn.novelstudio.kernel.base;

import java.util.List;

/**
 * 分页结果封装（对齐 KPI PageResult：含 pages / hasNext）。
 */
public record Page<T>(
    List<T> list,
    long totalCount,
    int pageCurrent,
    int pageSize,
    int pages,
    boolean hasNext
) {

    public static <T> Page<T> of(List<T> list, long totalCount, int pageCurrent, int pageSize) {
        int current = pageCurrent <= 0 ? 1 : pageCurrent;
        int size = pageSize <= 0 ? PageQuery.DEFAULT_SIZE : pageSize;
        int totalPages = size <= 0 ? 0 : (int) Math.ceil((double) totalCount / size);
        boolean next = current < totalPages;
        return new Page<>(list, totalCount, current, size, totalPages, next);
    }

    public static <T> Page<T> empty(int pageCurrent, int pageSize) {
        return of(List.of(), 0, pageCurrent, pageSize);
    }
}
