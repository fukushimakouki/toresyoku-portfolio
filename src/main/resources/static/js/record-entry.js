// 日付ごとの記録をこのブラウザーに保存する。
(() => {
    const prefix = "toresyoku.daily-record.";
    const mealCategories = [
        { value: "breakfast", label: "朝食" },
        { value: "lunch", label: "昼食" },
        { value: "snack", label: "間食" },
        { value: "dinner", label: "夕食" }
    ];
    const nutrientFields = [
        { key: "proteinG", label: "タンパク質" },
        { key: "fatG", label: "脂質" },
        { key: "carbohydratesG", label: "炭水化物" },
        { key: "fiberG", label: "食物繊維" },
        { key: "saltG", label: "塩分" }
    ];
    function valid(record) {
        const validItems = items => Array.isArray(items) && items.every(item =>
            item && typeof item.name === "string" && Number.isFinite(item.calories) && item.calories >= 0);
        const validNutrients = item => nutrientFields.every(({ key }) => item[key] == null ||
            (Number.isFinite(item[key]) && item[key] >= 0 && item[key] <= 100000));
        const validCategory = item => item.category == null ||
            mealCategories.some(category => category.value === item.category);
        return record && /^\d{4}-\d{2}-\d{2}$/.test(record.date) && validItems(record.meals) &&
            record.meals.every(item => validNutrients(item) && validCategory(item)) &&
            validItems(record.workouts) && (record.weight === null ||
                (Number.isFinite(record.weight) && record.weight >= 1 && record.weight < 500));
    }
    window.recordStore = {
        mealCategories,
        nutrientFields,
        read(date) {
            const raw = localStorage.getItem(prefix + date);
            if (!raw) return null;
            const record = JSON.parse(raw);
            if (!valid(record) || record.date !== date) throw new Error("Invalid record");
            return record;
        },
        all() {
            const records = [];
            for (let index = 0; index < localStorage.length; index++) {
                const key = localStorage.key(index);
                if (!key?.startsWith(prefix)) continue;
                try {
                    const record = this.read(key.slice(prefix.length));
                    if (record) records.push(record);
                } catch { /* 他の日付の正常な記録は読み込む。 */ }
            }
            return records;
        },
        save(record) {
            if (!valid(record)) throw new Error("Invalid record");
            localStorage.setItem(prefix + record.date, JSON.stringify(record));
        }
    };
})();

document.addEventListener("DOMContentLoaded", () => {
    const panel = document.getElementById("record-entry");
    const form = document.getElementById("record-entry-form");
    const title = document.getElementById("record-entry-title");
    const status = document.getElementById("record-entry-status");
    const whole = document.getElementById("entry-weight-whole");
    const decimal = document.getElementById("entry-weight-decimal");
    const lists = {
        meals: document.getElementById("entry-meal-list"),
        workouts: document.getElementById("entry-workout-list")
    };
    const nutrientFields = window.recordStore.nutrientFields;
    const nutrientTotals = document.getElementById("entry-nutrient-totals");
    const nutrientOutputs = new Map();
    for (const { key, label } of nutrientFields) {
        const item = document.createElement("div");
        const term = document.createElement("dt");
        term.textContent = label;
        const value = document.createElement("dd");
        const output = document.createElement("output");
        output.id = "entry-total-" + key;
        output.textContent = "未入力";
        nutrientOutputs.set(key, output);
        value.append(output);
        item.append(term, value);
        nutrientTotals.querySelector("dl").append(item);
    }
    let activeDate;
    const rows = kind => [...lists[kind].children];
    const total = kind => rows(kind).reduce((sum, row) => sum + (Number(row.querySelector('[data-calories]').value) || 0), 0);
    function updateTotals() {
        const intake = total("meals");
        const burned = total("workouts");
        document.getElementById("entry-meal-total").textContent = `+${intake.toLocaleString()} kcal`;
        document.getElementById("entry-workout-total").textContent = `−${burned.toLocaleString()} kcal`;
        document.getElementById("entry-balance").textContent = `${intake} kcal − ${burned} kcal = ${intake - burned} kcal`;
        document.getElementById("entry-meal-empty").hidden = rows("meals").length > 0;
        document.getElementById("entry-workout-empty").hidden = rows("workouts").length > 0;
        nutrientTotals.hidden = rows("meals").length === 0;
        for (const { key } of nutrientFields) {
            const inputs = rows("meals").map(row => row.querySelector(`[data-nutrient="${key}"]`))
                .filter(input => input.value !== "" && input.validity.valid);
            const sum = inputs.reduce((value, input) => value + input.valueAsNumber, 0);
            nutrientOutputs.get(key).textContent = inputs.length
                ? `${sum.toLocaleString("ja-JP", { maximumFractionDigits: 2 })} g` : "未入力";
        }
    }
    function addRow(kind, item = null, focus = true) {
        const label = kind === "meals" ? "食事" : "運動";
        const row = document.createElement("div");
        row.className = "record-entry__row";
        const bullet = document.createElement("span");
        bullet.textContent = "・";
        bullet.setAttribute("aria-hidden", "true");
        const name = document.createElement("input");
        name.dataset.name = "";
        name.required = true;
        name.maxLength = 120;
        name.placeholder = kind === "meals" ? "食べたもの・量" : "運動・時間・回数";
        name.setAttribute("aria-label", label + "の内容");
        name.value = item?.name ?? "";
        const calories = document.createElement("input");
        calories.dataset.calories = "";
        calories.type = "number";
        calories.min = "0";
        calories.max = "100000";
        calories.step = "1";
        calories.required = true;
        calories.placeholder = "0";
        calories.setAttribute("aria-label", label + "のカロリー（kcal）");
        calories.value = item?.calories ?? "";
        const unit = document.createElement("span");
        unit.textContent = "kcal";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "record-entry__remove";
        remove.textContent = "×";
        remove.setAttribute("aria-label", label + "の行を削除");
        remove.addEventListener("click", () => {
            row.remove();
            updateTotals();
            status.textContent = "";
            document.getElementById(kind === "meals" ? "entry-add-meal" : "entry-add-workout").focus();
        });
        row.append(bullet, name);
        if (kind === "meals") {
            row.classList.add("record-entry__row--meal");
            const category = document.createElement("select");
            category.dataset.category = "";
            category.required = true;
            category.setAttribute("aria-label", "食事のカテゴリー");
            for (const { value, label } of window.recordStore.mealCategories) {
                category.append(new Option(label, value));
            }
            category.value = item?.category ?? "breakfast";
            row.append(category);
        }
        row.append(calories, unit, remove);
        if (kind === "meals") {
            const nutrients = document.createElement("div");
            nutrients.className = "record-entry__nutrients";
            for (const { key, label } of nutrientFields) {
                const field = document.createElement("label");
                field.textContent = label + "（g）";
                const input = document.createElement("input");
                input.dataset.nutrient = key;
                input.type = "number";
                input.min = "0";
                input.max = "100000";
                input.step = "0.01";
                input.inputMode = "decimal";
                input.placeholder = "未入力";
                input.value = item?.[key] ?? "";
                field.append(input);
                nutrients.append(field);
            }
            row.append(nutrients);
        }
        lists[kind].append(row);
        updateTotals();
        if (focus) { status.textContent = ""; name.focus(); }
    }
    document.getElementById("entry-add-meal").addEventListener("click", () => addRow("meals"));
    document.getElementById("entry-add-workout").addEventListener("click", () => addRow("workouts"));
    let pendingEstimates = 0;
    const estimateMessages = ["meal", "workout"].map(type => document.getElementById(`entry-estimate-${type}-status`));
    async function estimateCalories(kind, type, button, message) {
        if (button.disabled || !activeDate) return;
        const targets = rows(kind).filter(row => row.querySelector('[data-calories]').value === "");
        if (!targets.length) {
            message.textContent = rows(kind).length
                ? "カロリーは入力済みです。調べ直す項目のカロリー欄を空にしてください。"
                : "「追加」から食事・運動の内容を入力してください。";
            return;
        }
        const missing = targets.find(row => !row.querySelector('[data-name]').value.trim());
        if (missing) {
            message.textContent = "食事の内容と量、または運動の内容と時間・回数を入力してください。";
            missing.querySelector('[data-name]').focus();
            return;
        }
        if (type === "workout" && !whole.reportValidity()) return;
        const weightKg = type === "workout" && whole.value !== ""
            ? Number(whole.value) + Number(decimal.value) / 10 : null;
        const date = activeDate;
        const originalLabel = button.innerHTML;
        button.disabled = true;
        button.textContent = "AIが調べています…";
        button.setAttribute("aria-busy", "true");
        pendingEstimates++;
        document.getElementById("entry-save").disabled = true;
        message.textContent = targets.length + "件のカロリーを調べています…";
        let applied = 0;
        let skipped = 0;
        let failed = 0;
        let failureMessage = "";
        try {
            await Promise.all(targets.map(async row => {
                const name = row.querySelector('[data-name]');
                const calories = row.querySelector('[data-calories]');
                const description = name.value.trim();
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 110000);
                try {
                    const response = await fetch(panel.dataset.endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type, description, weightKg }),
                        signal: controller.signal
                    });
                    if (!response.ok) {
                        throw new Error(response.status === 503
                            ? "AIが未接続のため推定できません。カロリーを手入力してください。"
                            : "カロリーを推定できませんでした。再試行するか、手入力してください。");
                    }
                    const result = await response.json();
                    if (!Number.isInteger(result.calories) || result.calories < 0 || result.calories > 100000) {
                        throw new Error("推定結果を読み取れませんでした。再試行するか、手入力してください。");
                    }
                    // 待機中に編集・削除された行や別の日付には結果を反映しない。
                    if (activeDate !== date || !row.isConnected || name.value.trim() !== description || calories.value !== "") {
                        skipped++;
                        return;
                    }
                    calories.value = result.calories;
                    applied++;
                    updateTotals();
                } catch (error) {
                    failed++;
                    failureMessage = error.name === "AbortError"
                        ? "推定に時間がかかっています。再試行するか、手入力してください。"
                        : error instanceof TypeError
                            ? "AIに接続できませんでした。再試行するか、手入力してください。"
                            : "カロリーを推定できませんでした。再試行するか、手入力してください。";
                    if (error.message.startsWith("AIが未接続")) failureMessage = error.message;
                } finally { clearTimeout(timeout); }
            }));
            if (activeDate === date) {
                message.textContent = [
                    applied ? applied + "件のカロリーを反映しました。推定値は変更できます。" : "",
                    skipped ? skipped + "件は入力内容が変わったため反映しませんでした。" : "",
                    failed ? failed + "件を推定できませんでした。" + failureMessage : ""
                ].filter(Boolean).join(" ");
            }
        } finally {
            button.disabled = false;
            button.innerHTML = originalLabel;
            button.removeAttribute("aria-busy");
            pendingEstimates--;
            document.getElementById("entry-save").disabled = pendingEstimates > 0;
        }
    }
    for (const [kind, type] of [["meals", "meal"], ["workouts", "workout"]]) {
        const button = document.getElementById("entry-estimate-" + type);
        const message = document.getElementById("entry-estimate-" + type + "-status");
        button.addEventListener("click", () => estimateCalories(kind, type, button, message));
    }
    form.addEventListener("input", () => { updateTotals(); status.textContent = ""; });
    document.addEventListener("record-entry-open", () => {
        const now = new Date();
        const date = panel.dataset.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        if (date !== activeDate) {
            activeDate = null;
            estimateMessages.forEach(message => { message.textContent = ""; });
            let saved;
            try { saved = window.recordStore.read(date); }
            catch {
                status.textContent = "保存済みの記録を読み込めません。ブラウザーの保存設定をご確認ください。";
                return;
            }
            activeDate = date;
            title.textContent = `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日の記録`;
            lists.meals.replaceChildren();
            lists.workouts.replaceChildren();
            for (const kind of ["meals", "workouts"]) {
                (saved?.[kind] ?? []).forEach(item => addRow(kind, item, false));
            }
            whole.value = saved?.weight == null ? "" : Math.floor(saved.weight);
            decimal.value = saved?.weight == null ? "0" : String(Math.round(saved.weight * 10) % 10);
            status.textContent = "";
            updateTotals();
        }
        title.focus();
    });
    form.addEventListener("submit", event => {
        event.preventDefault();
        if (pendingEstimates || !activeDate || !form.reportValidity()) return;
        const record = { date: activeDate, weight: whole.value === "" ? null : Number(whole.value) + Number(decimal.value) / 10 };
        for (const kind of ["meals", "workouts"]) {
            record[kind] = rows(kind).map(row => {
                const item = {
                    name: row.querySelector('[data-name]').value.trim(),
                    calories: Number(row.querySelector('[data-calories]').value)
                };
                if (kind === "meals") {
                    item.category = row.querySelector('[data-category]').value;
                    for (const { key } of nutrientFields) {
                        const input = row.querySelector(`[data-nutrient="${key}"]`);
                        item[key] = input.value === "" ? null : input.valueAsNumber;
                    }
                }
                return item;
            });
            if (record[kind].some(item => !item.name)) {
                status.textContent = "食事・運動の内容を入力してください。";
                return;
            }
        }
        try { window.recordStore.save(record); }
        catch { status.textContent = "保存できませんでした。ブラウザーの保存設定や空き容量をご確認ください。"; return; }
        document.dispatchEvent(new CustomEvent("daily-record-saved", { detail: record }));
        status.textContent = "記録を保存しました。「topに戻る」から確認できます。";
    });
});
