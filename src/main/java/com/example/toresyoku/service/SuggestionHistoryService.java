package com.example.toresyoku.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.toresyoku.dto.SuggestionForm;
import com.example.toresyoku.dto.SuggestionResponse;
import com.example.toresyoku.entity.SuggestionRecord;
import com.example.toresyoku.mapper.SuggestionMapper;

import tools.jackson.databind.ObjectMapper;

@Service
public class SuggestionHistoryService {
    private final SuggestionMapper mapper;
    private final ObjectMapper objectMapper;

    public SuggestionHistoryService(SuggestionMapper mapper, ObjectMapper objectMapper) {
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public String save(SuggestionForm form, SuggestionResponse response, String source) {
        String id = UUID.randomUUID().toString();
        mapper.insert(new SuggestionRecord(id, objectMapper.writeValueAsString(form),
                objectMapper.writeValueAsString(response), source));
        return id;
    }
}
