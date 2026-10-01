document.addEventListener("DOMContentLoaded", () => {
    const dashboard = document.querySelector(".record-dashboard");
    const recordNavigation = document.getElementById("record-navigation");
    const recordEntry = document.getElementById("record-entry");
    const profileNavigation = document.getElementById("profile-navigation");
    const profilePanel = document.getElementById("profile-panel");
    const recommendations = dashboard.querySelector(".record-panel--right");
    const records = dashboard.querySelectorAll(".record-panel--left, .record-panel--center");
    const topics = [
        { key: "meal", label: "食事", prompt: "今日のおすすめの朝食・昼食・夕食を考えてください。" },
        { key: "workout", label: "運動", prompt: "今日のおすすめの運動メニューを考えてください。" }
    ];
    const chats = topics.map(topic => ({
        ...topic,
        panel: document.getElementById(topic.key + "-chat"),
        navigation: document.getElementById(topic.key + "-navigation"),
        input: document.getElementById(topic.key + "-chat-input")
    }));
    const panels = [...records, recommendations, recordEntry, profilePanel, ...chats.map(chat => chat.panel)];
    const panelAnimations = new Map();

    function cancelPanelAnimations() {
        panelAnimations.forEach(animation => animation.cancel());
        panelAnimations.clear();
    }

    function animateRevealedPanels(previouslyVisible) {
        cancelPanelAnimations();

        panels.filter(panel => !panel.hidden && !previouslyVisible.has(panel)).forEach(panel => {
            const animation = panel.animate([
                { transform: "translateY(-56px)", opacity: 0 },
                { transform: "translateY(0)", opacity: 1 }
            ], {
                duration: 650,
                easing: "cubic-bezier(0.25, 0.8, 0.25, 1)"
            });
            panelAnimations.set(panel, animation);
            animation.onfinish = () => {
                if (panelAnimations.get(panel) === animation) panelAnimations.delete(panel);
            };
        });
    }

    function showChat(key) {
        const previouslyVisible = new Set(panels.filter(panel => !panel.hidden));
        const selected = chats.find(chat => chat.key === key);
        const editing = key === "record";
        const profiling = key === "profile";
        chats.forEach(chat => {
            const visible = chat === selected;
            chat.panel.hidden = !visible;
            chat.navigation.textContent = visible ? "topに戻る" : chat.label + "について";
            chat.navigation.setAttribute("aria-expanded", String(visible));
        });
        records.forEach(element => { element.hidden = Boolean(selected) || editing; });
        recommendations.hidden = editing || profiling;
        profilePanel.hidden = !profiling;
        profileNavigation.textContent = profiling ? "topに戻る" : "プロフィール";
        profileNavigation.setAttribute("aria-expanded", String(profiling));
        recordEntry.hidden = !editing;
        recordNavigation.textContent = editing ? "topに戻る" : "記録する";
        recordNavigation.setAttribute("aria-expanded", String(editing));
        document.querySelector(".record-page").classList.toggle("record-page--entry", editing);
        dashboard.classList.toggle("record-dashboard--entry", editing);
        dashboard.classList.toggle("record-dashboard--chat", Boolean(selected));
        dashboard.classList.toggle("record-dashboard--profile", profiling);
        document.querySelector(".record-page").classList.toggle("record-page--profile", profiling);
        document.title = profiling ? "プロフィール｜トレ食" : editing ? "記録する｜トレ食" : selected ? selected.label + "の相談｜トレ食" : "記録一覧｜トレ食";
        if (profiling) document.getElementById("profile-title").focus();
        if (editing) document.dispatchEvent(new CustomEvent("record-entry-open"));
        selected?.input.focus();
        animateRevealedPanels(previouslyVisible);
    }

    function refreshMenuVisibility() {
        const meals = [...recommendations.querySelectorAll("[data-meal]")];
        meals.forEach(item => { item.closest(".menu-card").hidden = !item.textContent.trim(); });
        const training = [...recommendations.querySelectorAll("#recommended-training .training-card")];
        training.forEach(card => { card.hidden = !card.querySelector(".training-card__top strong")?.textContent.trim(); });
        const hasMeals = meals.some(item => item.textContent.trim());
        const hasTraining = training.some(card => !card.hidden);
        document.getElementById("meal-menu").hidden = !hasMeals;
        document.getElementById("workout-menu").hidden = !hasTraining;
        document.getElementById("menu-empty").hidden = hasMeals || hasTraining;
        recommendations.querySelectorAll("[data-menu-dependent]").forEach(element => {
            element.hidden = !(hasMeals || hasTraining);
        });
        const notices = recommendations.querySelector(".suggestion-notices");
        if (notices) {
            const messages = [...notices.querySelectorAll(".notice")];
            messages.forEach(message => { message.hidden = !message.textContent.trim(); });
            notices.hidden = !(hasMeals || hasTraining) || !messages.some(message => !message.hidden);
        }
    }
    refreshMenuVisibility();

    function updateTraining(training) {
        const container = document.getElementById("recommended-training");
        if (!container) return;
        const cards = training.filter(exercise => typeof exercise?.name === "string" && exercise.name.trim()).map(exercise => {
            const card = document.createElement("article");
            card.className = "training-card";
            const top = document.createElement("div");
            top.className = "training-card__top";
            const name = document.createElement("strong");
            name.textContent = exercise.name;
            const sets = document.createElement("span");
            sets.textContent = exercise.sets;
            const note = document.createElement("p");
            note.textContent = exercise.note;
            top.append(name);
            if (sets.textContent.trim()) top.append(sets);
            card.append(top);
            if (note.textContent.trim()) card.append(note);
            return card;
        });
        container.replaceChildren(...cards);
    }

    recordNavigation.addEventListener("click", () => showChat(recordEntry.hidden ? "record" : null));
    profileNavigation.addEventListener("click", () => showChat(profilePanel.hidden ? "profile" : null));
    document.querySelectorAll("[data-open-profile]").forEach(button => {
        button.addEventListener("click", () => showChat("profile"));
    });
    document.querySelectorAll("[data-open-chat]").forEach(button => {
        button.addEventListener("click", () => showChat(button.dataset.openChat));
    });
    chats.forEach(chat => {
        chat.navigation.addEventListener("click", () => showChat(chat.panel.hidden ? chat.key : null));
        initializeChat(chat);
    });

    function initializeChat({ key, panel, input, prompt }) {
        const messages = document.getElementById(key + "-chat-messages");
        const status = document.getElementById(key + "-chat-status");
        const send = document.getElementById(key + "-chat-send");
        const recommend = document.getElementById(key + "-chat-recommend");
        const history = [];
        let busy = false;

        function appendMessage(role, text) {
            const message = document.createElement("article");
            message.className = "meal-chat__message" + (role === "user" ? " meal-chat__message--user" : "");
            const avatar = document.createElement("span");
            avatar.className = "meal-chat__avatar";
            avatar.textContent = role === "user" ? "あなた" : "AI";
            const bubble = document.createElement("p");
            bubble.className = "meal-chat__bubble";
            bubble.textContent = text;
            message.append(avatar, bubble);
            messages.append(message);
            messages.scrollTop = messages.scrollHeight;
            return message;
        }
        async function submit(generateMenu) {
            if (busy) return;
            const draft = input.value;
            const message = generateMenu
                ? prompt + (draft.trim() ? "\n希望：" + draft.trim() : "")
                : draft.trim();
            if (!message) { input.focus(); return; }
            busy = true;
            send.disabled = recommend.disabled = true;
            panel.setAttribute("aria-busy", "true");
            status.textContent = "AIが考えています…";
            const userMessage = appendMessage("user", message);
            const abort = new AbortController();
            const timeout = setTimeout(() => abort.abort(), 110000);
            try {
                const response = await fetch(panel.dataset.endpoint, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profile: window.mealChatProfile, message, generateMenu, history: history.slice(-12) }),
                    signal: abort.signal
                });
                if (!response.ok) throw new Error("request failed");
                const result = await response.json();
                appendMessage("assistant", result.reply);
                history.push({ role: "user", text: message }, { role: "assistant", text: result.reply });
                if (input.value === draft) input.value = "";
                if (result.meal) {
                    for (const key of ["breakfast", "lunch", "dinner"]) {
                        const item = document.querySelector('[data-meal="' + key + '"]');
                        if (item) item.textContent = result.meal[key] ?? "";
                    }
                }
                if (key === "workout" && result.training) updateTraining(result.training);
                refreshMenuVisibility();
                status.textContent = result.sample ? "サンプル表示です。AI未接続のため、相談内容に応じた回答はできません。" : "";
            } catch (error) {
                userMessage.remove();
                status.textContent = "送信できませんでした。時間をおいて、もう一度お試しください。";
            } finally {
                clearTimeout(timeout);
                busy = false;
                send.disabled = recommend.disabled = false;
                panel.setAttribute("aria-busy", "false");
            }
        }
        document.getElementById(key + "-chat-form").addEventListener("submit", event => { event.preventDefault(); submit(false); });
        recommend.addEventListener("click", () => submit(true));
        input.addEventListener("keydown", event => {
            if (event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
                event.preventDefault();
                submit(false);
            }
        });
    }
});
