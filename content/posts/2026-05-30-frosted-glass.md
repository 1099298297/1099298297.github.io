---
title: 把磨砂玻璃做对的六个细节
date: 2026-05-30 14:05
category: 技术
tags: [CSS, 设计, 玻璃态]
cover: assets/img/rain-window.jpg
summary: 大部分"玻璃态"看起来廉价，问题从来不在 blur，而在它背后没有光。
---

大部分"玻璃态"看起来廉价，问题从来不在 blur，而在它背后没有光。

#### 1. 先给背景做光源

玻璃是透光的，所以它背后必须有值得透的东西。我的做法是铺 3–5 个大尺寸径向渐变光斑，慢速漂移，饱和度不要太高。

```css
.orb {
  position: absolute;
  filter: blur(70px);
  background: radial-gradient(circle, #FFC79A, transparent 68%);
  animation: drift 26s infinite alternate;
}
```

#### 2. blur 要配 saturate

只写 blur 会让玻璃发灰。加上 `saturate(1.7)`，透过的光才有颜色。

```css
backdrop-filter: blur(22px) saturate(1.7);
```

#### 3. 一层 1px 的内高光

玻璃的边缘永远比中心亮。用 inset 阴影在顶部做一道白线，质感立刻出现。

```css
box-shadow: inset 0 1px 0 rgba(255,255,255,.9);
```

#### 4. 噪点

一片纯色加模糊会显得很"数字"。叠一层 5% 的 SVG 噪点，立刻有物理材质感。

#### 5. 分层，但别超过三层

导航 22px、卡片 14px、弹层 40px——层级靠模糊值区分。叠太多会掉帧。

#### 6. 让光跟着鼠标

卡片上记录鼠标坐标，做一圈 radial-gradient 高光。这是"活起来"的关键一步。

> 玻璃不是一种样式，是一种光学行为。先理解光，再写代码。
