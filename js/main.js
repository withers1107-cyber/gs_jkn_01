const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    // ゲーム設定
    const LANES = 4;
    const LANE_WIDTH = 100;
    const JUDGE_LINE_Y = 100;
    const NOTE_SPEED = 4;
    
    // 判定ウインドウの設定 (PERFECT: 25px以内, GOOD: 50px以内)
    const HIT_PERFECT = 25;
    const HIT_GOOD = 50;

    let score = 0;
    let combo = 0;
    let effects = [];
    let notes = [];
    
    // 譜面の自動生成用タイマー
    let spawnTimer = 0;

    const laneColors = ["#ff7675", "#74b9ff", "#55efc4", "#ffeaa7"];
    const keyMap = { "ArrowLeft": 0, "ArrowDown": 1, "ArrowUp": 2, "ArrowRight": 3 };

    // 猫の形を描画する関数
    function drawCat(ctx, x, y, size, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - size * 0.8, y - size * 0.2);
        ctx.lineTo(x - size * 0.9, y - size * 0.9);
        ctx.lineTo(x - size * 0.3, y - size * 0.5);
        ctx.lineTo(x + size * 0.3, y - size * 0.5);
        ctx.lineTo(x + size * 0.9, y - size * 0.9);
        ctx.lineTo(x + size * 0.8, y - size * 0.2);
        ctx.bezierCurveTo(x + size * 0.9, y + size * 0.6, x - size * 0.9, y + size * 0.6, x - size * 0.8, y - size * 0.2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - size * 0.5, y + size * 0.1); ctx.lineTo(x - size * 1.1, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - size * 0.5, y + size * 0.2); ctx.lineTo(x - size * 1.2, y + size * 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + size * 0.5, y + size * 0.1); ctx.lineTo(x + size * 1.1, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + size * 0.5, y + size * 0.2); ctx.lineTo(x + size * 1.2, y + size * 0.2); ctx.stroke();
        ctx.restore();
    }

    // 肉球を描画する関数
    function drawPaw(ctx, x, y, size, color, alpha = 1) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y + size * 0.2, size * 0.7, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        const toePositions = [
            { dx: -0.6, dy: -0.3, rx: 0.25, ry: 0.35, rot: -0.2 },
            { dx: -0.2, dy: -0.6, rx: 0.25, ry: 0.4, rot: -0.05 },
            { dx: 0.2, dy: -0.6, rx: 0.25, ry: 0.4, rot: 0.05 },
            { dx: 0.6, dy: -0.3, rx: 0.25, ry: 0.35, rot: 0.2 }
        ];
        toePositions.forEach(toe => {
            ctx.beginPath();
            ctx.ellipse(x + size * toe.dx, y + size * toe.dy, size * toe.rx, size * toe.ry, toe.rot, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    // エフェクト生成関数（判定文字列を動的に変更可能に）
    function createHitEffect(laneX, color, ratingText, shadowColor) {
        effects.push({
            type: 'text',
            text: ratingText,
            x: laneX,
            y: JUDGE_LINE_Y - 40,
            color: shadowColor,
            life: 30,
            maxLife: 30
        });

        // PERFECTの時だけ肉球パーティクルを多めに出す
        const count = ratingText.includes('PERFECT') ? 6 : 2;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 2;
            effects.push({
                type: 'particle',
                x: laneX,
                y: JUDGE_LINE_Y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 6 + 6,
                color: color,
                life: 20,
                maxLife: 20
            });
        }
    }

    // ゲームループ
    function gameLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- 譜面の無限自動生成ロジック ---
        spawnTimer++;
        if (spawnTimer > 45) { // 約0.75秒ごとにランダムでノーツを生成
            const randomLane = Math.floor(Math.random() * LANES);
            notes.push({ lane: randomLane, y: 620 });
            spawnTimer = 0;
        }

        // 1. 判定ラインの描画
        for (let i = 0; i < LANES; i++) {
            ctx.strokeStyle = "#444";
            ctx.lineWidth = 3;
            ctx.strokeRect(i * LANE_WIDTH + 10, JUDGE_LINE_Y - 30, LANE_WIDTH - 20, 60);
            drawCat(ctx, i * LANE_WIDTH + LANE_WIDTH / 2, JUDGE_LINE_Y, 25, "#333");
            ctx.fillStyle = "#888";
            ctx.font = "bold 16px sans-serif";
            ctx.fillText(["←","↓","↑","→"][i], i * LANE_WIDTH + 43, JUDGE_LINE_Y + 45);
        }

        // 2. 猫ノーツの移動と描画
        for (let i = notes.length - 1; i >= 0; i--) {
            let note = notes[i];
            note.y -= NOTE_SPEED;
            let catX = note.lane * LANE_WIDTH + LANE_WIDTH / 2;
            drawCat(ctx, catX, note.y, 30, laneColors[note.lane]);

            // 判定ラインを通り過ぎて見えなくなったらMISS（コンボリセット）
            if (note.y < JUDGE_LINE_Y - 40) {
                createHitEffect(catX, "#ff4757", "MISS 🐾", "#ff4757");
                notes.splice(i, 1);
                combo = 0;
                updateUI();
            }
        }

        // 3. エフェクトの更新と描画
        for (let i = effects.length - 1; i >= 0; i--) {
            let fx = effects[i];
            fx.life--;
            let alpha = fx.life / fx.maxLife;

            if (fx.type === 'text') {
                fx.y -= 0.5;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = "#fff";
                ctx.font = "bold 18px sans-serif";
                ctx.shadowBlur = 10;
                ctx.shadowColor = fx.color;
                ctx.textAlign = "center";
                ctx.fillText(fx.text, fx.x, fx.y);
                ctx.restore();
            } else if (fx.type === 'particle') {
                fx.x += fx.vx;
                fx.y += fx.vy;
                drawPaw(ctx, fx.x, fx.y, fx.size, fx.color, alpha);
            }

            if (fx.life <= 0) {
                effects.splice(i, 1);
            }
        }

        requestAnimationFrame(gameLoop);
    }

    // 4. キー入力とタイミング判定の拡張
    window.addEventListener("keydown", (e) => {
        const lane = keyMap[e.key];
        if (lane === undefined) return;

        for (let i = 0; i < notes.length; i++) {
            let note = notes[i];
            if (note.lane === lane) {
                let distance = Math.abs(note.y - JUDGE_LINE_Y);
                let laneX = note.lane * LANE_WIDTH + LANE_WIDTH / 2;

                // 多段階判定ロジック
                if (distance < HIT_PERFECT) {
                    // PERFECT判定
                    score += 100 + (combo * 10);
                    combo++;
                    createHitEffect(laneX, laneColors[note.lane], "PERFECT", "#fff");
                    notes.splice(i, 1);
                    updateUI();
                    break;
                } else if (distance < HIT_GOOD) {
                    // GOOD判定
                    score += 50 + Math.floor(combo * 5);
                    combo++;
                    createHitEffect(laneX, laneColors[note.lane], "GOOD", "#ffeaa7");
                    notes.splice(i, 1);
                    updateUI();
                    break;
                }
            }
        }
    });

    function updateUI() {
        document.getElementById("score").innerText = score;
        document.getElementById("combo").innerText = combo;
    }

    gameLoop();