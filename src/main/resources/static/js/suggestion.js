document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-suggestion-form]").forEach(form => {
        const button = form.querySelector('button[type="submit"]');
        const label = button.querySelector("[data-submit-label]");
        const loading = button.querySelector("[data-submit-loading]");
        const status = form.querySelector("[data-submit-status]");
        let submitting = false;

        function reset() {
            submitting = false;
            button.disabled = false;
            label.hidden = false;
            loading.hidden = true;
            form.removeAttribute("aria-busy");
            status.textContent = "提案の作成には少し時間がかかります。";
        }
        form.addEventListener("submit", event => {
            if (submitting || !form.reportValidity()) {
                event.preventDefault();
                return;
            }
            submitting = true;
            button.disabled = true;
            label.hidden = true;
            loading.hidden = false;
            form.setAttribute("aria-busy", "true");
            status.textContent = "食事と運動の提案を作成しています。そのままお待ちください。";
        });
        // ブラウザーの「戻る」で復元された場合も、条件を変えて再送信できる。
        window.addEventListener("pageshow", reset);
    });
});
