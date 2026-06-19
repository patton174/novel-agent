package com.novel.agent.common.service.utils;

import org.springframework.beans.BeanUtils;

import java.util.List;

/**
 * Bean 属性拷贝工具（对齐 KPI BeanCopyUtils）。
 */
public final class BeanCopyUtils {

    private BeanCopyUtils() {}

    public static void copyProperties(Object source, Object target) {
        if (source == null || target == null) {
            return;
        }
        BeanUtils.copyProperties(source, target);
    }

    public static <T> T copyProperties(Object source, Class<T> targetClass) {
        if (source == null) {
            return null;
        }
        try {
            T target = targetClass.getDeclaredConstructor().newInstance();
            BeanUtils.copyProperties(source, target);
            return target;
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Bean copy failed: " + targetClass.getName(), ex);
        }
    }

    public static <T> List<T> copyList(List<?> sourceList, Class<T> targetClass) {
        if (sourceList == null) {
            return List.of();
        }
        return sourceList.stream()
            .map(item -> copyProperties(item, targetClass))
            .toList();
    }
}
