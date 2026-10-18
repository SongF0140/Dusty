# 关于我 / About Me

你好，我是 **JIA**。

一个在代码世界里探索底层原理与智能本质的学习者。从双绞线里的电平信号到神经网络里的向量空间，我对"计算"这件事的每一层抽象都充满好奇——也更在意一个更现实的问题：**AI 时代，学习的路径该怎么变？**

我的答案写在[《技术 · 产品 · 设计 · 全栈》](/posts/thoughts/04-技术产品设计全栈/)里：后端刷题叙事正在失效，全栈 + 产品思维才是新地基。本站的内容组织方式就是这个判断的实践。

## 我在写什么

站点内容按主题分组，全部来自真实的学习与实践记录：

- **嵌入式与物联网**：围绕 ESP32-S3、ESP-IDF、FreeRTOS 的完整实践系列（28 篇），从 LED 闪烁一路写到摄像头驱动；另有通信协议系列（8 篇）覆盖 UART、I2C、SPI、CAN、Modbus
- **Qt 桌面开发**：22 篇系统学习笔记，从第一个程序到信号槽、事件系统、多线程与 SQLite
- **AI 工程**：Agent SDK 实战、MCP 协议、Agent Skills、上下文控制、规范驱动开发（Spec-Driven）等 14 篇一线实践
- **计算机基础**：数据结构与算法、计算机组成原理、Linux 系统编程、MySQL、Docker
- **方法论与思考**：学习方法、职业认知、行业观察——AI 时代怎么学、怎么选方向

## 我在做的事

### [CampusOverflow AI](https://github.com/SongF0140/CampusOverflow_HWA)

面向高校课程场景的智能问答平台：校园问答、课程社区、声誉激励、内容治理，外加一个受控的 TypeScript Agent Runtime。业务后端用 FastAPI + MySQL，Agent 通过白名单接口与业务系统交互、高风险操作必须人工确认。规格驱动开发（spec-driven）贯穿全程，一期业务后端与二期 Agent 单 Loop 已完成。

### [Auto-Memories-Doll](https://github.com/SongF0140/Auto-Memories-Doll)

本地优先的 AI 记忆协作系统：多源采集学习对话（Trae / Cursor / Claude Code / 浏览器），HNSW 向量检索 + MMR 重排做记忆召回，三层审计管线防幻觉。核心目标一句话：**把嘈杂的学习对话蒸馏成纯净的知识图谱——遗漏的与已得的拆解归类、连点成图，让回看时能注意到当初 attention 从未注意到的地方。**

### 关于命名

Auto-Memories-Doll 取自《紫罗兰永恒花园》的"自动手记人偶"——那个替人把心意写成信的角色。这个项目做的事情类似：替你把对话里的想法沉淀成记忆。

## 关于本站

基于 Astro 的静态博客，内容源独立存放在 [blog_knowledge](https://github.com/SongF0140/blog_knowledge) 仓库，构建时自动同步。这个"内容与站点分离"的设计让我可以随时换主题、换框架，而笔记本身不受影响。

**GitHub：[SongF0140](https://github.com/SongF0140)**

**QQ：1395543336**
