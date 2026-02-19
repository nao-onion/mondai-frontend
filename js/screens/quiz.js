/**
 * S2: クイズ画面
 * 問題表示、回答入力、タイマー、正解判定を管理
 */
const QuizScreen = (() => {
    let questions = [];
    let currentIndex = 0;
    let answers = [];
    let questionStartTime = 0;
    let totalStartTime = null;
    let timerInterval = null;
    let currentSetId = '';
    let currentSetVersion = 1;

    /**
     * 問題セットを読み込む
     */
    async function loadQuestions(setId) {
        const response = await fetch(`assets/sets/${setId}.json`);
        if (!response.ok) throw new Error('問題セットの取得に失敗しました');
        const data = await response.json();
        currentSetId = data.id || setId;
        currentSetVersion = data.version || 1;
        questions = data.questions || [];
        return data;
    }

    /**
     * 画面をレンダリング
     */
    async function render(container, setId) {
        try {
            await loadQuestions(setId);
        } catch (err) {
            container.innerHTML = `
        <div class="select-screen screen-enter">
          <h1>エラー</h1>
          <p class="subtitle">${err.message}</p>
          <a href="#/" class="btn btn-primary" style="margin-top: 2rem;">セット選択に戻る</a>
        </div>
      `;
            return;
        }

        currentIndex = 0;
        answers = [];
        totalStartTime = new Date().toISOString();

        renderQuestion(container);
    }

    function renderQuestion(container) {
        const q = questions[currentIndex];
        const progress = ((currentIndex) / questions.length) * 100;

        const html = `
      <div class="quiz-screen screen-enter">
        <div class="quiz-progress">
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${progress}%"></div>
          </div>
          <span class="progress-text">${currentIndex + 1} / ${questions.length}</span>
        </div>

        <div class="quiz-timer">
          <div class="timer-display" id="timer-display">0.0s</div>
        </div>

        <div class="quiz-question-card" id="question-card">
          ${q.image ? `
            <div class="question-image-wrapper">
              <img src="${q.image}" alt="問題画像" loading="eager">
            </div>
          ` : ''}
          <p class="question-text">${escapeHtml(q.text)}</p>
        </div>

        <div class="quiz-answer-area">
          <input
            type="text"
            class="answer-input"
            id="answer-input"
            placeholder="答えを入力..."
            autocomplete="off"
            autofocus
          >
        </div>
      </div>
    `;

        container.innerHTML = html;

        // タイマー開始
        questionStartTime = performance.now();
        startTimer();

        // Enter で回答
        const input = document.getElementById('answer-input');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.value.trim() !== '') {
                handleAnswer(container, input.value.trim());
            }
        });

        // フォーカス
        requestAnimationFrame(() => input.focus());
    }

    function startTimer() {
        clearInterval(timerInterval);
        const display = document.getElementById('timer-display');
        timerInterval = setInterval(() => {
            if (display) {
                const elapsed = (performance.now() - questionStartTime) / 1000;
                display.textContent = `${elapsed.toFixed(1)}s`;
            }
        }, 100);
    }

    function handleAnswer(container, entered) {
        const q = questions[currentIndex];

        // 正解判定（大文字小文字・前後空白を無視）
        const isCorrect = normalizeAnswer(entered) === normalizeAnswer(q.answer);

        if (isCorrect) {
            // 正解時のみタイマー停止＆回答記録
            clearInterval(timerInterval);
            const elapsedMs = Math.round(performance.now() - questionStartTime);

            answers.push({
                questionId: q.id,
                entered,
                isCorrect,
                elapsedMs: Math.max(1, Math.min(elapsedMs, 1_800_000)),
            });
        }

        // フィードバック表示
        showFeedback(container, isCorrect, q.answer);
    }

    function showFeedback(container, isCorrect, correctAnswer) {
        const card = document.getElementById('question-card');
        if (card) {
            card.classList.add(isCorrect ? 'correct' : 'incorrect');
        }

        // 絵文字ポップ
        const emoji = document.createElement('div');
        emoji.className = 'feedback-overlay';
        emoji.textContent = isCorrect ? '⭕' : '❌';
        document.body.appendChild(emoji);

        const input = document.getElementById('answer-input');

        if (isCorrect) {
            // 正解 → 次の問題へ
            if (input) {
                input.disabled = true;
            }
            setTimeout(() => {
                emoji.remove();
                currentIndex++;
                if (currentIndex < questions.length) {
                    renderQuestion(container);
                } else {
                    finishQuiz(container);
                }
            }, 600);
        } else {
            // 不正解 → 同じ問題に留まる（入力クリアしてリトライ）
            if (input) {
                input.value = '';
                input.style.animation = 'shake 0.4s ease';
                setTimeout(() => {
                    input.style.animation = '';
                    input.focus();
                }, 400);
            }
            // カードのフィードバックをリセット
            setTimeout(() => {
                emoji.remove();
                if (card) {
                    card.classList.remove('incorrect');
                }
            }, 600);
        }
    }

    function finishQuiz(container) {
        clearInterval(timerInterval);
        const finishedAt = new Date().toISOString();
        const clientId = getClientId();

        const resultData = {
            clientId,
            setId: currentSetId,
            setVersion: currentSetVersion,
            startedAt: totalStartTime,
            finishedAt,
            answers,
            meta: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        };

        // 結果画面へ遷移（データをグローバルに渡す）
        window.__quizResult = resultData;
        window.location.hash = '#/result';
    }

    function normalizeAnswer(str) {
        return str
            .trim()
            .toLowerCase()
            .replace(/[\s　]+/g, '')   // 全角・半角スペース削除
            .replace(/[ａ-ｚＡ-Ｚ０-９]/g, (ch) =>
                String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
            ); // 全角英数を半角に変換
    }

    function getClientId() {
        let id = localStorage.getItem('mondai_client_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('mondai_client_id', id);
        }
        return id;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return { render };
})();
