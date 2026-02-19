/**
 * API通信モジュール
 * バックエンドとの通信を管理
 */
const MondaiAPI = (() => {
    // API Base URL — Cloudflare Workers
    const API_BASE = 'https://mondai-backend.nao-onion.workers.dev';

    /**
     * 結果を送信し、集計データを取得
     * @param {Object} payload - 送信データ
     * @returns {Promise<Object>} レスポンスデータ
     */
    async function submitResult(payload) {
        const response = await fetch(`${API_BASE}/api/results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `送信エラー (${response.status})`);
        }

        return response.json();
    }

    /**
     * リトライ付きの結果送信
     * @param {Object} payload - 送信データ
     * @param {number} maxRetries - 最大リトライ回数
     * @returns {Promise<Object>}
     */
    async function submitResultWithRetry(payload, maxRetries = 3) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await submitResult(payload);
            } catch (err) {
                lastError = err;
                // 指数バックオフ
                if (i < maxRetries - 1) {
                    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
                }
            }
        }
        throw lastError;
    }

    /**
     * 特定の結果を取得
     * @param {string} resultId
     * @returns {Promise<Object>}
     */
    async function getResult(resultId) {
        const response = await fetch(`${API_BASE}/api/results/${resultId}`);
        if (!response.ok) {
            throw new Error(`取得エラー (${response.status})`);
        }
        return response.json();
    }

    /**
     * セットの集計データを取得
     * @param {string} setId
     * @param {number} version
     * @returns {Promise<Object>}
     */
    async function getStats(setId, version = 1) {
        const response = await fetch(`${API_BASE}/api/sets/${setId}/stats?version=${version}`);
        if (!response.ok) {
            throw new Error(`集計取得エラー (${response.status})`);
        }
        return response.json();
    }

    return {
        submitResult,
        submitResultWithRetry,
        getResult,
        getStats,
    };
})();
