/**
 * Purple Rain — 紫色雨丝全屏背景动画 v2
 * 致敬 Prince《Purple Rain》
 *
 * 效果：
 *  - 雨丝头部发光渐变
 *  - 落地溅射粒子
 *  - 紫色氛围笼罩
 *  - 移动端自动降密度
 */
;(function () {
  "use strict";

  // ══════════════════════════════════════════════
  //  配置
  // ══════════════════════════════════════════════
  const CFG = {
    angle: 12,               // 雨丝倾斜角度（度）
    minLen: 25,              // 雨丝最小长度 px
    maxLen: 65,              // 雨丝最大长度 px
    minSpeed: 9,             // 最小下落速度 px/帧
    maxSpeed: 18,            // 最大下落速度 px/帧
    lineWidth: 1.2,          // 雨丝宽度
    desktopDrops: 130,       // 桌面端雨丝数
    mobileDrops: 65,         // 移动端雨丝数
    mobileBP: 768,           // 移动端断点
    // 溅射
    splashCount: 3,          // 每次溅射粒子数 (随机 ±1)
    splashSpeed: 2.5,        // 溅射初始速度
    splashLife: 18,          // 溅射粒子生命周期 (帧)
    splashSize: 2.5,         // 溅射粒子最大半径
  };

  // ══════════════════════════════════════════════
  //  紫色色板
  // ══════════════════════════════════════════════
  const PURPLE = [
    { r: 138, g: 43,  b: 226, a: 0.40 }, // 蓝紫
    { r: 148, g: 55,  b: 230, a: 0.35 }, // 中紫
    { r: 106, g: 13,  b: 173, a: 0.45 }, // 深紫罗兰
    { r: 165, g: 75,  b: 240, a: 0.32 }, // 浅紫偏粉
    { r: 125, g: 30,  b: 200, a: 0.38 }, // 过渡紫
  ];

  const ANGLE_RAD = (CFG.angle * Math.PI) / 180;

  // ══════════════════════════════════════════════
  //  DOM
  // ══════════════════════════════════════════════
  const canvas = document.getElementById("purple-rain-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let drops = [];
  let splashes = [];
  let maxDrops = CFG.desktopDrops;
  let animId = null;
  let W = 0, H = 0; // 逻辑尺寸

  // ══════════════════════════════════════════════
  //  工具
  // ══════════════════════════════════════════════
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ══════════════════════════════════════════════
  //  雨滴
  // ══════════════════════════════════════════════
  class Drop {
    constructor(init) {
      this.reset(init);
    }

    reset(init) {
      this.y = init ? Math.random() * H : -rand(0, CFG.maxLen * 2);
      this.x = init
        ? Math.random() * (W + H * Math.tan(ANGLE_RAD))
        : Math.random() * (W + H * Math.tan(ANGLE_RAD) * 0.6);
      this.len = rand(CFG.minLen, CFG.maxLen);
      this.speed = rand(CFG.minSpeed, CFG.maxSpeed);
      this.headSize = rand(1.2, 2.2);
      this.color = pick(PURPLE);
      this.glow = Math.random() > 0.4; // 60% 的雨丝有发光
    }

    update() {
      this.y += this.speed;
      this.x += this.speed * Math.tan(ANGLE_RAD);

      // 落地 → 溅射 + 回收
      if (this.y - this.len > H) {
        spawnSplash(this.x, H);
        this.reset(false);
      }
      // 飘出右侧
      if (this.x > W + this.len * 2) {
        this.reset(false);
      }
    }

    draw(ctx) {
      const tailX = this.x - this.len * Math.sin(ANGLE_RAD);
      const tailY = this.y - this.len * Math.cos(ANGLE_RAD);

      // ── 雨丝主体：从头部（亮）到尾部（淡）的渐变 ──
      const grad = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
      const c = this.color;
      grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${c.a})`);
      grad.addColorStop(0.15, `rgba(${c.r},${c.g},${c.b},${c.a * 0.85})`);
      grad.addColorStop(0.5, `rgba(${c.r},${c.g},${c.b},${c.a * 0.45})`);
      grad.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);

      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = CFG.lineWidth;
      ctx.lineCap = "round";

      // 发光效果
      if (this.glow) {
        ctx.shadowColor = `rgba(${c.r},${c.g},${c.b},0.5)`;
        ctx.shadowBlur = 4;
      }
      ctx.stroke();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // ── 雨滴头部亮点 ──
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.headSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${Math.min(1, c.a + 0.25)})`;
      ctx.fill();
    }
  }

  // ══════════════════════════════════════════════
  //  溅射粒子
  // ══════════════════════════════════════════════
  class Splash {
    constructor(x, y) {
      const angle = rand(-Math.PI * 0.45, -Math.PI * 0.55); // 向上扇形 (-70° ~ -110°)
      const speed = rand(CFG.splashSpeed * 0.6, CFG.splashSpeed * 1.4);
      this.x = x;
      this.y = y;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed * 1.8; // 垂直分量放大，弹跳感
      this.life = randInt(CFG.splashLife - 5, CFG.splashLife + 5);
      this.maxLife = this.life;
      this.size = rand(CFG.splashSize * 0.5, CFG.splashSize);
      this.color = pick(PURPLE);
      this.gravity = 0.12;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.life--;
      return this.life <= 0;
    }

    draw(ctx) {
      const t = this.life / this.maxLife; // 1 → 0
      const alpha = this.color.a * t;
      const r = this.size * t;
      const c = this.color;

      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
      ctx.fill();

      // 光晕
      if (t > 0.3) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha * 0.25})`;
        ctx.fill();
      }
    }
  }

  function spawnSplash(x, y) {
    const count = CFG.splashCount + randInt(-1, 1);
    for (let i = 0; i < count; i++) {
      splashes.push(new Splash(x, y));
    }
    // 限制溅射总数，避免性能问题
    if (splashes.length > 200) {
      splashes.splice(0, splashes.length - 200);
    }
  }

  // ══════════════════════════════════════════════
  //  紫色氛围层
  // ══════════════════════════════════════════════
  function drawAtmosphere(ctx) {
    // 顶部淡淡的紫色渐变笼罩
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "rgba(80, 20, 140, 0.035)");
    grad.addColorStop(0.35, "rgba(60, 15, 120, 0.015)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ══════════════════════════════════════════════
  //  主循环
  // ══════════════════════════════════════════════
  function animate() {
    ctx.clearRect(0, 0, W, H);

    // 紫色氛围
    drawAtmosphere(ctx);

    // 雨滴
    for (let i = 0; i < drops.length; i++) {
      drops[i].update();
      drops[i].draw(ctx);
    }

    // 溅射
    for (let i = splashes.length - 1; i >= 0; i--) {
      const dead = splashes[i].update();
      if (dead) {
        splashes.splice(i, 1);
      } else {
        splashes[i].draw(ctx);
      }
    }

    animId = requestAnimationFrame(animate);
  }

  // ══════════════════════════════════════════════
  //  响应式
  // ══════════════════════════════════════════════
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    maxDrops = W < CFG.mobileBP ? CFG.mobileDrops : CFG.desktopDrops;
    drops = [];
    splashes = [];
    for (let i = 0; i < maxDrops; i++) {
      drops.push(new Drop(true));
    }
  }

  // ══════════════════════════════════════════════
  //  启动
  // ══════════════════════════════════════════════
  function start() {
    resize();
    if (animId) cancelAnimationFrame(animId);
    animate();
  }

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 200));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
    } else {
      if (!animId) animate();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
