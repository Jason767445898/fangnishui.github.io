// 常量定义
const MAP_COLS = 4;  // A-D
const MAP_ROWS = 3;  // 1-3
const UPDATE_INTERVAL = 5000;  // 5秒更新一次
const MIN_DIRECTION_TIME = 15000;  // 最小方向保持时间15秒
const MAX_LOGS = 20;  // 最大日志数量

// 游泳者类
class Swimmer {
    constructor(id, mapContainer) {
        this.id = id;
        this.status = 'normal';
        this.mapContainer = mapContainer;
        this.element = this.createSwimmerElement();
        this.lastDirectionChange = Date.now();
        this.currentDirection = this.getRandomDirection();
        this.speed = 5; // 每秒移动的像素数
        this.resetPosition();
    }

    // 创建游泳者DOM元素
    createSwimmerElement() {
        const element = document.createElement('div');
        element.className = 'swimmer normal';
        element.id = `swimmer-${this.id}`;
        element.style.position = 'absolute';
        return element;
    }

    // 重置位置到随机位置
    resetPosition() {
        const bounds = this.mapContainer.getBoundingClientRect();
        
        this.x = Math.random() * (bounds.width - 40) + 20;
        this.y = Math.random() * (bounds.height - 40) + 20;
        this.updateElementPosition();
    }

    // 更新元素位置
    updateElementPosition() {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }

    // 获取随机方向
    getRandomDirection() {
        const angle = Math.random() * 2 * Math.PI;
        return {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
    }

    // 获取当前区块
    getCurrentBlock() {
        const bounds = this.mapContainer.getBoundingClientRect();
        
        const colWidth = bounds.width / MAP_COLS;
        const rowHeight = bounds.height / MAP_ROWS;
        
        const col = Math.floor(this.x / colWidth);
        const row = Math.floor(this.y / rowHeight);
        
        const colLetter = String.fromCharCode(65 + col);
        const rowNumber = MAP_ROWS - row;
        
        return `${colLetter}${rowNumber}`;
    }

    // 更新游泳者状态
    update() {
        const now = Date.now();
        
        // 检查是否需要改变方向
        if (now - this.lastDirectionChange > MIN_DIRECTION_TIME) {
            if (Math.random() < 0.1) {  // 10%的概率改变方向
                this.currentDirection = this.getRandomDirection();
                this.lastDirectionChange = now;
            }
        }

        // 更新位置
        if (this.status === 'normal') {
            const bounds = this.mapContainer.getBoundingClientRect();
            
            let newX = this.x + this.currentDirection.x * this.speed;
            let newY = this.y + this.currentDirection.y * this.speed;

            // 边界检查
            if (newX < 20) {
                newX = 20;
                this.currentDirection.x *= -1;
            } else if (newX > bounds.width - 20) {
                newX = bounds.width - 20;
                this.currentDirection.x *= -1;
            }

            if (newY < 20) {
                newY = 20;
                this.currentDirection.y *= -1;
            } else if (newY > bounds.height - 20) {
                newY = bounds.height - 20;
                this.currentDirection.y *= -1;
            }

            this.x = newX;
            this.y = newY;
            this.updateElementPosition();
        }
    }

    // 设置警告状态
    setWarning() {
        this.status = 'warning';
        this.element.className = 'swimmer warning';
    }

    // 恢复正常状态
    setNormal() {
        this.status = 'normal';
        this.element.className = 'swimmer normal';
        this.resetPosition();
    }
}

// 游泳池管理类
class SwimmingPool {
    constructor(swimmerCount = 5) {
        this.swimmers = [];
        this.logs = [];
        this.warnings = [];
        this.initialize(swimmerCount);
    }

    // 初始化
    initialize(count) {
        const mapContainer = document.getElementById('coordinate-map');
        
        // 创建网格
        for (let row = 0; row < MAP_ROWS; row++) {
            for (let col = 0; col < MAP_COLS; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                const colLetter = String.fromCharCode(65 + col);
                const rowNumber = MAP_ROWS - row;
                cell.setAttribute('data-id', `${colLetter}${rowNumber}`);
                mapContainer.appendChild(cell);
            }
        }

        // 等待一帧以确保网格已渲染
        requestAnimationFrame(() => {
            // 创建游泳者
            for (let i = 0; i < count; i++) {
                const swimmer = new Swimmer(i + 1, mapContainer);
                mapContainer.appendChild(swimmer.element);
                this.swimmers.push(swimmer);
            }

            // 开始更新循环
            this.startUpdateLoop();
            
            // 开始随机警告生成
            this.startWarningGenerator();
        });
    }

    // 添加日志
    addLog(message) {
        const logContainer = document.getElementById('realtime-log');
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = message;
        
        this.logs.unshift(logEntry);
        
        // 更新DOM
        logContainer.innerHTML = '';
        this.logs.slice(0, MAX_LOGS).forEach(entry => {
            logContainer.appendChild(entry.cloneNode(true));
        });
        
        // 维护日志数量
        if (this.logs.length > MAX_LOGS) {
            this.logs = this.logs.slice(0, MAX_LOGS);
        }
    }

    // 添加警告
    addWarning(swimmer) {
        const warningContainer = document.getElementById('warning-log');
        const warningEntry = document.createElement('div');
        warningEntry.className = 'warning-entry';
        
        const timestamp = new Date().toLocaleTimeString();
        const position = `(X:${swimmer.x.toFixed(2)}, Y:${swimmer.y.toFixed(2)})`;
        const block = swimmer.getCurrentBlock();
        
        warningEntry.innerHTML = `
            <div>游泳者${swimmer.id} - ${timestamp}</div>
            <div>位置：${position}</div>
            <div>区块：${block}</div>
            <button class="clear-warning-btn" data-swimmer-id="${swimmer.id}">清除警告</button>
        `;
        
        // 添加清除按钮事件
        const clearBtn = warningEntry.querySelector('.clear-warning-btn');
        clearBtn.addEventListener('click', () => this.clearWarning(swimmer.id, warningEntry));
        
        warningContainer.appendChild(warningEntry);
        this.warnings.push({
            swimmerId: swimmer.id,
            element: warningEntry
        });
    }

    // 清除警告
    clearWarning(swimmerId, warningElement) {
        const swimmer = this.swimmers.find(s => s.id === swimmerId);
        if (swimmer) {
            swimmer.setNormal();
        }
        
        warningElement.remove();
        this.warnings = this.warnings.filter(w => w.swimmerId !== swimmerId);
    }

    // 开始更新循环
    startUpdateLoop() {
        setInterval(() => {
            this.swimmers.forEach(swimmer => {
                swimmer.update();
                
                // 添加状态日志
                const timestamp = new Date().toLocaleTimeString();
                const position = `(X:${swimmer.x.toFixed(2)}, Y:${swimmer.y.toFixed(2)})`;
                const block = swimmer.getCurrentBlock();
                const status = swimmer.status === 'normal' ? '正常' : '警报';
                
                this.addLog(`[${timestamp}] - 游泳者${swimmer.id}：位置${position}，区块：${block}，状态：${status}`);
            });
        }, UPDATE_INTERVAL);
    }

    // 开始警告生成器
    startWarningGenerator() {
        setInterval(() => {
            if (Math.random() < 0.5) {  // 50%概率生成警告
                const normalSwimmers = this.swimmers.filter(s => s.status === 'normal');
                if (normalSwimmers.length > 0) {
                    const randomSwimmer = normalSwimmers[Math.floor(Math.random() * normalSwimmers.length)];
                    randomSwimmer.setWarning();
                    this.addWarning(randomSwimmer);
                }
            }
        }, 60000);  // 每分钟检查一次
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new SwimmingPool(5);  // 创建5个游泳者
}); 
