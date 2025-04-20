// 全局变量
const MAX_BALLS = 5;                // 最大游泳者数量固定为5个
const GRID_COLS = 4;                // 网格列数
const GRID_ROWS = 3;                // 网格行数
const MAX_LOGS = 20;                // 最大日志数量
const ALERT_THRESHOLD = 10000;      // 停留警报阈值（毫秒）
const LOG_INTERVAL = 5000;          // 日志更新间隔（毫秒）
const RANDOM_ALERT_PROB = 0.01;     // 随机变红概率
const BASE_SPEED_MIN = 0.3;         // 基础速度最小值
const BASE_SPEED_MAX = 0.6;         // 基础速度最大值
const SPEED_CHANGE_INTERVAL = 10000; // 速度变化间隔（10秒）

// 游泳者数组和日志数组
let balls = [];
let realtimeLogs = [];
let alertLogs = [];
let speedFactor = 1.5;              // 全局速度因子
let alertIdCounter = 0;             // 警报ID计数器

// DOM 元素
let coordinateSystem;
let realtimeLogsElement;
let alertLogsElement;
let ballCountElement;

// 列标识符
const colLabels = ['A', 'B', 'C', 'D'];

// 初始化坐标系统
function initCoordinateSystem() {
    coordinateSystem = document.getElementById('coordinate-system');
    if (!coordinateSystem) {
        console.error('坐标系统元素未找到');
        return;
    }

    coordinateSystem.innerHTML = '';
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // 添加网格标识 (如 A1, B2 等)
            const cellLabel = document.createElement('div');
            cellLabel.classList.add('cell-label');
            cellLabel.textContent = `${colLabels[col]}${GRID_ROWS - row}`;
            cell.appendChild(cellLabel);
            
            coordinateSystem.appendChild(cell);
        }
    }
}

// 初始化DOM元素引用
function initDomElements() {
    coordinateSystem = document.getElementById('coordinate-system');
    realtimeLogsElement = document.getElementById('realtime-logs');
    alertLogsElement = document.getElementById('alert-logs');
    
    if (!coordinateSystem || !realtimeLogsElement || !alertLogsElement) {
        console.error('无法找到必要的DOM元素');
        return false;
    }
    
    return true;
}

// 创建初始的5个游泳者
function createInitialBalls() {
    console.log('创建初始游泳者');
    // 清除现有的游泳者
    balls.forEach(ball => {
        if (ball.element && ball.element.parentNode) {
            ball.element.remove();
        }
    });
    balls = [];
    
    if (!coordinateSystem) {
        console.error('坐标系统未初始化');
        return;
    }
    
    const mapWidth = coordinateSystem.clientWidth;
    const mapHeight = coordinateSystem.clientHeight;
    
    console.log(`地图尺寸: ${mapWidth}x${mapHeight}`);
    
    // 将地图分成5个区域，每个区域放置一个游泳者
    // 这样可以保证游泳者之间有足够的距离
    const areas = [
        { xMin: 0, xMax: mapWidth/2, yMin: 0, yMax: mapHeight/2 },      // 左下
        { xMin: mapWidth/2, xMax: mapWidth, yMin: 0, yMax: mapHeight/2 },  // 右下
        { xMin: 0, xMax: mapWidth/2, yMin: mapHeight/2, yMax: mapHeight }, // 左上
        { xMin: mapWidth/2, xMax: mapWidth, yMin: mapHeight/2, yMax: mapHeight }, // 右上
        { xMin: mapWidth/4, xMax: 3*mapWidth/4, yMin: mapHeight/4, yMax: 3*mapHeight/4 } // 中间
    ];
    
    // 在每个区域创建一个游泳者
    for (let i = 0; i < Math.min(MAX_BALLS, areas.length); i++) {
        const area = areas[i];
        const margin = 30;
        
        // 在区域内生成随机位置，并考虑边距
        const x = area.xMin + margin + Math.random() * (area.xMax - area.xMin - 2*margin);
        const y = area.yMin + margin + Math.random() * (area.yMax - area.yMin - 2*margin);
        
        console.log(`为区域${i+1}创建游泳者，位置(${x.toFixed(2)}, ${y.toFixed(2)})`);
        
        // 创建游泳者元素
        const ballElement = document.createElement('div');
        ballElement.classList.add('ball');
        ballElement.id = `ball-${i+1}`;
        coordinateSystem.appendChild(ballElement);
        
        // 初始运动参数
        const angle = Math.random() * 2 * Math.PI;
        const speed = (Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN) + BASE_SPEED_MIN) * speedFactor;
        
        // 将游泳者信息存储到数组
        const ball = {
            id: i+1,
            element: ballElement,
            x,
            y,
            speed,
            angle,
            isMoving: true,
            lastMoveTime: Date.now(),
            lastStationaryTime: null,
            currentCell: { row: 0, col: 0 }, // 会在drawBall中更新
            cellStayTime: 0,
            isAlerted: false,
            alertId: null,
            lastSpeedChangeTime: Date.now()
        };
        
        // 立即绘制球
        drawBall(ball);
        
        balls.push(ball);
        addRealtimeLog(ball, '正常');
        
        // 开始移动
        startMovement(ball);
    }
    
    console.log(`创建了 ${balls.length} 个游泳者`);
}

// 计算当前所在的网格单元
function calculateCurrentCell(x, y, mapWidth, mapHeight) {
    // 网格单元格宽度和高度
    const cellWidth = mapWidth / GRID_COLS;
    const cellHeight = mapHeight / GRID_ROWS;
    
    // 计算列（X轴方向）
    // 确保col值在0到GRID_COLS-1之间
    const col = Math.max(0, Math.min(Math.floor(x / cellWidth), GRID_COLS - 1));
    
    // 计算行（Y轴方向）
    // 注意：由于bottom属性从底部计算，行号需要相应调整
    // 计算从底部开始的行号
    const rowFromBottom = Math.floor(y / cellHeight);
    // 确保rowFromBottom值在0到GRID_ROWS-1之间
    const safeRowFromBottom = Math.max(0, Math.min(rowFromBottom, GRID_ROWS - 1));
    // 行号对应到从上到下的索引（反转）
    const row = GRID_ROWS - 1 - safeRowFromBottom;
    
    console.log(`位置(${x.toFixed(2)}, ${y.toFixed(2)}) -> 单元格(${col}, ${row}) -> 标签${colLabels[col]}${GRID_ROWS - row}`);
    
    return { row, col };
}

// 获取当前单元格标识
function getCellLabel(row, col) {
    // 确保行列值在有效范围内
    const safeRow = Math.max(0, Math.min(row, GRID_ROWS - 1));
    const safeCol = Math.max(0, Math.min(col, GRID_COLS - 1));
    
    // 行号需要转换为显示值（从1开始）
    const rowNum = GRID_ROWS - safeRow;
    return `${colLabels[safeCol]}${rowNum}`;
}

// 在DOM中绘制游泳者
function drawBall(ball) {
    if (!ball || !ball.element || !coordinateSystem) return;
    
    const mapWidth = coordinateSystem.clientWidth;
    const mapHeight = coordinateSystem.clientHeight;
    
    // 确保游泳者在地图内
    ball.x = Math.max(15, Math.min(ball.x, mapWidth - 15));
    ball.y = Math.max(15, Math.min(ball.y, mapHeight - 15));
    
    // 更新游泳者元素位置
    ball.element.style.left = `${ball.x}px`;
    ball.element.style.bottom = `${ball.y}px`;
    
    // 重新计算并更新单元格位置
    ball.currentCell = calculateCurrentCell(ball.x, ball.y, mapWidth, mapHeight);
}

// 开始游泳者运动
function startMovement(ball) {
    // 如果游泳者处于警报状态，不再移动
    if (ball.isAlerted) {
        return;
    }
    
    // 随机决定运动时间
    const movementDuration = (Math.random() * 5 + 3) * 1000; // 3-8秒
    
    ball.isMoving = true;
    ball.lastMoveTime = Date.now();
    
    // 检查是否需要更新速度（每10秒）
    if (Date.now() - ball.lastSpeedChangeTime > SPEED_CHANGE_INTERVAL) {
        ball.speed = (Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN) + BASE_SPEED_MIN) * speedFactor;
        ball.lastSpeedChangeTime = Date.now();
    }
    
    // 移动动画
    const animate = () => {
        if (!ball.isMoving || ball.isAlerted) return;
        
        const currentTime = Date.now();
        const deltaTime = currentTime - ball.lastMoveTime;
        ball.lastMoveTime = currentTime;
        
        // 获取地图尺寸
        const mapWidth = coordinateSystem.clientWidth;
        const mapHeight = coordinateSystem.clientHeight;
        
        // 游泳者半径（用于更精确的边界检测）
        const ballRadius = 15;
        
        // 计算移动距离
        const distance = ball.speed * deltaTime / 1000;
        const dx = distance * Math.cos(ball.angle);
        const dy = distance * Math.sin(ball.angle);
        
        // 预先计算新位置
        let newX = ball.x + dx;
        let newY = ball.y + dy;
        
        // 严格边界检测和反弹
        // 左边界
        if (newX < ballRadius) {
            newX = ballRadius;
            ball.angle = Math.PI - ball.angle + (Math.random() * 0.2 - 0.1); // 微扰动角度避免卡在边缘
        } 
        // 右边界
        else if (newX > mapWidth - ballRadius) {
            newX = mapWidth - ballRadius;
            ball.angle = Math.PI - ball.angle + (Math.random() * 0.2 - 0.1);
        }
        
        // 下边界
        if (newY < ballRadius) {
            newY = ballRadius;
            ball.angle = -ball.angle + (Math.random() * 0.2 - 0.1);
        } 
        // 上边界
        else if (newY > mapHeight - ballRadius) {
            newY = mapHeight - ballRadius;
            ball.angle = -ball.angle + (Math.random() * 0.2 - 0.1);
        }
        
        // 更新位置
        ball.x = newX;
        ball.y = newY;
        
        // 随机微调角度，模拟游泳者的运动轨迹变化
        if (Math.random() < 0.05) { // 5%概率调整方向
            ball.angle += (Math.random() - 0.5) * 0.5; // 小幅度调整
        }
        
        // 确保游泳者始终在视图内
        ball.x = Math.max(ballRadius, Math.min(mapWidth - ballRadius, ball.x));
        ball.y = Math.max(ballRadius, Math.min(mapHeight - ballRadius, ball.y));
        
        // 更新DOM位置和单元格
        drawBall(ball);
        
        // 检查当前单元格
        const newCell = calculateCurrentCell(ball.x, ball.y, mapWidth, mapHeight);
        
        // 如果游泳者进入新的单元格
        if (newCell.row !== ball.currentCell.row || newCell.col !== ball.currentCell.col) {
            // 重置停留时间
            ball.cellStayTime = 0;
            ball.lastStationaryTime = currentTime;
            
            // 如果之前有警报，则重置警报状态
            if (ball.isAlerted) {
                ball.isAlerted = false;
                ball.element.classList.remove('alert');
            }
            
            ball.currentCell = newCell;
        } else {
            // 累计在当前单元格的停留时间
            if (ball.lastStationaryTime) {
                ball.cellStayTime = currentTime - ball.lastStationaryTime;
                
                // 检查是否需要触发警报
                if (!ball.isAlerted && (ball.cellStayTime > ALERT_THRESHOLD || Math.random() < RANDOM_ALERT_PROB)) {
                    ball.isAlerted = true;
                    ball.element.classList.add('alert');
                    addAlertLog(ball);
                    return; // 停止移动
                }
            }
        }
        
        // 如果仍在运动，继续动画
        if (ball.isMoving && !ball.isAlerted && currentTime - ball.lastMoveTime < movementDuration) {
            requestAnimationFrame(animate);
        } else if (!ball.isAlerted) {
            // 停止运动（如果不是因为警报）
            stopMovement(ball);
        }
    };
    
    // 开始动画
    requestAnimationFrame(animate);
}

// 停止游泳者运动
function stopMovement(ball) {
    // 如果游泳者已经处于警报状态，不再处理
    if (ball.isAlerted) {
        return;
    }
    
    ball.isMoving = false;
    ball.lastStationaryTime = Date.now();
    
    // 随机决定停止时间
    const stationaryDuration = Math.random() * 2000 + 1000; // 1-3秒
    
    // 停止一段时间后继续运动
    setTimeout(() => {
        // 如果游泳者处于警报状态，不再移动
        if (ball.isAlerted) {
            return;
        }
        
        // 随机改变方向
        ball.angle = Math.random() * 2 * Math.PI;
        startMovement(ball);
    }, stationaryDuration);
}

// 添加实时日志
function addRealtimeLog(ball, status) {
    if (!realtimeLogsElement) return;
    
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const cellLabel = getCellLabel(ball.currentCell.row, ball.currentCell.col);
    const logText = `[${timestamp}] - 游泳者${ball.id}：位置(X:${ball.x.toFixed(2)}, Y:${ball.y.toFixed(2)})，单元格：${cellLabel}，状态：${status}`;
    
    // 添加到数组
    realtimeLogs.unshift(logText);
    
    // 限制日志数量
    if (realtimeLogs.length > MAX_LOGS) {
        realtimeLogs.pop();
    }
    
    // 更新显示
    updateRealtimeLogs();
}

// 添加警报日志
function addAlertLog(ball) {
    if (!alertLogsElement) return;
    
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const cellLabel = getCellLabel(ball.currentCell.row, ball.currentCell.col);
    alertIdCounter++;
    const alertId = alertIdCounter;
    
    // 设置游泳者的警报ID
    ball.alertId = alertId;
    
    // 创建警报对象
    const alertObj = {
        id: alertId,
        ballId: ball.id,
        timestamp,
        position: {x: ball.x.toFixed(2), y: ball.y.toFixed(2)},
        cellLabel,
        text: `[${timestamp}] - 警报: 游泳者${ball.id}在位置(X:${ball.x.toFixed(2)}, Y:${ball.y.toFixed(2)})，单元格：${cellLabel}停留超过10秒`
    };
    
    // 添加到数组
    alertLogs.push(alertObj);
    
    // 更新显示
    updateAlertLogs();
}

// 更新实时日志显示
function updateRealtimeLogs() {
    if (!realtimeLogsElement) return;
    
    realtimeLogsElement.innerHTML = '';
    realtimeLogs.forEach(log => {
        const logItem = document.createElement('div');
        logItem.classList.add('log-item');
        logItem.textContent = log;
        realtimeLogsElement.appendChild(logItem);
    });
}

// 更新警报日志显示
function updateAlertLogs() {
    if (!alertLogsElement) return;
    
    alertLogsElement.innerHTML = '';
    alertLogs.forEach(alert => {
        const alertItem = document.createElement('div');
        alertItem.classList.add('alert-item');
        alertItem.dataset.alertId = alert.id;
        
        const alertText = document.createElement('div');
        alertText.textContent = alert.text;
        alertItem.appendChild(alertText);
        
        // 添加删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-alert');
        deleteBtn.textContent = '删除';
        deleteBtn.onclick = function() {
            removeAlert(alert.id);
        };
        alertItem.appendChild(deleteBtn);
        
        alertLogsElement.appendChild(alertItem);
    });
}

// 创建单个游泳者
function createBall(position) {
    // 检查是否已达到最大数量
    if (balls.length >= MAX_BALLS && !position) {
        console.log('已达到最大游泳者数量限制');
        return null;
    }
    
    // 确保坐标系统已初始化
    ensureCoordinateSystem();
    if (!coordinateSystem) {
        console.error('无法创建游泳者：坐标系统未初始化');
        return null;
    }
    
    const mapWidth = coordinateSystem.clientWidth;
    const mapHeight = coordinateSystem.clientHeight;
    
    // 确保地图尺寸有效
    if (mapWidth <= 60 || mapHeight <= 60) {
        console.error(`无法创建游泳者：地图尺寸无效 (${mapWidth}x${mapHeight})`);
        return null;
    }
    
    // 设置边距，避免游泳者太靠近边缘
    const margin = 30;
    
    let x, y;
    
    // 如果提供了指定位置，则使用该位置
    if (position) {
        x = position.x;
        y = position.y;
        // 确保位置在地图范围内
        x = Math.min(Math.max(x, margin), mapWidth - margin);
        y = Math.min(Math.max(y, margin), mapHeight - margin);
    } else {
        // 随机生成位置
        x = margin + Math.random() * (mapWidth - 2 * margin);
        y = margin + Math.random() * (mapHeight - 2 * margin);
    }
    
    // 创建游泳者DOM元素
    const ball = document.createElement('div');
    ball.className = 'ball';
    ball.id = 'ball-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    
    // 将游泳者添加到坐标系统
    coordinateSystem.appendChild(ball);
    
    // 随机速度和角度
    const speed = 1 + Math.random() * 2; // 1-3 之间的速度
    const angle = Math.random() * 2 * Math.PI; // 0-2π 之间的角度
    
    // 创建游泳者对象
    const ballObj = {
        id: ball.id,
        element: ball,
        x: x,
        y: y,
        speed: speed,
        angle: angle,
        isAlerted: false
    };
    
    // 立即绘制游泳者
    drawBall(ballObj);
    
    console.log(`创建游泳者: ID=${ball.id}, 位置=(${Math.round(x)}, ${Math.round(y)}), 速度=${speed.toFixed(1)}`);
    
    return ballObj;
}

// 移除单个警报
function removeAlert(alertId) {
    console.log(`移除警报 ${alertId}`);
    
    // 查找关联的游泳者
    const ball = balls.find(b => b.alertId === alertId);
    
    // 查找警报
    const alertIndex = alertLogs.findIndex(a => a.id === alertId);
    if (alertIndex > -1) {
        const alert = alertLogs[alertIndex];
        console.log(`找到警报: ${alert.text}`);
        
        // 从警报数组中移除
        alertLogs.splice(alertIndex, 1);
        
        // 如果找到了游泳者，移除它
        if (ball) {
            console.log(`移除游泳者 ${ball.id}`);
            
            // 记录位置以便创建新球
            const position = { x: ball.x, y: ball.y };
            
            // 从DOM中移除游泳者元素
            ball.element.remove();
            
            // 从数组中移除游泳者
            const ballIndex = balls.findIndex(b => b.id === ball.id);
            if (ballIndex > -1) {
                balls.splice(ballIndex, 1);
            }
            
            // 创建一个新的游泳者在相似位置
            const newBall = createBall(position);
            if (newBall) {
                balls.push(newBall);
                addRealtimeLog(newBall, '正常');
            }
        }
        
        // 更新警报显示
        updateAlertLogs();
    } else {
        console.warn(`未找到警报 ${alertId}`);
    }
}

// 更新游泳者数量显示
function updateBallCount() {
    // 由于我们移除了游泳者数量显示，此函数现在为空
}

// 设置定时器，每5秒更新所有游泳者的日志信息
function startLogUpdates() {
    setInterval(() => {
        balls.forEach(ball => {
            const status = ball.isAlerted ? '警报' : '正常';
            addRealtimeLog(ball, status);
        });
    }, LOG_INTERVAL);
}

// 初始化事件监听
function initEventListeners() {
    // 重置地图
    const resetMapButton = document.getElementById('reset-map');
    if (resetMapButton) {
        resetMapButton.addEventListener('click', () => {
            console.log('重置地图');
            balls.forEach(ball => {
                if (ball.element && ball.element.parentNode) {
                    ball.element.remove();
                }
            });
            balls = [];
            realtimeLogs = [];
            alertLogs = [];
            updateRealtimeLogs();
            updateAlertLogs();
            createInitialBalls(); // 创建5个初始游泳者
        });
    }
    
    // 清除所有警报
    const clearAlertsButton = document.getElementById('clear-alerts');
    if (clearAlertsButton) {
        clearAlertsButton.addEventListener('click', () => {
            console.log('清除所有警报');
            
            // 获取所有警报状态的游泳者的位置
            const alertedPositions = balls
                .filter(ball => ball.isAlerted)
                .map(ball => ({ x: ball.x, y: ball.y }));
            
            // 移除所有警报状态的游泳者
            balls.forEach((ball, index) => {
                if (ball.isAlerted) {
                    // 从DOM中移除
                    if (ball.element && ball.element.parentNode) {
                        ball.element.remove();
                    }
                    // 标记为删除
                    balls[index] = null;
                }
            });
            
            // 从数组中移除所有已标记为null的游泳者
            balls = balls.filter(ball => ball !== null);
            
            // 清空警报日志
            alertLogs = [];
            updateAlertLogs();
            
            // 为每个删除的位置创建一个新的游泳者
            let recreatedCount = 0;
            alertedPositions.forEach(position => {
                const newBall = createBall(position);
                if (newBall) {
                    balls.push(newBall);
                    // 启动新创建的游泳者的移动
                    const angle = Math.random() * 2 * Math.PI;
                    const speed = (Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN) + BASE_SPEED_MIN) * speedFactor;
                    
                    newBall.angle = angle;
                    newBall.speed = speed;
                    newBall.isMoving = true;
                    newBall.lastMoveTime = Date.now();
                    newBall.lastStationaryTime = null;
                    newBall.currentCell = calculateCurrentCell(newBall.x, newBall.y, coordinateSystem.clientWidth, coordinateSystem.clientHeight);
                    newBall.cellStayTime = 0;
                    newBall.isAlerted = false;
                    newBall.alertId = null;
                    newBall.lastSpeedChangeTime = Date.now();
                    
                    // 启动游泳者运动
                    startMovement(newBall);
                    
                    addRealtimeLog(newBall, '正常');
                    recreatedCount++;
                }
            });
            
            console.log(`清除警报后重新创建了 ${recreatedCount} 个游泳者`);
        });
    }
    
    // 监听窗口大小变化，更新游泳者位置
    window.addEventListener('resize', () => {
        if (!coordinateSystem) return;
        
        const mapWidth = coordinateSystem.clientWidth;
        const mapHeight = coordinateSystem.clientHeight;
        
        balls.forEach(ball => {
            // 确保所有游泳者在地图范围内
            ball.x = Math.min(Math.max(ball.x, 15), mapWidth - 15);
            ball.y = Math.min(Math.max(ball.y, 15), mapHeight - 15);
            
            // 更新DOM位置和单元格
            drawBall(ball);
        });
    });
}

// 确保坐标系统已初始化，必要时进行初始化
function ensureCoordinateSystem() {
    if (!coordinateSystem || !coordinateSystem.offsetWidth) {
        initCoordinateSystem();
        return false;
    }
    return true;
}

// 确保DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM已加载，开始初始化...');
    
    // 初始化DOM元素引用
    if (!initDomElements()) {
        console.error('初始化DOM元素失败');
        return;
    }
    
    // 初始化坐标系统
    initCoordinateSystem();
    
    // 初始化事件监听
    initEventListeners();
    
    // 确保坐标系统加载完成后再创建游泳者
    setTimeout(() => {
        if (!ensureCoordinateSystem()) {
            console.error('坐标系统初始化失败，延迟重试');
            setTimeout(() => {
                if (ensureCoordinateSystem()) {
                    createInitialBalls();
                    startLogUpdates();
                }
            }, 1000);
            return;
        }
        
        // 创建初始游泳者
        createInitialBalls();
        
        // 启动日志更新
        startLogUpdates();
        
        // 定期检查并更新所有游泳者的位置
        setInterval(() => {
            balls.forEach(drawBall);
        }, 2000);
    }, 500);
}); 