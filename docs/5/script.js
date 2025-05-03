document.addEventListener('DOMContentLoaded', function() {
    // キャンバスの設定
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    // キャンバスのサイズをコンテナに合わせる
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 描画状態の変数
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'brush';
    let currentColor = '#000000';
    let currentSize = 5;
    let startX, startY; // 図形描画用の開始位置
    
    // 描画履歴
    let drawHistory = [];
    let historyIndex = -1;
    
    // 初期状態を保存
    saveState();
    
    // ツール選択
    const tools = document.querySelectorAll('.tool-group button');
    tools.forEach(tool => {
        tool.addEventListener('click', function() {
            tools.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentTool = this.id;
        });
    });
    
    // 色選択
    const colorPicker = document.getElementById('colorPicker');
    colorPicker.addEventListener('input', function() {
        currentColor = this.value;
    });
    
    // サイズ選択
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeValue = document.getElementById('sizeValue');
    sizeSlider.addEventListener('input', function() {
        currentSize = this.value;
        sizeValue.textContent = currentSize + 'px';
    });
    
    // 全消去ボタン
    document.getElementById('clear').addEventListener('click', function() {
        if (confirm('キャンバスをクリアしますか？')) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            saveState();
        }
    });
    
    // 保存ボタン
    document.getElementById('save').addEventListener('click', function() {
        const link = document.createElement('a');
        link.download = 'my-drawing.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
    
    // マウスイベント
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // タッチイベント（モバイル対応）
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
    
    function handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent(
            e.type === 'touchstart' ? 'mousedown' : 'mousemove', 
            {
                clientX: touch.clientX,
                clientY: touch.clientY
            }
        );
        canvas.dispatchEvent(mouseEvent);
    }
    
    function startDrawing(e) {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
        [startX, startY] = [e.offsetX, e.offsetY]; // 図形の開始位置を記録
        
        // 塗りつぶしツールの場合
        if (currentTool === 'fill') {
            floodFill(lastX, lastY, currentColor);
            saveState();
            isDrawing = false;
            return;
        }
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const x = e.offsetX;
        const y = e.offsetY;
        
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // ブラシまたは消しゴムの場合
        if (currentTool === 'brush' || currentTool === 'eraser') {
            ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentSize;
            
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            [lastX, lastY] = [x, y];
        }
        // プレビュー表示（図形ツール）
        else if (['rectangle', 'circle', 'line'].includes(currentTool)) {
            // 前回の描画をクリア（最後に保存した状態に戻す）
            const lastState = drawHistory[historyIndex];
            if (lastState) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(lastState, 0, 0);
            }
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentSize;
            ctx.fillStyle = currentColor;
            
            if (currentTool === 'rectangle') {
                drawRectangle(startX, startY, x, y);
            } else if (currentTool === 'circle') {
                drawCircle(startX, startY, x, y);
            } else if (currentTool === 'line') {
                drawLine(startX, startY, x, y);
            }
        }
    }
    
    function stopDrawing() {
        if (isDrawing && ['rectangle', 'circle', 'line'].includes(currentTool)) {
            saveState();
        }
        isDrawing = false;
    }
    
    // 矩形を描画
    function drawRectangle(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
        ctx.stroke();
    }
    
    // 円を描画
    function drawCircle(x1, y1, x2, y2) {
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        ctx.beginPath();
        ctx.arc(x1, y1, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // 直線を描画
    function drawLine(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    
    // 塗りつぶし機能
    function floodFill(x, y, fillColor) {
        // 塗りつぶし開始位置の色を取得
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // クリックした位置のピクセルインデックスを計算
        const targetX = Math.floor(x);
        const targetY = Math.floor(y);
        const targetIndex = (targetY * canvas.width + targetX) * 4;
        
        // 開始位置の色
        const targetR = data[targetIndex];
        const targetG = data[targetIndex + 1];
        const targetB = data[targetIndex + 2];
        const targetA = data[targetIndex + 3];
        
        // 塗りつぶす色をRGBA形式に変換
        const fillColorObj = hexToRgb(fillColor);
        const fillR = fillColorObj.r;
        const fillG = fillColorObj.g;
        const fillB = fillColorObj.b;
        const fillA = 255; // 不透明度は最大
        
        // 同じ色なら何もしない
        if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) {
            return;
        }
        
        // 塗りつぶし処理（シンプルな実装）
        const stack = [{x: targetX, y: targetY}];
        const visited = new Set();
        
        while (stack.length > 0) {
            const current = stack.pop();
            const cx = current.x;
            const cy = current.y;
            
            // 範囲外チェック
            if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) {
                continue;
            }
            
            // 既に訪問済みならスキップ
            const key = `${cx},${cy}`;
            if (visited.has(key)) {
                continue;
            }
            
            // 現在位置のピクセルインデックス
            const index = (cy * canvas.width + cx) * 4;
            
            // 色が一致するかチェック
            if (
                Math.abs(data[index] - targetR) <= 10 &&
                Math.abs(data[index + 1] - targetG) <= 10 &&
                Math.abs(data[index + 2] - targetB) <= 10 &&
                Math.abs(data[index + 3] - targetA) <= 10
            ) {
                // 色を塗りつぶす
                data[index] = fillR;
                data[index + 1] = fillG;
                data[index + 2] = fillB;
                data[index + 3] = fillA;
                
                // 訪問済みとしてマーク
                visited.add(key);
                
                // 隣接ピクセルをスタックに追加
                stack.push({x: cx + 1, y: cy});
                stack.push({x: cx - 1, y: cy});
                stack.push({x: cx, y: cy + 1});
                stack.push({x: cx, y: cy - 1});
            }
        }
        
        // 更新された画像データをキャンバスに描画
        ctx.putImageData(imageData, 0, 0);
    }
    
    // 16進数カラーコードをRGBに変換
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 0, g: 0, b: 0};
    }
    
    // 現在の状態を保存
    function saveState() {
        // 履歴の最大数を制限（メモリ使用量を抑えるため）
        const maxHistory = 10;
        
        // 新しい状態を追加する前に、現在の状態より先の履歴を削除
        if (historyIndex < drawHistory.length - 1) {
            drawHistory = drawHistory.slice(0, historyIndex + 1);
        }
        
        // 新しい状態を保存
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
        
        drawHistory.push(tempCanvas);
        historyIndex++;
        
        // 履歴が最大数を超えたら古いものを削除
        if (drawHistory.length > maxHistory) {
            drawHistory.shift();
            historyIndex--;
        }
    }
});
