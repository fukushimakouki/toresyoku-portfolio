package com.example.toresyoku.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Gemini から返る提案JSONをそのまま受ける形。
 * 形式は プロジェクト概要.md §6「返答フォーマット（JSON固定）」に合わせる。
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SuggestionResponse(
        List<Training> training,
        Meal meal,
        String comment) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Training(String name, String sets, String note) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Meal(String breakfast, String lunch, String dinner) {
    }
}
