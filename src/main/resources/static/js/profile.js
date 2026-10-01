document.addEventListener("DOMContentLoaded", () => {
    const storageKey = "toresyoku.profile-settings";
    const defaultColor = "#ef233c";
    const page = document.querySelector(".record-page");
    const form = document.getElementById("profile-form");
    const height = document.getElementById("heightCm");
    const targetWeight = document.getElementById("profile-target-weight");
    const color = document.getElementById("profile-color");
    const palette = document.getElementById("profile-palette");
    const status = document.getElementById("profile-status");
    const validColor = value => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
    let settings = { themeColor: defaultColor };
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey));
        if (saved && typeof saved === "object") {
            if (Number.isFinite(saved.targetWeightKg) && saved.targetWeightKg >= 1 && saved.targetWeightKg <= 499.9) settings.targetWeightKg = saved.targetWeightKg;
            if (validColor(saved.themeColor)) settings.themeColor = saved.themeColor.toLowerCase();
        }
    } catch { status.textContent = "保存済みの設定を読み込めませんでした。変更はこの画面で利用できます。"; }
    targetWeight.value = settings.targetWeightKg ?? "";

    function publishProfile() {
        window.recordProfile = {
            heightCm: window.mealChatProfile?.heightCm ?? null,
            targetWeightKg: settings.targetWeightKg ?? null
        };
        document.dispatchEvent(new CustomEvent("profile-updated", { detail: window.recordProfile }));
    }
    publishProfile();

    function persist(message) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(settings));
            status.textContent = message;
        } catch {
            status.textContent = "変更を反映しましたが、保存できませんでした。ブラウザーの保存設定や空き容量をご確認ください。";
        }
    }
    function applyColor(value) {
        if (!validColor(value)) return;
        color.value = value;
        page.style.setProperty("--frame-color", value);
        document.getElementById("profile-color-value").textContent = value.toUpperCase();
        const swatches = [...palette.children];
        const selected = swatches.find(button => button.dataset.color === value.toLowerCase());
        swatches.forEach((button, index) => {
            button.setAttribute("aria-checked", String(button === selected));
            button.tabIndex = button === selected || (!selected && index === 0) ? 0 : -1;
        });
    }
    function chooseColor(value) {
        settings.themeColor = value.toLowerCase();
        applyColor(settings.themeColor);
        persist("テーマカラーを保存しました。");
    }
    function hslToHex(hue, lightness) {
        const a = Math.min(lightness, 1 - lightness);
        const channel = n => {
            const k = (n + hue / 30) % 12;
            return Math.round(255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0");
        };
        return "#" + channel(0) + channel(8) + channel(4);
    }
    const colors = [];
    for (const lightness of [.94, .84, .72, .6, .5, .38, .26]) {
        for (let hue = 0; hue < 360; hue += 30) colors.push(hslToHex(hue, lightness));
    }
    for (let index = 0; index < 12; index++) {
        const gray = Math.round(255 * (1 - index / 11)).toString(16).padStart(2, "0");
        colors.push("#" + gray.repeat(3));
    }
    colors.forEach(value => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "profile-swatch";
        button.dataset.color = value;
        button.style.setProperty("--swatch", value);
        button.setAttribute("role", "radio");
        button.setAttribute("aria-label", "テーマカラー " + value.toUpperCase());
        button.title = value.toUpperCase();
        button.addEventListener("click", () => chooseColor(value));
        palette.append(button);
    });
    palette.addEventListener("keydown", event => {
        const buttons = [...palette.children];
        const index = buttons.indexOf(event.target);
        if (index < 0) return;
        const offset = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 12, ArrowUp: -12 }[event.key];
        if (offset === undefined && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + offset + buttons.length) % buttons.length;
        buttons[nextIndex].focus();
        chooseColor(buttons[nextIndex].dataset.color);
    });
    color.addEventListener("input", () => applyColor(color.value));
    color.addEventListener("change", () => chooseColor(color.value));
    document.getElementById("profile-theme-reset").addEventListener("click", () => chooseColor(defaultColor));
    function updateTargetWeight() {
        if (!targetWeight.validity.valid) return;
        const value = targetWeight.value === "" ? null : targetWeight.valueAsNumber;
        if (settings.targetWeightKg === value) return;
        settings.targetWeightKg = value;
        persist("目標体重を保存しました。");
        publishProfile();
    }
    targetWeight.addEventListener("input", updateTargetWeight);
    function updateProfile() {
        if (!form.reportValidity()) return;
        settings.targetWeightKg = targetWeight.value === "" ? null : Number(targetWeight.value);
        const values = new FormData(form);
        window.mealChatProfile = {
            heightCm: Number(height.value),
            weightKg: Number(values.get("weightKg")),
            age: Number(values.get("age")),
            gender: values.get("gender"),
            goal: values.get("goal"),
            environment: values.get("environment"),
            allergy: values.get("allergy")
        };
        persist("相談に使う条件を更新し、目標体重を保存しました。");
        publishProfile();
    }
    form.addEventListener("change", event => {
        if (event.target === targetWeight) updateTargetWeight();
        else if (event.target.name) updateProfile();
    });
    form.addEventListener("submit", event => {
        event.preventDefault();
        updateProfile();
    });
    applyColor(settings.themeColor);
});
