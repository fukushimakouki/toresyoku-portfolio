package com.example.toresyoku.entity;

/** 入力と提案のスナップショット。source は AI / SAMPLE / FALLBACK。 */
public record SuggestionRecord(String id, String inputJson, String responseJson, String source) {
}
