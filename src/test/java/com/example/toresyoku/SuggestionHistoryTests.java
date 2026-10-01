package com.example.toresyoku;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import com.example.toresyoku.dto.SuggestionForm;
import com.example.toresyoku.dto.SuggestionResponse;
import com.example.toresyoku.mapper.SuggestionMapper;
import com.example.toresyoku.service.GeminiService;
import com.example.toresyoku.service.SuggestionHistoryService;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@Transactional
class SuggestionHistoryTests {
    @Autowired SuggestionHistoryService history;
    @Autowired SuggestionMapper mapper;
    @Autowired GeminiService gemini;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired WebApplicationContext context;

    @Test
    void savesAndReadsJapaneseInputAndSuggestion() {
        var form = new SuggestionForm();
        form.setSituation("学食で「魚」を食べたい。\n運動は軽めに。");
        var response = gemini.fallback(form);
        String id = history.save(form, response, "SAMPLE");
        var stored = mapper.findById(id);
        assertThat(json.readValue(stored.inputJson(), SuggestionForm.class).getSituation())
                .isEqualTo(form.getSituation());
        assertThat(json.readValue(stored.responseJson(), SuggestionResponse.class)).isEqualTo(response);
        assertThat(stored.source()).isEqualTo("SAMPLE");
        assertThat(jdbc.queryForObject("SELECT created_at FROM suggestion WHERE id = ?",
                java.sql.Timestamp.class, id)).isNotNull();
        assertThat(mapper.findById("missing")).isNull();
    }

    @Test
    void onlyValidPostPersistsSuggestion() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        Long before = jdbc.queryForObject("SELECT COUNT(*) FROM suggestion", Long.class);
        mvc.perform(get("/suggest")).andExpect(status().isOk()).andExpect(view().name("result"));
        mvc.perform(post("/suggest").param("weightKg", "0"))
                .andExpect(status().isOk()).andExpect(view().name("index"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM suggestion", Long.class)).isEqualTo(before);
        mvc.perform(post("/suggest")).andExpect(status().isOk()).andExpect(view().name("result"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM suggestion", Long.class)).isEqualTo(before + 1);
    }
}
