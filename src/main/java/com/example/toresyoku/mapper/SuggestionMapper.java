package com.example.toresyoku.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import com.example.toresyoku.entity.SuggestionRecord;

@Mapper
public interface SuggestionMapper {
    @Insert("""
            INSERT INTO suggestion (id, input_json, response_json, source)
            VALUES (#{id}, #{inputJson}, #{responseJson}, #{source})
            """)
    int insert(SuggestionRecord record);

    @Select("""
            SELECT id, input_json AS inputJson, response_json AS responseJson, source
            FROM suggestion WHERE id = #{id}
            """)
    SuggestionRecord findById(String id);
}
