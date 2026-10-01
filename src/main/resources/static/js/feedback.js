// 仮版: 外部AIを呼ばず、入力済みの記録から事実と次の一歩をまとめる。
(() => {
    const fields = [
        { key: "proteinG", label: "タンパク質" },
        { key: "fatG", label: "脂質" },
        { key: "carbohydratesG", label: "炭水化物" },
        { key: "fiberG", label: "食物繊維" },
        { key: "saltG", label: "塩分" }
    ];
    const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    function shiftDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    function weekStart(date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        return shiftDays(start, -((start.getDay() + 6) % 7));
    }
    function periodStart(kind, date) {
        if (kind === "month") return new Date(date.getFullYear(), date.getMonth(), 1);
        if (kind === "year") return new Date(date.getFullYear(), 0, 1);
        return weekStart(date);
    }
    function shiftPeriod(kind, date, amount) {
        const start = periodStart(kind, date);
        if (kind === "month") return new Date(start.getFullYear(), start.getMonth() + amount, 1);
        if (kind === "year") return new Date(start.getFullYear() + amount, 0, 1);
        return shiftDays(start, amount * 7);
    }
    function periodRange(kind, date, records = [], now = new Date()) {
        if (kind === "all") {
            const end = new Date(now);
            end.setHours(0, 0, 0, 0);
            const dates = records.filter(record => record.date <= dateKey(end)
                && (record.meals.length || record.workouts.length || Number.isFinite(record.weight)))
                .map(record => record.date).sort();
            return { start: dates.length ? new Date(dates[0] + "T00:00:00") : end, end };
        }
        const start = periodStart(kind, date);
        return { start, end: shiftDays(shiftPeriod(kind, start, 1), -1) };
    }
    function summarize(records, start, end) {
        const from = dateKey(start);
        const to = dateKey(end);
        const selected = records.filter(record => record.date >= from && record.date <= to);
        const meals = selected.flatMap(record => record.meals);
        const workouts = selected.flatMap(record => record.workouts);
        return {
            days: selected.filter(record => record.meals.length || record.workouts.length || Number.isFinite(record.weight)).length,
            mealDays: selected.filter(record => record.meals.length).length,
            workoutDays: selected.filter(record => record.workouts.length).length,
            mealCount: meals.length,
            intake: meals.reduce((total, meal) => total + meal.calories, 0),
            burned: workouts.reduce((total, workout) => total + workout.calories, 0),
            nutrients: fields.map(field => {
                const entered = meals.filter(meal => Number.isFinite(meal[field.key]));
                return { ...field, count: entered.length, total: entered.reduce((total, meal) => total + meal[field.key], 0) };
            })
        };
    }
    const format = number => number.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
    function comments(summary, previous = null, comparison = { previous: "前週", current: "この週" }) {
        const positive = summary.mealDays && summary.workoutDays
            ? `食事を${summary.mealDays}日、運動を${summary.workoutDays}日記録できました。両方の記録が、振り返りの手がかりになっています。`
            : summary.mealDays ? `食事を${summary.mealDays}日記録できました。食べたものを振り返る材料が残せています。`
                : summary.workoutDays ? `運動を${summary.workoutDays}日記録できました。取り組んだことが記録に残っています。`
                    : "体重の記録を残せています。食事や運動も記録すると、振り返れる内容が増えます。";
        const protein = summary.nutrients.find(field => field.key === "proteinG");
        const observations = [];
        if (summary.mealDays) observations.push(`食事を記録した日の平均摂取は${format(summary.intake / summary.mealDays)} kcalです。入力済みの食事だけを集計しています。`);
        if (protein.count) observations.push(`タンパク質は${summary.mealCount}件中${protein.count}件に入力があり、合計${format(protein.total)} gでした。`);
        if (summary.workoutDays) observations.push(`記録した運動の消費は合計${format(summary.burned)} kcalです。`);
        if (previous?.days) observations.push(`運動の記録日数は、${comparison.previous}${previous.workoutDays}日・${comparison.current}${summary.workoutDays}日です。未記録の日の活動は含みません。`);
        const incomplete = summary.nutrients.some(field => field.count < summary.mealCount);
        const next = !summary.mealDays
            ? "次の食事を1件、食べたものと量から記録してみましょう。"
            : incomplete
                ? "次に記録する食事を1件だけ、食品表示などで分かる栄養値も一緒に入力してみましょう。"
                : !summary.workoutDays
                    ? "次に運動したときは、内容と時間も記録してみましょう。休養日に無理に増やす必要はありません。"
                    : "記録できた食事や運動のうち、続けやすかったものを1つ選んでみましょう。";
        return { positive, trend: observations.join("\n") || "この期間の食事・運動はまだ記録されていません。", next };
    }
    window.recordFeedback = { dateKey, shiftDays, weekStart, periodStart, shiftPeriod, periodRange, summarize, comments };

    document.addEventListener("DOMContentLoaded", () => {
        const byId = id => document.getElementById(id);
        if (!byId("feedback-report") || !window.recordStore) return;
        const ackPrefix = "toresyoku.feedback.ack.";
        const acknowledged = new Set();
        let records = [];
        let storageUnavailable = false;
        const periods = {
            week: { unit: "週", title: "一週間の振り返り", current: "今週", previous: "先週", comparison: "前週" },
            month: { unit: "月", title: "一か月の振り返り", current: "今月", previous: "先月", comparison: "前月" },
            year: { unit: "年", title: "一年間の振り返り", current: "今年", previous: "昨年", comparison: "前年" },
            all: { title: "すべての振り返り" }
        };
        let selectedKind = "week";
        const selectedPeriods = {
            week: shiftDays(weekStart(new Date()), -7),
            month: periodStart("month", new Date()),
            year: periodStart("year", new Date())
        };
        let selectedDay = byId("record-entry").dataset.date;
        let sample = false;
        let active = false;
        const latestWeek = () => shiftDays(weekStart(new Date()), -7);
        const rangeLabel = (start, end = shiftDays(start, 6)) => `${dateKey(start).replaceAll("-", "/")} 〜 ${dateKey(end).replaceAll("-", "/")}`;
        const node = (tag, className, text) => {
            const element = document.createElement(tag);
            if (className) element.className = className;
            if (text != null) element.textContent = text;
            return element;
        };
        function readRecords() {
            try { records = window.recordStore.all(); storageUnavailable = false; }
            catch { records = []; storageUnavailable = true; }
        }
        function isAcknowledged(start) {
            const key = dateKey(start);
            if (acknowledged.has(key)) return true;
            try { return Boolean(localStorage.getItem(ackPrefix + key)); }
            catch { return false; }
        }
        function acknowledge(start, reason) {
            const key = dateKey(start);
            acknowledged.add(key);
            try { localStorage.setItem(ackPrefix + key, reason); }
            catch { /* 保存できない場合も、この画面を開いている間は再表示しない。 */ }
        }
        function renderNotice() {
            const start = latestWeek();
            const summary = summarize(records, start, shiftDays(start, 6));
            byId("feedback-notice").hidden = !summary.days || isAcknowledged(start);
            byId("feedback-notice-summary").textContent = `${rangeLabel(start)} · 食事の記録${summary.mealDays}日 / 運動の記録${summary.workoutDays}日`;
        }
        function sampleRecords() {
            const now = new Date();
            const range = selectedKind === "all"
                ? { start: new Date(now.getFullYear() - 1, now.getMonth(), 1), end: now }
                : periodRange(selectedKind, selectedPeriods[selectedKind]);
            const end = range.end > now ? now : range.end;
            // 暦の日数で間隔を作り、夏時間の23/25時間の日にも影響されないようにする。
            const utcDay = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
            const days = Math.round((utcDay(end) - utcDay(range.start)) / 86400000) + 1;
            const count = Math.min(days, { week: 5, month: 12, year: 24, all: 30 }[selectedKind]);
            const offsets = selectedKind === "week" && days === 7 ? [0, 1, 3, 4, 6]
                : Array.from({ length: count }, (_, index) => count === 1 ? 0 : Math.round(index * (days - 1) / (count - 1)));
            return offsets.map((offset, index) => ({
                date: dateKey(shiftDays(range.start, offset)), weight: null,
                meals: [{ name: "サンプルの食事", calories: [1800, 1950, 1720, 2050, 1880][index % 5],
                    proteinG: [65, 72, null, 80, 68][index % 5], fatG: 55, carbohydratesG: 240, fiberG: null, saltG: 6 }],
                workouts: index % 5 === 1 || index % 5 === 3 ? [{ name: "サンプルの運動", calories: 180 }] : []
            }));
        }
        function card(title, text, extraClass = "") {
            const element = node("article", `feedback-card ${extraClass}`);
            element.append(node("h3", "", title), node("p", "", text));
            return element;
        }
        function renderReport() {
            const report = byId("feedback-report");
            report.replaceChildren();
            const now = new Date();
            const all = selectedKind === "all";
            const definition = periods[selectedKind];
            const current = periodStart(selectedKind, now);
            const source = sample ? sampleRecords() : records;
            const { start, end } = periodRange(selectedKind, selectedPeriods[selectedKind], source, now);
            // 今週・今月・今年・全期間のどれでも、今日より先の記録を集計しない。
            const through = end > now ? now : end;
            const summary = summarize(source, start, through);
            const previous = sample || all ? null : summarize(records, shiftPeriod(selectedKind, start, -1), shiftDays(start, -1));
            const inProgress = !all && dateKey(start) === dateKey(current);
            byId("feedback-title").textContent = definition.title;
            byId("feedback-period").textContent = all ? (summary.days ? rangeLabel(start, through) : "記録開始 〜 今日")
                : selectedKind === "month" ? `${start.getFullYear()}年${start.getMonth() + 1}月`
                    : selectedKind === "year" ? `${start.getFullYear()}年` : rangeLabel(start, end);
            byId("feedback-period-label").textContent = all ? "全期間" : inProgress ? `${definition.current}・途中`
                : dateKey(start) === dateKey(shiftPeriod(selectedKind, current, -1)) ? definition.previous : `過去の${definition.unit}`;
            byId("feedback-previous").hidden = all;
            byId("feedback-next").hidden = all;
            byId("feedback-previous").disabled = all;
            byId("feedback-next").disabled = all || start >= current;
            byId("feedback-previous").setAttribute("aria-label", all ? "前の期間" : `前の${definition.unit}`);
            byId("feedback-next").setAttribute("aria-label", all ? "次の期間" : `次の${definition.unit}`);
            document.querySelectorAll('[name="feedback-period-kind"]').forEach(input => { input.checked = input.value === selectedKind; });
            byId("feedback-source").textContent = sample ? "サンプルの振り返り" : "記録から作成した振り返り";
            byId("feedback-sample").textContent = sample ? "自分の記録に戻る" : "サンプルで試す";
            byId("feedback-sample").setAttribute("aria-pressed", String(sample));
            byId("feedback-sample-note").hidden = !sample;
            if (!summary.days) {
                const empty = node("div", "feedback-empty");
                empty.append(node("h3", "", storageUnavailable ? "記録を読み込めませんでした" : all ? "記録はまだありません" : `この${definition.unit}の記録はまだありません`),
                    node("p", "", storageUnavailable ? "ブラウザーの保存設定を確認してください。サンプル表示でも操作を試せます。"
                        : "食事や運動を記録すると、ここに振り返りが表示されます。期間を切り替えたり、サンプルでも試せます。"));
                report.append(empty);
                return;
            }
            const stats = node("div", "feedback-stats");
            for (const [label, value] of [
                ["食事を記録した日", `${summary.mealDays}日`],
                ["運動を記録した日", `${summary.workoutDays}日`],
                ["食事記録日の平均摂取", summary.mealDays ? `${format(summary.intake / summary.mealDays)} kcal` : "未記録"],
                ["記録した運動の消費合計", summary.workoutDays ? `${format(summary.burned)} kcal` : "未記録"]
            ]) {
                const stat = node("div", "feedback-stat");
                stat.append(node("span", "", label), node("strong", "", value));
                stats.append(stat);
            }
            const feedback = comments(summary, previous, { previous: definition.comparison, current: `この${definition.unit}${inProgress ? "（今日まで）" : ""}` });
            report.append(stats, node("p", "feedback-muted", `集計対象：${rangeLabel(start, through)}。この期間の記録は${summary.days}日分です。食事をすべて入力したかは判別できないため、摂取量の過不足は評価していません。`),
                card("できたこと", feedback.positive), card("記録から分かること", feedback.trend), card("次に試すことをひとつ", feedback.next, "feedback-card--next"));
            const nutrients = node("section", "feedback-nutrients");
            nutrients.append(node("h3", "", "栄養素の合計（入力済み分）"));
            const list = node("dl");
            summary.nutrients.forEach(field => {
                const row = node("div");
                const value = node("dd", "", field.count ? `${format(field.total)} g` : "未入力");
                if (summary.mealCount) value.append(node("small", "", `${summary.mealCount}件中${field.count}件に入力`));
                row.append(node("dt", "", field.label), value);
                list.append(row);
            });
            nutrients.append(list, node("p", "feedback-muted", "未入力の栄養素は合計に含めていません。運動の消費カロリーに、基礎代謝や日常生活での消費は含まれません。"));
            report.append(nutrients);
            if (active && !sample && selectedKind === "week" && dateKey(start) === dateKey(latestWeek())) {
                acknowledge(start, "viewed");
                renderNotice();
            }
        }
        function renderDaily() {
            const content = byId("daily-feedback-content");
            content.replaceChildren();
            if (!selectedDay) return;
            if (selectedDay > dateKey(new Date())) {
                content.append(node("p", "", "未来の日付はまだ振り返れません。記録した日を選んでください。"));
                return;
            }
            const day = new Date(selectedDay + "T00:00:00");
            const summary = summarize(records, day, day);
            if (!summary.days) {
                content.append(node("p", "", storageUnavailable ? "記録を読み込めませんでした。ブラウザーの保存設定を確認してください。" : "この日の記録はまだありません。食事や運動を記録すると、ここから振り返れます。"));
                return;
            }
            const feedback = comments(summary);
            content.append(node("p", "", feedback.positive), node("p", "", feedback.trend), node("p", "", `次に試すこと：${feedback.next}`),
                node("p", "feedback-muted", "入力済みの記録だけを振り返っています。未入力を不足と判定しません。"));
        }
        byId("feedback-notice-open").addEventListener("click", () => {
            selectedKind = "week";
            selectedPeriods.week = latestWeek();
            sample = false;
            document.dispatchEvent(new CustomEvent("record-view-request", { detail: "feedback" }));
            byId("feedback-title").focus({ preventScroll: true });
            byId("feedback-title").scrollIntoView({ block: "nearest" });
        });
        byId("feedback-notice-dismiss").addEventListener("click", () => {
            acknowledge(latestWeek(), "dismissed");
            renderNotice();
            document.querySelector('[data-view="calendar"]').focus({ preventScroll: true });
        });
        byId("feedback-granularity").addEventListener("change", event => {
            if (!Object.hasOwn(periods, event.target.value)) return;
            selectedKind = event.target.value;
            renderReport();
        });
        // ラジオボタンの矢印キーは集計単位だけを変更し、外側の画面スワイプには伝えない。
        byId("feedback-granularity").addEventListener("keydown", event => {
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.stopPropagation();
        });
        byId("feedback-previous").addEventListener("click", () => {
            if (selectedKind === "all") return;
            selectedPeriods[selectedKind] = shiftPeriod(selectedKind, selectedPeriods[selectedKind], -1);
            renderReport();
        });
        byId("feedback-next").addEventListener("click", () => {
            if (selectedKind === "all") return;
            if (selectedPeriods[selectedKind] < periodStart(selectedKind, new Date())) {
                selectedPeriods[selectedKind] = shiftPeriod(selectedKind, selectedPeriods[selectedKind], 1);
            }
            renderReport();
        });
        byId("feedback-sample").addEventListener("click", () => { sample = !sample; renderReport(); });
        byId("daily-feedback").addEventListener("toggle", () => { if (byId("daily-feedback").open) renderDaily(); });
        document.addEventListener("record-view-changed", event => {
            active = event.detail === "feedback";
            readRecords();
            renderNotice();
            if (active) renderReport();
        });
        document.addEventListener("record-date-changed", event => {
            if (selectedDay !== event.detail) byId("daily-feedback").open = false;
            selectedDay = event.detail;
        });
        function refresh() {
            readRecords();
            renderNotice();
            if (active) renderReport();
            if (byId("daily-feedback").open) renderDaily();
        }
        document.addEventListener("daily-record-saved", refresh);
        document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
        window.addEventListener("storage", event => {
            if (!event.key || event.key.startsWith("toresyoku.daily-record.") || event.key.startsWith(ackPrefix)) refresh();
        });
        readRecords();
        renderNotice();
        renderReport();
    });
})();
