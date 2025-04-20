// 全局变量
const MAX_BALLS = 10;               // 最大小球数量
const GRID_COLS = 2;                // 网格列数
const GRID_ROWS = 4;                // 网格行数
const MAX_LOGS = 20;                // 最大日志数量
const ALERT_THRESHOLD = 10000;      // 停留警报阈值（毫秒）
const LOG_INTERVAL = 5000;          // 日志更新间隔（毫秒）

// 球体数组和日志数组
let balls = [];
let realtimeLogs = [];
let alertLogs = [];
let speedFactor = 1.5;              // 全局速度因子

// DOM 元素
const coordinateSystem = document.getElementById('coordinate-system');
const realtimeLogsElement = document.getElementById('realtime-logs');
const alertLogsElement = document.getElementById('alert-logs');
const ballCountElement = document.getElementById('ball-count');
const speedValueElement = document.getElementById('speed-value');

// 初始化坐标系统
function initCoordinateSystem() {
    coordinateSystem.innerHTML = '';
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            coordinateSystem.appendChild(cell);
        }
    }
}

// 创建一个新的小球
function createBall() {
    if (balls.length >= MAX_BALLS) {
        alert('已达到最大小球数量限制（10个）');
        return;
    }

    const id = balls.length + 1;
    const mapWidth = coordinateSystem.clientWidth;
    const mapHeight = coordinateSystem.clientHeight;
    
    // 随机位置（坐标系以左下角为原点）
    const x = Math.random() * mapWidth;
    const y = Math.random() * mapHeight;
    
    // 创建小球元素
    const ballElement = document.createElement('div');
    ballElement.classList.add('ball');
    ballElement.id = `ball-${id}`;
    ballElement.style.left = `${x}px`;
    ballElement.style.bottom = `${y}px`; // 注意是bottom而非top，因为坐标系原点在左下角
    
    // 添加小球到DOM
    coordinateSystem.appendChild(ballElement);
    
    // 初始运动参数
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 0.2 + 0.1) * speedFactor; // 0.1-0.3 单位/秒
    
    // 将小球信息存储到数组
    const ball = {
        id,
        element: ballElement,
        x,
        y,
        speed,
        angle,
        isMoving: true,
        lastMoveTime: Date.now(),
        lastStationaryTime: null,
        currentCell: calculateCurrentCell(x, y, mapWidth, mapHeight),
        cellStayTime: 0,
        isAlerted: false
    };
    
    balls.push(ball);
    updateBallCount();
    addRealtimeLog(ball, '正常');
    
    // 开始移动
    startMovement(ball);
}

// 计算当前所在的网格单元
function calculateCurrentCell(x, y, mapWidth, mapHeight) {
    const col = Math.min(Math.floor(x / (mapWidth / GRID_COLS)), GRID_COLS - 1);
    const row = Math.min(Math.floor(y / (mapHeight / GRID_ROWS)), GRID_ROWS - 1);
    return { row, col };
}

// 开始小球运动
function startMovement(ball) {
    // 随机决定运动时间
    const movementDuration = (Math.random() * 5 + 3) * 1000; // 3-8秒
    
    ball.isMoving = true;
    ball.lastMoveTime = Date.now();
    
    // 移动动画
    const animate = () => {
        if (!ball.isMoving) return;
        
        const currentTime = Date.now();
        const deltaTime = currentTime - ball.lastMoveTime;
        ball.lastMoveTime = currentTime;
        
        // 获取地图尺寸
        const mapWidth = coordinateSystem.clientWidth;
        const mapHeight = coordinateSystem.clientHeight;
        
        // 计算移动距离
        const distance = ball.speed * deltaTime / 1000;
        const dx = distance * Math.cos(ball.angle);
        const dy = distance * Math.sin(ball.angle);
        
        // 更新位置
        ball.x += dx;
        ball.y += dy;
        
        // 边界检测和反弹
        if (ball.x < 0) {
            ball.x = 0;
            ball.angle = Math.PI - ball.angle;
        } else if (ball.x > mapWidth) {
            ball.x = mapWidth;
            ball.angle = Math.PI - ball.angle;
        }
        
        if (ball.y < 0) {
            ball.y = 0;
            ball.angle = -ball.angle;
        } else if (ball.y > mapHeight) {
            ball.y = mapHeight;
            ball.angle = -ball.angle;
        }
        
        // 随机微调角度，模拟游泳者的运动轨迹变化
        if (Math.random() < 0.05) { // 5%概率调整方向
            ball.angle += (Math.random() - 0.5) * 0.5; // 小幅度调整
        }
        
        // 更新DOM位置
        ball.element.style.left = `${ball.x}px`;
        ball.element.style.bottom = `${ball.y}px`;
        
        // 检查当前单元格
        const newCell = calculateCurrentCell(ball.x, ball.y, mapWidth, mapHeight);
        
        // 如果小球进入新的单元格
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
                if (!ball.isAlerted && ball.cellStayTime > ALERT_THRESHOLD) {
                    ball.isAlerted = true;
                    ball.element.classList.add('alert');
                    addAlertLog(ball);
                }
            }
        }
        
        // 如果仍在运动，继续动画
        if (ball.isMoving && currentTime - ball.lastMoveTime < movementDuration) {
            requestAnimationFrame(animate);
        } else {
            // 停止运动
            stopMovement(ball);
        }
    };
    
    // 开始动画
    requestAnimationFrame(animate);
}

// 停止小球运动
function stopMovement(ball) {
    ball.isMoving = false;
    ball.lastStationaryTime = Date.now();
    
    // 随机决定停止时间
    const stationaryDuration = Math.random() * 2000 + 1000; // 1-3秒
    
    // 停止一段时间后继续运动
    setTimeout(() => {
        // 随机改变方向
        ball.angle = Math.random() * 2 * Math.PI;
        startMovement(ball);
    }, stationaryDuration);
}

// 添加实时日志
function addRealtimeLog(ball, status) {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const logText = `[${timestamp}] - 小球${ball.id}：位置(X:${ball.x.toFixed(2)}, Y:${ball.y.toFixed(2)})，状态：${status}`;
    
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
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const logText = `[${timestamp}] - 警报：小球${ball.id}在位置(X:${ball.x.toFixed(2)}, Y:${ball.y.toFixed(2)})停留超过10秒`;
    
    // 添加到数组
    alertLogs.push(logText);
    
    // 更新显示
    updateAlertLogs();
}

// 更新实时日志显示
function updateRealtimeLogs() {
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
    alertLogsElement.innerHTML = '';
    alertLogs.forEach(log => {
        const logItem = document.createElement('div');
        logItem.classList.add('alert-item');
        logItem.textContent = log;
        alertLogsElement.appendChild(logItem);
    });
}

// 更新小球数量显示
function updateBallCount() {
    ballCountElement.textContent = balls.length;
}

// 设置定时器，每5秒更新所有小球的日志信息
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
    // 增加小球
    document.getElementById('increase-ball').addEventListener('click', createBall);
    
    // 减少小球
    document.getElementById('decrease-ball').addEventListener('click', () => {
        if (balls.length > 0) {
            const ball = balls.pop();
            ball.element.remove();
            updateBallCount();
        }
    });
    
    // 重置地图
    document.getElementById('reset-map').addEventListener('click', () => {
        balls.forEach(ball => ball.element.remove());
        balls = [];
        realtimeLogs = [];
        alertLogs = [];
        updateRealtimeLogs();
        updateAlertLogs();
        updateBallCount();
        createBall(); // 创建一个初始小球
    });
    
    // 清除警报
    document.getElementById('clear-alerts').addEventListener('click', () => {
        alertLogs = [];
        updateAlertLogs();
    });
    
    // 速度控制
    document.getElementById('speed-control').addEventListener('input', (e) => {
        speedFactor = parseFloat(e.target.value);
        speedValueElement.textContent = speedFactor.toFixed(1);
        
        // 更新所有小球的速度
        balls.forEach(ball => {
            ball.speed = (Math.random() * 0.2 + 0.1) * speedFactor;
        });
    });
    
    // 监听窗口大小变化，更新小球位置
    window.addEventListener('resize', () => {
        const mapWidth = coordinateSystem.clientWidth;
        const mapHeight = coordinateSystem.clientHeight;
        
        balls.forEach(ball => {
            // 确保所有小球在地图范围内
            ball.x = Math.min(ball.x, mapWidth);
            ball.y = Math.min(ball.y, mapHeight);
            
            ball.element.style.left = `${ball.x}px`;
            ball.element.style.bottom = `${ball.y}px`;
            
            // 更新当前单元格信息
            ball.currentCell = calculateCurrentCell(ball.x, ball.y, mapWidth, mapHeight);
        });
    });
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    initCoordinateSystem();
    initEventListeners();
    createBall(); // 创建一个初始小球
    startLogUpdates();
}); 