package com.example.toresyoku;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doReturn;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import com.example.toresyoku.dto.SuggestionForm;
import com.example.toresyoku.dto.SuggestionResponse;
import com.example.toresyoku.service.GeminiService;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@Transactional
class SuggestionPageTests {
    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @MockitoSpyBean GeminiService gemini;

    @Test
    void missingAndPartialMenusRenderWithoutEmptyCards() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        for (SuggestionResponse suggestion : java.util.Arrays.asList(null,
                new SuggestionResponse(null, null, null),
                new SuggestionResponse(java.util.List.of(new SuggestionResponse.Training(" ", "", "")),
                        new SuggestionResponse.Meal(null, " ", ""), " "))) {
            doReturn(suggestion).when(gemini).suggest(any());
            var response = mvc.perform(get("/suggest")).andExpect(status().isOk()).andReturn().getResponse();
            assertThat(response.getContentAsString(StandardCharsets.UTF_8))
                    .containsPattern("id=\"meal-menu\"[^>]*hidden")
                    .containsPattern("id=\"workout-menu\"[^>]*hidden")
                    .containsPattern("id=\"menu-context\"[^>]*hidden")
                    .containsPattern("id=\"menu-notices\"[^>]*hidden")
                    .doesNotContain("まだメニューが決まっていません", "class=\"training-card\"");
        }
        doReturn(new SuggestionResponse(java.util.List.of(new SuggestionResponse.Training("散歩", null, null)),
                new SuggestionResponse.Meal(null, "焼き魚定食", " "), ""))
                .when(gemini).suggest(any());
        var response = mvc.perform(get("/suggest")).andExpect(status().isOk()).andReturn().getResponse();
        assertThat(response.getContentAsString(StandardCharsets.UTF_8))
                .contains("焼き魚定食", "散歩")
                .doesNotContainPattern("id=\"meal-menu\"[^>]*hidden")
                .doesNotContainPattern("id=\"menu-context\"[^>]*hidden")
                .doesNotContainPattern("id=\"workout-menu\"[^>]*hidden");
    }

    @Test
    void entryPageHasAllMainInputsAndAvailableDashboardStyles() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        var response = mvc.perform(get("/start")).andExpect(status().isOk()).andReturn().getResponse();
        assertThat(response.getContentAsString(StandardCharsets.UTF_8))
                .contains("/css/record.css", "/css/suggestion.css", "action=\"/suggest\"", "method=\"post\"",
                        "name=\"heightCm\"", "name=\"weightKg\"", "name=\"age\"", "name=\"gender\"",
                        "name=\"goal\"", "name=\"environment\"", "name=\"allergy\"")
                .doesNotContain("/css/style.css", "name=\"situation\"", "今日の状況");
        for (var asset : new String[]{"/css/record.css", "/css/suggestion.css", "/js/suggestion.js"}) {
            mvc.perform(get(asset)).andExpect(status().isOk());
        }
    }

    @Test
    void invalidSubmissionRetainsInputAndShowsFieldErrorsWithoutSaving() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        Long before = jdbc.queryForObject("SELECT COUNT(*) FROM suggestion", Long.class);
        var response = mvc.perform(post("/suggest").param("weightKg", "0").param("heightCm", "180")
                        .param("allergy", "卵"))
                .andExpect(status().isOk()).andExpect(view().name("index"))
                .andExpect(model().attributeHasFieldErrors("form", "weightKg"))
                .andReturn().getResponse();
        assertThat(response.getContentAsString(StandardCharsets.UTF_8))
                .contains("体重は30〜200kgで入力してください", "value=\"180\"", "value=\"卵\"",
                        "suggestion-error-summary", "aria-invalid=\"true\"");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM suggestion", Long.class)).isEqualTo(before);
    }

    @Test
    void dashboardShowsSubmittedProfileAndPersistsThoseConditions() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        // DBにある他の提案と区別できる条件で、入力内容の保存と表示を確認する。
        String allergy = "画面連携テスト：卵";
        var response = mvc.perform(post("/suggest").param("heightCm", "180").param("weightKg", "75")
                        .param("age", "25").param("gender", "回答しない").param("goal", "筋肉をつけたい")
                        .param("environment", "ジムに通える").param("allergy", allergy))
                .andExpect(status().isOk()).andExpect(view().name("result"))
                .andExpect(model().attribute("storageNotice", "今回の入力と提案を保存しました。"))
                .andReturn().getResponse();
        assertThat(response.getContentAsString(StandardCharsets.UTF_8))
                .contains("id=\"calendar-grid\"", "id=\"profile-form\"",
                        "本日のメニュー", "value=\"180\"", "23.1", allergy, "筋肉をつけたい",
                        "今回の入力と提案を保存しました。", "サンプルの提案を表示しています。",
                        "data-meal=\"breakfast\"", "id=\"recommended-training\"", "条件を変えてもう一度")
                .doesNotContain("name=\"situation\"", "今日の状況", "本日のおすすめ",
                        "id=\"profile-save\"", "id=\"profile-suggest\"", "data-suggestion-form", "data-submit-status");
        var saved = jdbc.queryForList("SELECT input_json FROM suggestion", String.class).stream()
                .map(input -> json.readValue(input, SuggestionForm.class))
                .filter(input -> allergy.equals(input.getAllergy())).findFirst().orElseThrow();
        assertThat(saved.getHeightCm()).isEqualTo(180);
        assertThat(saved.getWeightKg()).isEqualTo(75);
        assertThat(saved.getAllergy()).isEqualTo(allergy);
        assertThat(saved.getSituation()).isEmpty();
        assertThat(saved.getEnvironment()).isEqualTo("ジムに通える");
    }
}
