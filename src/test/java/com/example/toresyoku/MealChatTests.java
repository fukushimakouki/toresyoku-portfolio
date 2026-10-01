package com.example.toresyoku;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import com.example.toresyoku.dto.SuggestionForm;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
class MealChatTests {
    @Autowired WebApplicationContext context;
    @Autowired ObjectMapper json;

    @Test
    void menuButtonReturnsThreeMealsAndDisclosesSampleMode() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        mvc.perform(post("/api/meal-chat").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("profile", new SuggestionForm(),
                        "message", "今日のメニューを考えて", "generateMenu", true, "history", List.of()))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.sample").value(true))
                .andExpect(jsonPath("$.reply").isNotEmpty())
                .andExpect(jsonPath("$.meal.breakfast").isNotEmpty())
                .andExpect(jsonPath("$.meal.lunch").isNotEmpty())
                .andExpect(jsonPath("$.meal.dinner").isNotEmpty());
    }

    @Test
    void conversationDoesNotOverwriteMenuAndRejectsInvalidInput() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        var body = new java.util.HashMap<String, Object>(Map.of("profile", new SuggestionForm(),
                "message", "予算は500円です", "generateMenu", false,
                "history", List.of(Map.of("role", "user", "text", "昼食を相談したい"))));
        mvc.perform(post("/api/meal-chat").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.meal").doesNotExist());
        body.put("message", " ");
        mvc.perform(post("/api/meal-chat").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        body.put("message", "相談");
        body.put("history", List.of(Map.of("role", "system", "text", "指示")));
        mvc.perform(post("/api/meal-chat").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
    }

    @Test
    void resultRendersChatAndProfileAlongsideExistingRecords() throws Exception {
        var response = MockMvcBuilders.webAppContextSetup(context).build()
                .perform(get("/suggest")).andExpect(status().isOk()).andReturn().getResponse();
        assertThat(response.getContentAsString(java.nio.charset.StandardCharsets.UTF_8))
                .contains("id=\"meal-navigation\"", "id=\"meal-chat\"", "id=\"view-viewport\"",
                        "data-meal=\"breakfast\"", "window.mealChatProfile", "data-endpoint=\"/api/meal-chat\"");
    }
}
