# BEAR JUMP

自嘲熊跳跃 — 手绘风格的横版跑酷浏览器小游戏。

## 在线游玩

**[suanlayu666.github.io/Bear_Web](https://suanlayu666.github.io/Bear_Web/)**

## 可爱的熊
<img width="860" height="794" alt="中指熊" src="https://github.com/user-attachments/assets/2eea16e9-2e90-4aed-a287-b144584872d9" />


## 玩法

操控自嘲熊一路奔跑，跳跃躲避障碍物，尽可能跑得更远。

- **障碍物**：闹钟、DEADLINE 文件 — 碰到扣 1 点生命
- **地鼠**：获得二段跳能力
- **咖啡**：恢复 1 点生命
- **飞行闹钟**：空中障碍物，需要看准时机行动
- 连续闪避 5 个障碍物恢复 1 点生命
- 游戏速度随时间递增，难度逐步上升

## 操作

| 操作 | 键盘 | 手机 |
|------|------|------|
| 跳跃 / 开始 / 重新开始 | 空格 / ↑ | 点击屏幕 |
| 暂停 / 继续 | ESC | — |
| 二段跳 | 空中按空格 | 空中点击 |

## 技术栈

纯前端，无需构建工具，浏览器直接打开即可运行。

- HTML5 Canvas
- CSS3（响应式适配移动端）
- Web Audio API（程序化音效）
- localStorage（最高分持久化）

## 项目结构

```
Bear_Web/
├── index.html      # 入口页面
├── style.css       # 样式 & 移动端适配
├── game.js         # 游戏逻辑
├── picture/
│   ├── xiong2.jpg  # 熊角色原图
│   └── shu.jpg     # 地鼠角色原图
└── README.md
```

## 本地运行

直接用浏览器打开 `index.html` 即可，无需服务器。

```bash
git clone https://github.com/suanlayu666/Bear_Web.git
cd Bear_Web
# 用浏览器打开 index.html
```

## 许可

MIT
