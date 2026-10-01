package com.example.toresyoku.controller;

import java.util.Map;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import com.example.toresyoku.dto.CalorieEstimateRequest;
import com.example.toresyoku.service.GeminiException;
import com.example.toresyoku.service.GeminiService;

@RestController
public class CalorieEstimateController {
    private final GeminiService gemini;

    public CalorieEstimateController(GeminiService gemini) {
        this.gemini = gemini;
    }

    @PostMapping("/api/calorie-estimate")
    public ResponseEntity<?> estimate(@Valid @RequestBody CalorieEstimateRequest request) {
        if (gemini.isUsingMock()) {
            return ResponseEntity.status(503).body(Map.of("error",
                    "AIが未接続のため推定できません。カロリーを手入力してください。"));
        }
        try {
            return ResponseEntity.ok(gemini.estimateCalories(request));
        } catch (GeminiException e) {
            return ResponseEntity.status(502).body(Map.of("error",
                    "カロリーを推定できませんでした。再試行するか、手入力してください。"));
        }
    }
}
