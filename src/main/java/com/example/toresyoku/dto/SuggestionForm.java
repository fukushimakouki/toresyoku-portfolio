package com.example.toresyoku.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 入力フォームの受け皿。提案に使うプロフィールを受け取る。
 * 発表デモ用に初期値を入れてあり、そのまま送信しても提案が出る。
 */
public class SuggestionForm {

    @NotNull(message = "身長を入力してください")
    @Min(value = 100, message = "身長は100〜250cmで入力してください")
    @Max(value = 250, message = "身長は100〜250cmで入力してください")
    private Integer heightCm = 172;

    @NotNull(message = "体重を入力してください")
    @Min(value = 30, message = "体重は30〜200kgで入力してください")
    @Max(value = 200, message = "体重は30〜200kgで入力してください")
    private Integer weightKg = 68;

    @NotNull(message = "年齢を入力してください")
    @Min(value = 15, message = "年齢は15〜90歳で入力してください")
    @Max(value = 90, message = "年齢は15〜90歳で入力してください")
    private Integer age = 19;

    @NotBlank(message = "性別を選択してください")
    private String gender = "男性";

    @NotBlank(message = "目標を選択してください")
    private String goal = "体を絞りたい";

    @NotBlank(message = "運動環境を選択してください")
    private String environment = "自宅（自重トレのみ）";

    @Size(max = 200, message = "アレルギー・苦手な食べ物は200文字以内で入力してください")
    private String allergy = "牛乳が苦手";

    // 過去の保存データ・URLとの互換性のため残す。画面では入力しない。
    @Size(max = 300, message = "今日の状況は300文字以内で入力してください")
    private String situation = "";

    public Integer getHeightCm() {
        return heightCm;
    }

    public void setHeightCm(Integer heightCm) {
        this.heightCm = heightCm;
    }

    public Integer getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(Integer weightKg) {
        this.weightKg = weightKg;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getGoal() {
        return goal;
    }

    public void setGoal(String goal) {
        this.goal = goal;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getAllergy() {
        return allergy;
    }

    public void setAllergy(String allergy) {
        this.allergy = allergy;
    }

    public String getSituation() {
        return situation;
    }

    public void setSituation(String situation) {
        this.situation = situation;
    }

    /** BMI。プロンプトに渡して提案の根拠にする。 */
    public double bmi() {
        double m = heightCm / 100.0;
        return Math.round(weightKg / (m * m) * 10) / 10.0;
    }
}
