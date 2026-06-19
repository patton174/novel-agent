package com.novel.agent.common.service.utils;

import com.novel.agent.common.core.base.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.function.Function;

/**
 * Spring Data 分页 → 统一 {@link Page} 封装。
 */
public final class SpringPageSupport {

    private SpringPageSupport() {}

    public static Pageable pageable(int pageCurrent, int pageSize) {
        int page = Math.max(pageCurrent, 1) - 1;
        int size = pageSize <= 0 ? 20 : pageSize;
        return org.springframework.data.domain.PageRequest.of(page, size);
    }

    public static <S, T> Page<T> map(
        org.springframework.data.domain.Page<S> springPage,
        Function<S, T> mapper,
        int pageCurrentOneBased,
        int pageSize
    ) {
        List<T> list = springPage.getContent().stream().map(mapper).toList();
        return Page.of(list, springPage.getTotalElements(), pageCurrentOneBased, pageSize);
    }
}
