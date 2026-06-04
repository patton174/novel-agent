package com.novel.agent.content.dto;

/**
 * Agent Read tool: line-numbered slice of a story-memory entry (1-based offset/limit).
 */
public record StoryMemoryReadSliceDTO(
    String scope,
    String scopeDisplay,
    String entryKey,
    String entryTitle,
    int totalLines,
    int offset,
    int returnedLines,
    boolean hasMore,
    Integer nextOffset,
    String text
) {}
