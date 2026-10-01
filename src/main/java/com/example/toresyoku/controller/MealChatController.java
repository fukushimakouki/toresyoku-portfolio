package com.example.toresyoku.controller;

import java.util.Map;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.toresyoku.dto.ChatRequest;
import com.example.toresyoku.service.GeminiService;
import com.example.toresyoku.service.GeminiException;

@RestController
public class MealChatController {
    private final GeminiService gemini;
    public MealChatController(GeminiService gemini) { this.gemini = gemini; }

    @PostMapping("/api/meal-chat")
    public ResponseEntity<?> chat(@Valid @RequestBody ChatRequest request) {
        try {
            return ResponseEntity.ok(gemini.chatAboutMeals(request.profile(), request.message(),
                    request.generateMenu(), request.history()));
        } catch (GeminiException e) {
            return ResponseEntity.status(502).body(Map.of("error", "AIに接続できませんでした。もう一度お試しください。"));
        }
    }
}

