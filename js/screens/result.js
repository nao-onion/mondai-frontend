/**
 * S3: 結果画面
 * スコア表示、問題ごとの比較、API送信
 */
const ResultScreen = (() => {

    /**
     * 画面をレンダリング
     */
    async function render(container) {
        const resultData = window.__quizResult;

        if (!resultData) {
            container.innerHTML = `
        <div class="select-screen screen-enter">
          <h1>結果がありません</h1>
          <p class="subtitle">クイズを先に受けてください。</p>
          <a href="#/" class="btn btn-primary" style="margin-top: 2rem;">セット選択へ</a>
        </div>
      `;
            return;
        }

        const { answers } = resultData;
        const correctCount = answers.filter((a) => a.isCorrect).length;
        const totalQuestions = answers.length;
        const totalElapsedMs = answers.reduce((sum, a) => sum + a.elapsedMs, 0);
        const scorePercent = Math.round((correctCount / totalQuestions) * 100);

        // SVG circle params
        const radius = 65;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (scorePercent / 100) * circumference;

        const html = `
      <div class="result-screen screen-enter">
        <div class="result-hero">
          <h1>クイズ完了！</h1>

          <div class="result-score-ring">
            <svg viewBox="0 0 160 160">
              <defs>
                <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#6366f1"/>
                  <stop offset="100%" stop-color="#a78bfa"/>
                </linearGradient>
              </defs>
              <circle class="score-ring-bg" cx="80" cy="80" r="${radius}"/>
              <circle class="score-ring-fill" cx="80" cy="80" r="${radius}"
                id="score-ring"
                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${circumference};"
              />
            </svg>
            <div class="score-value">${scorePercent}<small>%</small></div>
          </div>

          <div class="result-summary-row">
            <div class="summary-stat">
              <div class="summary-stat-value">${correctCount} / ${totalQuestions}</div>
              <div class="summary-stat-label">正解数</div>
            </div>
            <div class="summary-stat">
              <div class="summary-stat-value">${formatTime(totalElapsedMs)}</div>
              <div class="summary-stat-label">合計時間</div>
            </div>
          </div>
        </div>

        <div class="result-question-list">
          <h2>問題ごとの結果</h2>
          <div id="question-results">
            ${answers.map((a, i) => renderQuestionResult(a, i, null)).join('')}
          </div>
        </div>

        <div id="send-status" class="send-status sending">
          ⏳ 結果を送信中...
        </div>

        <div class="result-actions">
          <a href="#/" class="btn btn-secondary">🏠 セット選択に戻る</a>
          <a href="#/quiz/${resultData.setId}" class="btn btn-primary">🔄 もう一度挑戦</a>
        </div>
      </div>
    `;

        container.innerHTML = html;

        // スコアリングアニメーション
        requestAnimationFrame(() => {
            setTimeout(() => {
                const ring = document.getElementById('score-ring');
                if (ring) {
                    ring.style.strokeDashoffset = offset;
                }
            }, 200);
        });

        // API送信
        await sendResult(resultData);
    }

    function renderQuestionResult(answer, index, stat) {
        const avgMs = stat ? stat.avgElapsedMs : null;
        const maxMs = avgMs ? Math.max(answer.elapsedMs, avgMs) * 1.3 : answer.elapsedMs;
        const yourWidth = maxMs > 0 ? (answer.elapsedMs / maxMs) * 100 : 0;
        const avgWidth = avgMs && maxMs > 0 ? (avgMs / maxMs) * 100 : 0;

        return `
      <div class="result-q-card">
        <div class="result-q-status ${answer.isCorrect ? 'correct' : 'incorrect'}">
          ${answer.isCorrect ? '✓' : '✗'}
        </div>
        <div class="result-q-info">
          <div class="result-q-title">Q${index + 1}: ${escapeHtml(answer.questionId)}</div>
          <div class="result-q-times">
            <span class="your-time">⏱ あなた: ${formatTime(answer.elapsedMs)}</span>
            ${avgMs !== null ? `<span>📊 平均: ${formatTime(avgMs)} (${stat.samples}人)</span>` : ''}
          </div>
        </div>
        <div class="time-bar-container">
          <div class="time-bar-track">
            <div class="time-bar-you" style="width: ${yourWidth}%"></div>
          </div>
          ${avgMs !== null ? `
            <div class="time-bar-track">
              <div class="time-bar-avg" style="width: ${avgWidth}%"></div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    }

    async function sendResult(resultData) {
        const statusEl = document.getElementById('send-status');

        try {
            const response = await MondaiAPI.submitResultWithRetry(resultData);

            if (statusEl) {
                statusEl.className = 'send-status success';
                statusEl.innerHTML = '✅ 結果を送信しました！';
            }

            // 集計データで表示を更新
            if (response && response.questionStats) {
                updateWithStats(resultData.answers, response.questionStats);
            }

        } catch (err) {
            console.error('Submit failed:', err);
            if (statusEl) {
                statusEl.className = 'send-status error';
                statusEl.innerHTML = `
          ❌ 送信に失敗しました
          <button class="btn btn-danger" style="margin-left: 1rem; padding: 0.4rem 1rem; font-size: 0.85rem;"
            onclick="ResultScreen.retrySubmit()">
            リトライ
          </button>
        `;
            }
        }
    }

    function updateWithStats(answers, questionStats) {
        const container = document.getElementById('question-results');
        if (!container) return;

        const statsMap = {};
        questionStats.forEach((s) => { statsMap[s.questionId] = s; });

        container.innerHTML = answers.map((a, i) => {
            const stat = statsMap[a.questionId] || null;
            return renderQuestionResult(a, i, stat);
        }).join('');
    }

    /**
     * リトライ（グローバル公開）
     */
    function retrySubmit() {
        const resultData = window.__quizResult;
        if (!resultData) return;

        const statusEl = document.getElementById('send-status');
        if (statusEl) {
            statusEl.className = 'send-status sending';
            statusEl.innerHTML = '⏳ 再送信中...';
        }

        sendResult(resultData);
    }

    function formatTime(ms) {
        if (ms < 1000) return `${ms}ms`;
        const sec = (ms / 1000).toFixed(1);
        return `${sec}秒`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return { render, retrySubmit };
})();
