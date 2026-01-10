class GameState {
    constructor() {
        this.board = [];
        this.size = 3;
        this.mode = 1;
        this.difficulty = 1;
        this.movesCount = 0;
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.aiPlayer = 'O';
        this.startTime = 0;
    }

    init() {
        this.board = Array(this.size * this.size).fill(' ');
        this.movesCount = 0;
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.startTime = Date.now();
    }

    playMove(index, player) {
        if (this.board[index] !== ' ' || this.gameOver) return false;
        this.board[index] = player;
        this.movesCount++;
        return true;
    }

    undoMove(index) {
        if (this.board[index] === ' ') return;
        this.board[index] = ' ';
        this.movesCount--;
    }
}

const game = new GameState();

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        menu: document.getElementById('menu'),
        game: document.getElementById('game'),
        gameOver: document.getElementById('game-over'),
        status: document.getElementById('status-text'),
        timer: document.getElementById('timer'),
        boardContainer: document.getElementById('board-container'),
        mode: document.getElementById('mode'),
        size: document.getElementById('size'),
        difficulty: document.getElementById('difficulty'),
        difficultySection: document.getElementById('difficulty-section'),
        start: document.getElementById('start'),
        newGame: document.getElementById('new-game'),
        playAgain: document.getElementById('play-again'),
        gameOverText: document.getElementById('game-over-text')
    };

    let timerInterval = null;

    elements.mode.addEventListener('change', () => toggleDifficulty(elements));
    elements.start.addEventListener('click', () => startGame(elements));
    elements.newGame.addEventListener('click', () => startGame(elements));
    elements.playAgain.addEventListener('click', () => resetToMenu(elements));

    function toggleDifficulty(elements) {
        elements.difficultySection.style.display = elements.mode.value === '1' ? 'block' : 'none';
    }

    function startGame(elements) {
        game.mode = parseInt(elements.mode.value);
        game.size = parseInt(elements.size.value);
        if (game.mode === 1) game.difficulty = parseInt(elements.difficulty.value);
        
        game.init();
        elements.menu.classList.add('hidden');
        elements.game.classList.remove('hidden');
        renderBoard();
        updateStatus();
        
        // Timer management
        if (timerInterval) clearInterval(timerInterval);
        if (game.mode === 1 && game.difficulty === 4) {
            elements.timer.classList.remove('hidden');
            timerInterval = setInterval(updateTimer, 1000);
        } else {
            elements.timer.classList.add('hidden');
        }
    }

    function resetToMenu(elements) {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        elements.gameOver.classList.add('hidden');
        elements.menu.classList.remove('hidden');
    }

    function renderBoard() {
        elements.boardContainer.innerHTML = '<div id="board-instructions">Click numbered cells (1-9 or 1-16)</div>';
        const boardEl = document.createElement('div');
        boardEl.id = 'board';
        boardEl.className = `size-${game.size}`;
        
        for (let i = 0; i < game.size * game.size; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.dataset.loc = i + 1;
            cell.textContent = game.board[i] === ' ' ? (i + 1) : game.board[i];
            cell.addEventListener('click', (e) => onCellClick(e));
            boardEl.appendChild(cell);
        }
        elements.boardContainer.appendChild(boardEl);
    }

    function onCellClick(e) {
        if (game.gameOver || (game.mode === 1 && game.currentPlayer === game.aiPlayer)) return;
        
        const index = parseInt(e.target.dataset.index);
        if (game.playMove(index, game.currentPlayer)) {
            updateCell(e.target, game.currentPlayer);
            
            if (checkGameEnd(game.currentPlayer)) return;
            
            game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
            updateStatus();
            
            if (game.mode === 1 && game.currentPlayer === game.aiPlayer) {
                setTimeout(aiTurn, 600);
            }
        }
    }

    function updateCell(cell, player) {
        cell.textContent = player;
        cell.className = `cell ${player}`;
        delete cell.dataset.loc;
    }

    function updateStatus() {
        if (game.gameOver) return;
        if (game.mode === 1 && game.currentPlayer === game.aiPlayer) {
            elements.status.textContent = '🤖 AI turn';
        } else {
            elements.status.textContent = `Player ${game.currentPlayer} turn`;
        }
    }

    // 🔥 FIXED AI - Works perfectly for 3x3 AND 4x4
    async function aiTurn() {
        if (game.gameOver) return;
        
        elements.status.textContent = '🤖 AI thinking...';
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const bestMove = getBestMove();
        if (bestMove >= 0 && game.playMove(bestMove, game.aiPlayer)) {
            const cell = document.querySelector(`[data-index="${bestMove}"]`);
            if (cell) updateCell(cell, game.aiPlayer);
            checkGameEnd(game.aiPlayer);
        }
        
        if (!game.gameOver) {
            game.currentPlayer = 'X';
            updateStatus();
        }
    }

    function getBestMove() {
        const empties = getEmptyCells();
        if (empties.length === 0) return -1;

        // 1. WIN IMMEDIATELY (4 in a row for 4x4, 3 for 3x3)
        for (let move of empties) {
            game.playMove(move, game.aiPlayer);
            if (checkWin(game.aiPlayer)) {
                game.undoMove(move);
                return move;
            }
            game.undoMove(move);
        }
        
        // 2. BLOCK PLAYER WIN
        for (let move of empties) {
            game.playMove(move, 'X');
            if (checkWin('X')) {
                game.undoMove(move);
                return move;
            }
            game.undoMove(move);
        }
        
        // 3. SMART AI BASED ON DIFFICULTY
        if (game.difficulty >= 3) {
            // Hard/Advanced: Minimax with depth limit
            let bestScore = -Infinity;
            let bestMove = empties[0];
            
            for (let move of empties) {
                game.playMove(move, game.aiPlayer);
                const score = minimax(game, 0, false, game.aiPlayer, 'X');
                game.undoMove(move);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
            return bestMove;
        }
        
        // 4. Easy/Medium: Center > Corner > Random
        const center = Math.floor((game.size * game.size) / 2);
        if (game.board[center] === ' ') return center;
        
        for (let move of empties) {
            if (move === 0 || move === game.size-1 || move === game.size*(game.size-1) || move === game.size*game.size-1) {
                return move;
            }
        }
        
        return empties[Math.floor(Math.random() * empties.length)];
    }

    // FIXED MINIMAX - Works for both 3x3 and 4x4
    function minimax(state, depth, isMaximizing, aiPlayer, humanPlayer) {
        if (checkWin(aiPlayer)) return 100 - depth;
        if (checkWin(humanPlayer)) return depth - 100;
        if (getEmptyCells().length === 0) return 0;
        
        // Depth limit for 4x4 performance
        const maxDepth = state.size === 3 ? 9 : 4;
        if (depth >= maxDepth) return evaluateBoard(state, aiPlayer);
        
        const empties = getEmptyCells();
        
        if (isMaximizing) {
            let best = -Infinity;
            for (let i of empties) {
                state.playMove(i, aiPlayer);
                best = Math.max(best, minimax(state, depth + 1, false, aiPlayer, humanPlayer));
                state.undoMove(i);
            }
            return best;
        } else {
            let best = Infinity;
            for (let i of empties) {
                state.playMove(i, humanPlayer);
                best = Math.min(best, minimax(state, depth + 1, true, aiPlayer, humanPlayer));
                state.undoMove(i);
            }
            return best;
        }
    }

    function evaluateBoard(state, aiPlayer) {
        const humanPlayer = 'X';
        let score = 0;
        const lines = getWinLines(state.size);
        
        for (let line of lines) {
            let aiCount = 0, humanCount = 0;
            for (let pos of line) {
                if (state.board[pos] === aiPlayer) aiCount++;
                else if (state.board[pos] === humanPlayer) humanCount++;
            }
            
            // AI advantage
            if (aiCount > 0 && humanCount === 0) {
                score += aiCount * 10;
            }
            // Human threat
            if (humanCount > 0 && aiCount === 0) {
                score -= humanCount * 10;
            }
        }
        return score;
    }

    function getEmptyCells() {
        const empties = [];
        for (let i = 0; i < game.size * game.size; i++) {
            if (game.board[i] === ' ') empties.push(i);
        }
        return empties;
    }

    function checkWin(player) {
        const lines = getWinLines(game.size);
        for (let line of lines) {
            let win = true;
            for (let pos of line) {
                if (game.board[pos] !== player) {
                    win = false;
                    break;
                }
            }
            if (win) {
                highlightWin(line);
                return true;
            }
        }
        return false;
    }

    // FIXED: Proper win lines for 3x3 AND 4x4
    function getWinLines(size) {
        const lines = [];
        
        // Rows
        for (let r = 0; r < size; r++) {
            const row = [];
            for (let c = 0; c < size; c++) {
                row.push(r * size + c);
            }
            lines.push(row);
        }
        
        // Columns
        for (let c = 0; c < size; c++) {
            const col = [];
            for (let r = 0; r < size; r++) {
                col.push(r * size + c);
            }
            lines.push(col);
        }
        
        // Diagonals
        const diag1 = [];
        const diag2 = [];
        for (let i = 0; i < size; i++) {
            diag1.push(i * size + i);
            diag2.push(i * size + (size - 1 - i));
        }
        lines.push(diag1);
        lines.push(diag2);
        
        return lines;
    }

    function highlightWin(line) {
        line.forEach(idx => {
            const cell = document.querySelector(`[data-index="${idx}"]`);
            if (cell) cell.classList.add('win');
        });
    }

    function checkGameEnd(player) {
        if (checkWin(player)) {
            game.gameOver = true;
            const message = player === 'X' ? 'YOU WIN! 🎉' : 'AI WINS! 🤖';
            elements.status.textContent = message;
            setTimeout(() => {
                elements.gameOverText.textContent = message;
                elements.game.classList.add('hidden');
                elements.gameOver.classList.remove('hidden');
            }, 1500);
            return true;
        }
        
        if (game.movesCount === game.size * game.size) {
            game.gameOver = true;
            elements.status.textContent = 'DRAW! 🤝';
            setTimeout(() => {
                elements.gameOverText.textContent = 'DRAW!';
                elements.game.classList.add('hidden');
                elements.gameOver.classList.remove('hidden');
            }, 1500);
            return true;
        }
        return false;
    }

    function updateTimer() {
        if (game.difficulty !== 4) return;
        const elapsed = (Date.now() - game.startTime) / 1000;
        const remaining = Math.max(0, 90 - elapsed);
        elements.timer.textContent = `⏰ Time: ${Math.ceil(remaining)}s`;
        
        if (remaining <= 0) {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            game.gameOver = true;
            elements.status.textContent = 'TIME UP! AI Wins!';
            setTimeout(() => {
                elements.gameOverText.textContent = 'TIME UP! AI Wins!';
                elements.game.classList.add('hidden');
                elements.gameOver.classList.remove('hidden');
            }, 1000);
        }
    }

    toggleDifficulty(elements);
});
