package com.example.toresyoku.service;

import java.util.List;

import com.example.toresyoku.dto.SuggestionForm;
import com.example.toresyoku.dto.SuggestionResponse;

/**
 * API が使えないときに返す固定メニュー。
 * 発表当日に通信・キー・レート制限のいずれかで転んでも画面が成立するようにする保険。
 */
final class FallbackMenu {

    private FallbackMenu() {
    }

    static SuggestionResponse of(SuggestionForm form) {
        var training = List.of(
                new SuggestionResponse.Training("スクワット", "15回 × 3セット",
                        "太ももとお尻。膝がつま先より前に出ないところまで下ろす"),
                new SuggestionResponse.Training("膝つき腕立て伏せ", "10回 × 3セット",
                        "きつければ壁に手をついて角度を浅くする"),
                new SuggestionResponse.Training("プランク", "30秒 × 3セット",
                        "腰が落ちないように。疲れているなら20秒でよい"));

        var meal = new SuggestionResponse.Meal(
                "ごはん1杯・納豆・ゆで卵1個・味噌汁",
                "学食の定食（主菜は焼き魚か鶏肉）＋ごはん小盛り＋サラダ",
                "鶏むね肉のソテー・ブロッコリー・ごはん1杯");

        var comment = "（オフライン用の標準メニューです）身長%dcm・体重%dkg・BMI%.1f の方向けの基本セットです。"
                .formatted(form.getHeightCm(), form.getWeightKg(), form.bmi())
                + "疲れている日は回数を半分に落としてでも、やめずに続けるほうが効果が出ます。";

        return new SuggestionResponse(training, meal, comment);
    }
}
