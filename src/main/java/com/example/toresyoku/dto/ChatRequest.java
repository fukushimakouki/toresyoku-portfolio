package com.example.toresyoku.dto;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record ChatRequest(
        @NotNull @Valid SuggestionForm profile,
        @NotBlank @Size(max = 1100) String message,
        boolean generateMenu,
        @NotNull @Size(max = 12) List<@NotNull @Valid Message> history) {
    public record Message(
            @NotBlank @Pattern(regexp = "user|assistant") String role,
            @NotBlank @Size(max = 6000) String text) {}
}
