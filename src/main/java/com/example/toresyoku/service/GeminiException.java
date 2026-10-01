package com.example.toresyoku.service;

/** Gemini 呼び出しに失敗したことを表す。呼び出し側でフォールバック判断に使う。 */
public class GeminiException extends RuntimeException {

    public GeminiException(String message) {
        super(message);
    }

    public GeminiException(String message, Throwable cause) {
        super(message, cause);
    }
}
