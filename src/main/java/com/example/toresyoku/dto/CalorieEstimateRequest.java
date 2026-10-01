package com.example.toresyoku.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CalorieEstimateRequest(
        @NotBlank @Pattern(regexp = "meal|workout") String type,
        @NotBlank @Size(max = 1000) String description,
        @DecimalMin("0.1") @DecimalMax("500.0") Double weightKg) {}
