package com.example.toresyoku.controller;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataAccessException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import com.example.toresyoku.dto.SuggestionForm;
import com.example.toresyoku.dto.SuggestionResponse;
import com.example.toresyoku.service.GeminiException;
import com.example.toresyoku.service.GeminiService;
import com.example.toresyoku.service.SuggestionHistoryService;

/**
 * 発表デモ用の画面。フォーム入力 → Gemini 提案 → 結果表示 の一本道だけを扱う。
 * POSTで作成した提案はDBに保存する。ログインは未実装。
 */
@Controller
public class DemoController {

    private static final Logger log = LoggerFactory.getLogger(DemoController.class);

    private final GeminiService geminiService;
    private final SuggestionHistoryService historyService;
    private final boolean fallbackOnError;

    public DemoController(
            GeminiService geminiService,
            SuggestionHistoryService historyService,
            @Value("${gemini.fallback-on-error:true}") boolean fallbackOnError) {
        this.geminiService = geminiService;
        this.historyService = historyService;
        this.fallbackOnError = fallbackOnError;
    }

    /** 選択肢は画面とプロンプトの両方で使うので1か所にまとめる。 */
    @ModelAttribute("genders")
    List<String> genders() {
        return List.of("男性", "女性", "回答しない");
    }

    @ModelAttribute("goals")
    List<String> goals() {
        return List.of("体を絞りたい", "筋肉をつけたい", "体重を増やしたい", "健康を維持したい");
    }

    @ModelAttribute("environments")
    List<String> environments() {
        return List.of("自宅（自重トレのみ）", "自宅（ダンベルあり）", "ジムに通える", "外を走れる");
    }

    @GetMapping({"/", "/login"})
    public String login() {
        return "login";
    }

    @GetMapping("/start")
    public String index(@ModelAttribute("form") SuggestionForm form) {
        return "index";
    }

    // GET も受けるのは、当日「この結果をもう一度出す」用にURLで再現できるようにするため。
    @RequestMapping(value = "/suggest", method = { RequestMethod.GET, RequestMethod.POST })
    public String suggest(
            @Validated @ModelAttribute("form") SuggestionForm form,
            BindingResult bindingResult,
            HttpServletRequest request,
            Model model) {

        if (bindingResult.hasErrors()) {
            return "index";
        }

        SuggestionResponse suggestion;
        String source = "AI";
        try {
            suggestion = geminiService.suggest(form);
            if (geminiService.isUsingMock()) {
                source = "SAMPLE";
                model.addAttribute("notice", "APIキーが未設定のため、サンプルの提案を表示しています。");
            }
        } catch (GeminiException e) {
            if (!fallbackOnError) {
                throw e;
            }
            log.warn("Gemini 呼び出しに失敗したため固定メニューへ退避します: {}", e.getMessage());
            suggestion = geminiService.fallback(form);
            source = "FALLBACK";
            model.addAttribute("notice",
                    "AIへの接続に失敗したため、標準メニューを表示しています。(" + e.getMessage() + ")");
        }

        if ("POST".equals(request.getMethod())) {
            try {
                historyService.save(form, suggestion, source);
                model.addAttribute("storageNotice", "今回の入力と提案を保存しました。");
            } catch (DataAccessException e) {
                log.warn("提案をDBに保存できませんでした（{}）", e.getClass().getSimpleName());
                model.addAttribute("storageNotice", "提案は作成できましたが、保存に失敗しました。");
            }
        }
        model.addAttribute("suggestion", suggestion);
        return "result";
    }
}
