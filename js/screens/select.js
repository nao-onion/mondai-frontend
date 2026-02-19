/**
 * S1: 問題セット選択画面
 */
const SelectScreen = (() => {
    let setsData = [];

    /**
     * セット一覧を読み込む
     */
    async function loadSets() {
        try {
            const response = await fetch('assets/sets/index.json');
            if (!response.ok) throw new Error('セット一覧の取得に失敗しました');
            setsData = await response.json();
        } catch (err) {
            console.error('Failed to load sets:', err);
            setsData = [];
        }
    }

    /**
     * 画面をレンダリング
     */
    async function render(container) {
        await loadSets();

        const html = `
      <div class="select-screen screen-enter">
        <h1>問題を選ぼう</h1>
        <p class="subtitle">セットを選んでクイズに挑戦！あなたの知識を試そう 🚀</p>
        <div class="set-grid" id="set-grid">
          ${setsData.length === 0
                ? '<p style="color: var(--text-muted); grid-column: 1/-1;">問題セットが見つかりませんでした。</p>'
                : setsData.map(renderSetCard).join('')
            }
        </div>
      </div>
    `;

        container.innerHTML = html;

        // カードクリックイベント
        container.querySelectorAll('.set-card').forEach((card) => {
            card.addEventListener('click', () => {
                const setId = card.dataset.setId;
                window.location.hash = `#/quiz/${setId}`;
            });
        });
    }

    function renderSetCard(set) {
        return `
      <div class="set-card" data-set-id="${set.id}" tabindex="0" role="button" aria-label="${set.title}を開始">
        <span class="set-card-icon">${set.icon || '📝'}</span>
        <div class="set-card-title">${escapeHtml(set.title)}</div>
        <div class="set-card-desc">${escapeHtml(set.description)}</div>
        <div class="set-card-meta">
          <span>📋 ${set.questionCount}問</span>
          <span>🏷️ v${set.version}</span>
        </div>
      </div>
    `;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return { render };
})();
