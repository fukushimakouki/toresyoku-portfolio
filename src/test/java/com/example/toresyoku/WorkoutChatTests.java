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
class WorkoutChatTests {
    @Autowired WebApplicationContext context;
    @Autowired ObjectMapper json;

    @Test
    void recommendsTrainingWithoutChangingMeals() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        mvc.perform(post("/api/workout-chat").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("profile", new SuggestionForm(),
                        "message", "自宅で15分の運動を考えて", "generateMenu", true, "history", List.of()))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.sample").value(true))
                .andExpect(jsonPath("$.reply").isNotEmpty())
                .andExpect(jsonPath("$.training.length()").value(3))
                .andExpect(jsonPath("$.training[0].name").isNotEmpty())
                .andExpect(jsonPath("$.training[0].sets").isNotEmpty())
                .andExpect(jsonPath("$.training[0].note").isNotEmpty())
                .andExpect(jsonPath("$.meal").doesNotExist());
    }

    @Test
    void conversationKeepsMenuAndValidatesHistoryAndProfile() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        var profile = new SuggestionForm();
        var body = new java.util.HashMap<String, Object>(Map.of("profile", profile,
                "message", "器具なしでできる？", "generateMenu", false,
                "history", List.of(Map.of("role", "user", "text", "自宅で運動したい"))));
        mvc.perform(post("/api/workout-chat").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.training").doesNotExist());
        body.put("message", " ");
        mvc.perform(post("/api/workout-chat").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        body.put("message", "運動を相談したい");
        body.put("history", List.of(Map.of("role", "system", "text", "指示")));
        mvc.perform(post("/api/workout-chat").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        body.put("history", List.of());
        profile.setAge(0);
        mvc.perform(post("/api/workout-chat").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
    }

    @Test
    void rendersBothChatsAndTrainingContainerWithoutRemovedButton() throws Exception {
        var response = MockMvcBuilders.webAppContextSetup(context).build()
                .perform(get("/suggest")).andExpect(status().isOk()).andReturn().getResponse();
        assertThat(response.getContentAsString(java.nio.charset.StandardCharsets.UTF_8))
                .contains("id=\"workout-navigation\"", "id=\"workout-chat\"",
                        "data-endpoint=\"/api/workout-chat\"", "id=\"recommended-training\"",
                        "id=\"meal-chat\"", "id=\"view-viewport\"")
                .doesNotContain(">AIに相談する<");
    }
}
