/**
 * もんだい — SPA Router & App Entry
 * Hash ルーターで画面遷移を管理
 */
(function () {
    const container = document.getElementById('screen-container');

    // ルート定義
    const routes = {
        '/': () => SelectScreen.render(container),
        '/select': () => SelectScreen.render(container),
        '/quiz/:setId': (params) => QuizScreen.render(container, params.setId),
        '/result': () => ResultScreen.render(container),
    };

    /**
     * 現在のハッシュからルートをマッチしてレンダリング
     */
    function navigate() {
        const hash = window.location.hash.replace('#', '') || '/';
        let matched = false;

        for (const [pattern, handler] of Object.entries(routes)) {
            const params = matchRoute(pattern, hash);
            if (params !== null) {
                handler(params);
                matched = true;
                break;
            }
        }

        if (!matched) {
            // 不明なルート → セット選択へ
            window.location.hash = '#/';
        }
    }

    /**
     * パターンマッチング
     * /quiz/:setId → /quiz/set-001 → { setId: 'set-001' }
     */
    function matchRoute(pattern, path) {
        const patternParts = pattern.split('/').filter(Boolean);
        const pathParts = path.split('/').filter(Boolean);

        if (patternParts.length !== pathParts.length) return null;

        const params = {};
        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
            } else if (patternParts[i] !== pathParts[i]) {
                return null;
            }
        }

        return params;
    }

    // ハッシュ変更時にナビゲーション
    window.addEventListener('hashchange', navigate);

    // 初期ロード
    window.addEventListener('DOMContentLoaded', () => {
        // clientId を初期化
        if (!localStorage.getItem('mondai_client_id')) {
            localStorage.setItem('mondai_client_id', crypto.randomUUID());
        }
        navigate();
    });
})();
