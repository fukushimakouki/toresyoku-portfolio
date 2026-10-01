(() => {
    'use strict';

    const form = document.getElementById('login-form');
    const status = document.getElementById('login-status');
    const password = document.getElementById('login-password');

    // The screen is ready for authentication integration. Do not transmit or
    // persist credentials until the server-side login endpoint is implemented.
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        password.value = '';
        status.textContent = 'ログイン機能は準備中です。現在はログインできません。';
    });

    document.getElementById('register-button').addEventListener('click', () => {
        status.textContent = '新規登録は準備中です。受付開始までお待ちください。';
    });

    form.querySelector('button[type="submit"]').disabled = false;
})();
