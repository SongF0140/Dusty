-- Generated from the current public build: 123 unchanged descriptions.
-- No model calls. Safe to rerun: existing rows are never overwritten.
BEGIN;
SET LOCAL standard_conforming_strings=on;
-- Current state per article. Initial descriptions are preserved verbatim.
-- Existing blog_summary_cache data is intentionally left untouched.
CREATE TABLE IF NOT EXISTS blog_post_summaries (
  post_id text PRIMARY KEY,
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  summary text NOT NULL,
  source text NOT NULL CHECK (source IN ('manual','model')),
  model text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source='manual' OR length(summary) BETWEEN 1 AND 240)
);

INSERT INTO blog_post_summaries(post_id,content_hash,summary,source) VALUES
('通信协议/01-从双绞线到tcpip通信','50840931423b857409b79a6e2fc1ed608822f12961d86249ac0b3d0e955b1916','从双绞线到TCPIP通信 学习笔记。','manual'),
('通信协议/02-串口通信','3a3961deca090bd5ee8a26944daf8138b590035aaa838d5dab5e1357842f98ed','串口通信 学习笔记。','manual'),
('通信协议/03-rs232与rs485','435a8d9b6639e365ec77051f0ede8fe1ec55f139e3cffa50529308269f1c57f4','RS232与RS485 学习笔记。','manual'),
('通信协议/04-modbus-rtu','c6f6b56585aa5adc20955b1102f94c4fdc2fb1dd1d8ecb8e3fa643f0e38ce05e','Modbus-RTU 学习笔记。','manual'),
('通信协议/05-modbus-tcp','54feec59aff35cc3120a0243541225cc24d83a1b4d3a46f9d0c90b3b30227cf3','Modbus-TCP 学习笔记。','manual'),
('通信协议/06-i2c','fd61ae3247aa15c64ad7c9604f01eec8665ad4186672525c5a6501774093454b','I2C 学习笔记。','manual'),
('通信协议/07-spi','22565deb7038d27c73c120691eb31df2a54814fba1c7f534086f1949a1865314','SPI 学习笔记。','manual'),
('通信协议/08-can','926a428269b2da0ca3dfecab65ae92cb9e05930c78223dd2735e79dc06dade8a','CAN 学习笔记。','manual'),
('ai-engineering/01-用-agent-sdk-构建-ai-应用','fc8cb0dfd73a5641b639797af55b2dbefdd7b9fa0afed3b3a0d0e6920ededb55','通过七个示例串起 Agent SDK 的完整能力面：多轮对话、多智能体、Tool Use、MCP 与 Hooks。','manual'),
('ai-engineering/02-从零构建-ai-聊天应用','1ba9267fdf5f83e023d5ccfaa5ca76134f79f31f21d906aeb2290702ca262de1','SDK 流式输出接入服务端、WebSocket 实时推送思考过程与回答、多会话管理与断线恢复的完整实现。','manual'),
('ai-engineering/03-多智能体研究助理拆解','3f395cc0a61b9f8fa6cb814ab4287fec5e2659577eba8929cb68f8dbd0f64a1f','Multi-Agent、AgentDefinition、Hooks 与文件系统黑板：用 Task 工具做任务分解的协作范式。','manual'),
('ai-engineering/04-会话体系与跨轮记忆','20f90b10cbd57bcdac09322f705d20e96730617bb75ff7c01b94fa5304199866','一次性查询、进程内会话、可恢复会话、应用层存储四层体系：「界面有历史」不等于「模型记得」。','manual'),
('ai-engineering/05-ai-上下文控制完整教程','0b20b168c0e5cf341f263dc34f616cc0b9edbaaee5dcb579b71115f993474f80','学会用 @ 精准控制 AI 看什么、不看什么，掌握「最小上下文」思路，减少跑偏与上下文污染。','manual'),
('ai-engineering/06-mcp-让-ai-连接外部世界','950ed4dc7ef9adb2cb1bb223a4f777be42d8e59e7ff51d30d9efed5adb823ef9','理解 MCP 的基本概念与接入方式，把数据库结构等外部数据源接进 AI 上下文，完成元数据驱动的代码生成闭环。','manual'),
('ai-engineering/07-agent-skills-实用指南','864472704f5db98c022e6c32afee7a84199f7528b613823249ef1d3117004ccf','搞懂 Agent Skills 解决什么问题、为什么比长 Prompt 更省更稳，附可直接复制的 SKILL.md 模板。','manual'),
('ai-engineering/08-提示词与项目规则配置','f4bb1c50e1cb8bf4689e5d1d318017ffa6964a753fa7703b8a558975a97cdc46','通过 .codebuddy/rules 目录把项目规范沉淀成规则文件，让 AI 在协作中稳定遵循既定约定。','manual'),
('ai-engineering/09-内联编辑与心流','fea5223d23f663123fd557424c3c317dff382b6550faf82ccc84907e47d9b950','从心流理论出发，探讨内联编辑如何减少上下文切换，让人与 AI 的协作保持在最佳状态区间。','manual'),
('ai-engineering/10-规范驱动开发-spec-driven','25995e3adffcb7f272137cf4623ee4706b87249a29aa79cfc6712bc1b8f2ba90','不讲概念只讲操作：每一步怎么做、每个模块为什么存在、生成的项目长什么样、如何与规范体系交互编写。','manual'),
('ai-engineering/11-从两份规格文件开始','bc4ea28a6c0536b0bf52f372caa007b5c412bfb2022182c58d6ce46d6fd429c1','以任务看板为例，演示如何用数据模型规格与 UI 规格两份 Markdown 驱动 AI 完成完整功能开发。','manual'),
('ai-engineering/12-文档撰写示例','94f3b0c748ce41b9e3bdb0cca9c271e8e8b9c0a6bdb811e972cf9aaf80ff13c7','以实际项目文档为例，演示如何组织结构、分配信息密度，让 AI 生成可维护的技术文档。','manual'),
('ai-engineering/13-多智能体使用指南','0e6dcb56b83e118701b49f313b8fe1b3dd0437b2dc3898267af8086bb1ab1332','何时该拆多智能体、怎么划分职责边界、如何避免协调成本吃掉收益。','manual'),
('ai-engineering/14-ai-进入-ci-cd-流水线','33e99eb76b114314e4c0f4b2d081cf85f4a0c935347cd2438b11518e9c79d654','CLI 形态的 AI 如何真正嵌入流水线：AI 进入自动化流程的入口只有一个参数。','manual'),
('docker/01-概述与架构原理','a4d39cd76e6edd0297d7616cfb7ef2295fcee43a69c7d93e6b8a3d83add83ed5','Docker 是一套模块化架构：客户端、守护进程、运行时、镜像、容器、网络、存储、仓库，理解这些模块才是真正掌握 Docker 的钥匙。','manual'),
('docker/02-环境安装','028f3055c66858630ee65ea06660741fca45d0a6c4ab660e771a10f8dc12d004','覆盖两个平台的 Docker 环境搭建：Windows（Docker Desktop + WSL2）与 Ubuntu（Docker CE）。','manual'),
('docker/03-dockerfile-与-docker-run','afe6d329690c69b76096537e8130c2c8ca69ddaee81a0faeebeb1c9b96c7014e','先搞清楚镜像、容器、仓库四个概念，再看如何用 Dockerfile 描述构建过程、用 docker run 启动容器。','manual'),
('docker/04-镜像制作实践','6ad4ca43122ab91e4df98e10c6fa9f75fc51512aabaffab92c3776dcacbc7b42','从零构建可用镜像：分层设计、缓存策略、构建上下文与体积优化。','manual'),
('docker/05-容器内常用命令','a24e8b0d8587a6731b5889a6ac94c80114536e67e149dc1817a38b2714439251','进入容器、查看进程、拷贝文件、查看日志——日常开发最常用的 Docker 命令梳理。','manual'),
('docker/06-文件系统解析','849dde0e2eb9583d24bcc9f5d20be3c0ec59f244a7b42d6ba77839e8ed31ae72','深入解析常见文件系统的结构与差异，理解容器存储依赖的底层机制。','manual'),
('embedded/esp32-s3/00-hello-world','80d1fd95ab84d83391175b4d8fbf7eff69017bd64091c51c9bfa8000ebf38126','Hello World 是 ESP-IDF 开发框架最基础的入门项目，用于验证开发环境配置是否正确，并展示 ESP32-S3 项目的基本结构。','manual'),
('embedded/esp32-s3/00-knowledge-map','76a386218a33678b73035383a1ecbc38b3b948d82f1aef624e28a33f54fe8f65','本文档汇总本系列所有博文的章节结构、知识点关联和推荐阅读顺序。','manual'),
('embedded/esp32-s3/01-adc-oneshot','815b40d8924a6e676552a5dbeae2f4718898ced68dbf05ced044ff2f451c8902','ADC Oneshot 配置结构体关键字段：','manual'),
('embedded/esp32-s3/01-external-interrupt','594bc2562aa4f3d60b4bd510b12db0d54c5e5fbc53b1d37ef47654838ec41ef9','本章节学习 GPIO 外部中断机制，实现按键中断触发 LED 状态切换。相比轮询检测，中断方式响应更及时，CPU 利用率更高。','manual'),
('embedded/esp32-s3/01-led-blink','09f6df0955a310f7273355d6144a2ed4eaf3593fb8338df9c6cdfab16935c305','本章节学习 ESP32-S3 的 GPIO（通用输入/输出）基本操作，实现 LED 闪烁功能。这是嵌入式开发中最基础的外设控制实验。','manual'),
('embedded/esp32-s3/01-spiffs','00d57f5c4838e745235cd2ab1c73c763a023630589d43ce0ac62eea1af27a492','本章学习 ESP32-S3 的 SPIFFS（SPI Flash File System）——一种专为 SPI NOR Flash 设计的轻量级文件系统。','manual'),
('embedded/esp32-s3/01-task-create-delete','e95254aa90128a318afe3620ed4a449ff4677b6460f5d566e29fc924ba2865b7','本章项目 FREERTOS/1MultiTask 是一个 双任务并行 的最小工程：','manual'),
('embedded/esp32-s3/01-uart','6963619ace591d4fb0a5eb07ab5e3323cb61bb2a68f7ce3a19a1aad3c0997823','奇偶校验示例（数据 0x55 = 01010101B，含 4 个 1）：','manual'),
('embedded/esp32-s3/01-wifi-principle','3f0c1e0b3920cb027583d2617f1cdd4022d308519c996886a3b1fbf045709eec','Wi-Fi 是 ESP32 最重要的功能之一。ESP32-S3 内置 2.4 GHz Wi-Fi 4（802.11 b/g/n） 收发器，支持 STA、AP、STA+AP 三种工作模式。','manual'),
('embedded/esp32-s3/01-wifi-sta','ec6c13ac5b3e9fcf6647ddb2321730b858bc3125527afd581289b285a2ea16bc','本章项目 20WIFISTA 是一个 ESP32-S3 以 STA（Station）模式连接路由器 的最小演示工程。','manual'),
('embedded/esp32-s3/02-adc-continuous','a71e2972074011781c277e97b1846442497ca36e833191d90542d6b235cc8489','ADC 连续转换配置结构体关键字段：','manual'),
('embedded/esp32-s3/02-boot-nvs-spiffs','8c54ad47264d825c7a9caffd942bca0b882a6f6b40a70450661411c298a323d9','统一实验场景：按键按下 → LED 以不同频率闪烁 → 串口打印按键次数。','manual'),
('embedded/esp32-s3/02-i2c','1cdca17c0be92e91cda50cfb5b6fa50d415d23af2a2041215eb566a6952f9a82','I2C 配置结构体 i2cconfigt 关键字段：','manual'),
('embedded/esp32-s3/02-lcd-display','ceb49f68d80451e144ab9e86b739c63864325a1e4e5c7134f5e587e1e45d211b','注意：SPI 相关 API 将在后续章节详细讲解，本章节仅关注 LCD 显示调用。','manual'),
('embedded/esp32-s3/02-running-light','30335a30ff9a4f3af4f05d7208cb165c0b6780016bb500cb6ec3c415b678c34a','本章节在 LED 基础控制之上，扩展到多 GPIO 同时控制，实现流水灯效果。核心知识点包括多引脚配置和顺序控制逻辑。','manual'),
('embedded/esp32-s3/02-task-suspend-resume','9d3dbe089d683a19c2e736fcf60b679aebfdd51f6b7457897353730ae1598395','本章在上一章的基础上做了一个小而精的改动：把"删任务"换成了"挂起与恢复"。','manual'),
('embedded/esp32-s3/02-wifi-ap','c3f0a8dfd7a4c59de0f0c9d214cd0de0a86d4e3c8cffbdc36e8856226a289b6b','本章项目 22WIFIAP 是一个 ESP32-S3 以 AP（Access Point）模式创建热点 的最小演示工程。','manual'),
('embedded/esp32-s3/03-buzzer','6ffcd3438c91e092b0d2280aa70672277033a80fcce1691a162731a529601205','本章节学习蜂鸣器的 GPIO 控制。蜂鸣器是一种音频信号输出设备，通过 GPIO 输出高低电平交替变化产生声音。','manual'),
('embedded/esp32-s3/03-gp-timer','874d78d0761ea94e705b48e19ccc288b509eb4ccdd088a531b2198b34c7b30f3','本章节学习 ESP32-S3 的通用定时器（General Purpose Timer），实现周期性定时任务。GPTimer 是 ESP-IDF 的新版定时器驱动，相比旧版 timer 驱动具有更好的 API 设计和性能。','manual'),
('embedded/esp32-s3/03-ntp-time-sync','6b67a7d2e9b2c2be5267047c56cd7d11a1ddab0d37aae76abfcda11f5c41530b','本章项目 23NTCTime 是一个 ESP32-S3 通过 Wi-Fi 连接路由器，再通过 SNTP 向 NTP 服务器校时，最后把当前日期时间显示到 LCD 上 的示例工程。','manual'),
('embedded/esp32-s3/03-spi-lcd','05ae8ce77750cef9f0d1e0845c362503234bdc817e7cc968d1b07c242a42776f','SPI（Serial Peripheral Interface）是一种全双工、同步、主从架构的串行通信总线，由 Motorola 发明。典型的 4 线制 SPI 定义如下：','manual'),
('embedded/esp32-s3/04-ble','a89449c163f0107ffc4866d642f8da2a88cb82834691004097642ad3da880d85','本章项目 24BLE 是一个 ESP32-S3 基于 NimBLE 协议栈创建 BLE 外设（Peripheral），等待手机连接，并通过 GATT 特征值读写实现 LED 控制 的示例工程。','manual'),
('embedded/esp32-s3/04-button-input','8b1525a623a85015c83b52416e539123dbf8a9e107d5ef2d6f33608a633741c3','本章节学习 GPIO 输入功能，实现按键检测。核心知识点包括：GPIO 输入模式配置、按键消抖处理、轮询检测机制。','manual'),
('embedded/esp32-s3/04-esp-timer','0bb52eab90c0c10c7dbd14aa6f829f98890c3d86a6313f3dc24fa3733e1c9875','定时器配置结构体 esptimercreateargst：','manual'),
('embedded/esp32-s3/04-spi-tf-sd-card','4d7799130cc0d51847684abbfadc28e8d602dd22222c829d2bf9c023b2dc7465','SD 卡和 TF 卡本质上是同一种东西的两个外观版本：','manual'),
('embedded/esp32-s3/05-camera','7d63b4d0ce8f59db2b2923d52a1fdaab0363e4448303904133a57a872d15a288','本章介绍 ESP32-S3 如何驱动摄像头模块实现图像采集与实时显示。摄像头作为嵌入式系统中重要的视觉感知设备，其工作原理涉及光学传感、模拟-数字转换、数字信号处理等多个环节。ESP32-S3 通过并行接口（DVP）与摄像头传感器连接，利用 LCDCAM 外设和 DMA 实现高速图像数据采集。','manual'),
('embedded/esp32-s3/05-multitask-intro','c1521368131e1902dc570c2e0be9d60fc869e2f6aa3e046fb6dff001cf3c8749','本章节深入学习 FreeRTOS 多任务编程，理解 ESP32-S3 双核处理器的任务分配机制，实现 LED 任务和按键任务的并行执行。','manual'),
('embedded/esp32-s3/05-pwm-servo','bba5f37e86be81d3296caf2dafb98f3348ac84255e8cc9f50cc260db58e0fb3a','本文合并自 10PWM（LEDC PWM 基础）和 11PWMServoMotor（舵机控制）两章的学习笔记。','manual'),
('frontend/01-html-css','9df33ca2b4cd6b067d453bc565c87e3e19653cf5974117ffd4601f87b1bd77ab','后端视角补前端基础：HTML 结构、常用标签与 CSS 选择器、布局的核心概念。','manual'),
('frontend/02-js','b6703549f398b95090090a2cbae3d5d327b51735d74d2cbbf8a55b5dae40c30e','JavaScript 基础与 ES6+ 新语法：变量、函数、对象、数组、模块与异步，为阅读框架代码打底。','manual'),
('frontend/03-vue2','ab80df6d6f5bb89974ed01a31d021557ec4859d907f0d9cce31495ac2a5e1748','Vue 2 学习笔记：VueCli、Vuex、VueRouter 与 ElementUI，覆盖组件、指令、路由与状态管理。','manual'),
('frontend/04-vue3','edaa7bf11784adb19fef10df805c2e4fdb43aaec4cebcccd921110a64b7f1a6c','Vue 3 学习笔记：Composition API、Vite、TypeScript 与常用生态，从 Vue2 平滑过渡。','manual'),
('frontend/05-react','bba66145e48c8e10194057b856c678e1542952e9c451795d6eae4300b220e225','React 学习笔记：函数式组件与 Hooks、Redux、ReactRouter 与 MobX，三大框架之 React 篇。','manual'),
('git/solo-01-基础操作','7e751d8d511d0800c137f35c8c99d4b8a0a58e1b30bb731af2ca7ff5805e57c2','工作区、暂存区与版本库，Git 单人开发基础操作。','manual'),
('git/solo-02-分支管理','36720074ce31e1c57e787116c9864379bfab9d64517f97bff20ab0c568a237ad','分支创建、切换、合并与单人分支工作流。','manual'),
('git/solo-03-撤销与回退','95a59932205903d5226ca3210132ccbd3e2a889c5d5232cd0185588758b6ed02','git restore/reset/revert 撤销与回退的正确姿势。','manual'),
('git/solo-04-远程与标签','70c123c95d55937ba47477bd5c61a95ad36e60909aa35e8d76108ec49998d882','远程仓库关联、推送拉取与标签管理。','manual'),
('git/team','0906ba05a6f39e1336964ac2d93289b3038539bfd3d25c39a600f6d2c78bd090','团队协作流程：fetch 先行、分支隔离与合并审查。','manual'),
('knowledge/程序与进程cpu执行的奥秘','5b6ea42cc6be68985c257d0d13cb29e0cba3f8c9e02f145e8a53a96f7b5698d2','本文基于教程：https://www.youtube.com/playlist?list=PL9vTTBa7QaQPdvEuMTqS9McYieaweU8M(https://www.youtube.com/playlist?list=PL9vTTBa7QaQPdvEuMTqS9McYieaweU8M...','manual'),
('knowledge/第二章卷积神经网络上','2cc76d13f38bb9f0d7be2e3700eb4aadb67a93555e7177b695b41bccbcf13ee9','这一章，我们将要介绍卷积神经网络。在深度学习领域里，相比于全连接神经网络，卷积神经网络是一种更加高效的形式呢，同时在结构上卷积神经网络更加适用于图像的识别，区别于全连接神经网络每次只能操一维向量，卷积神经网络可以一次性传入图片（经卷积核优化计算），更加适用于图片领域。
图像的认识
图片的构成...','manual'),
('knowledge/第三章-卷积神经网络下','662e0c8d505491461c47dbed77666f358b7eb93ae5923f45d3ba5a45355838c6','在上一章中，我们介绍了卷积神经网络的图像识别原理，通道构成和计算方式，这一张我们接着上一讲的内容，继续讲解相关知识：填充，特征图计算公式，池化和多通道运算。
填充操作
在介绍填充操作之前，我们先回顾一下上一章最后的内容：步幅。步幅是卷积核在特征图中的移动“速度”。那么，在多次卷积运算过后，我们...','manual'),
('knowledge/第一章-全连接神经网络','4dad1021abc4bbd00373ce051cf48ba27e1d4fb9bc87fc7eee1c8b4e0c802df0','在深度学习领域里，我们接触的第一个基础模型就是全连接神经网络，它具有层层传递的网状结构，通过一步步精密的传递运算来得到一个综合性的结果，下面我们来介绍一下全连接神经网络的构成与相关的函数用法。
前言
在正式开始之前，我们先要明确一个概念：在众多深度学习的内容当中，我们要把我们所要得的结果看作一...','manual'),
('knowledge/多进程编程总结','3d5f56afd5f218181ff65475bd69135369b02d662444cea5155d5ac4c0bebcee','本章记录笔者在多进程编程中的实验心得与感受。
1、多进程的相关概念：
1进程是程序一次执行的过程，有一定的生命周期，分为：创建态，就绪态，执行态，挂起态和死亡态。
2进程是计算机资源分配的基本单位，系统会给每个进程分配04G的虚拟内存，其中03G是用户空 间，34G是内核空间
3其中多个进程...','manual'),
('knowledge/附录对于头结点单向链表的优化方法','1a14d8c9a32e93d0b4c39d331e67a4835e664ad582af89e95a0987e23c306935','————————————本文旨在交流学习计算机知识，欢迎交流讨——————————— 上一章，我们浅显的讨论了链表的结构，本文在上一章的链表的基础上做出了些许优化，可配合食用。 回到正题，我们已经了解链表的结构，它是一种非连续空间存储的线性表，主要依靠地址域访问下一个元素并通过遍历操作进行增删改查。...','manual'),
('knowledge/计算机组成原理绪论','f204dcafc3357a560f2f6430295b4a570bf64e9c2cc7405bfc35147fa281f81e','这一栏目，我们开始讲解有关计算机组成原理的知识，旨在梳理和提炼这一繁杂课程。本章笔者将会从计算机基本的组成和运行原理来整理这一绪论。 首先，我们来认识一下主体结构：


1.CU控制器：相当于主控台，控制其他元件的行为逻辑。
2.ALU运算器：用于进行CU控制器发布的任务进行运算。
3.寄存器...','manual'),
('knowledge/晶体管到代码计算机底层原理揭秘','e7dd59cb566e759d94b02a523378f288fea5d2b2a176d3009986372436bea986','本文基于教程：https://www.youtube.com/playlist?list=PL9vTTBa7QaQOoMfpP3ztvgyQkPWDPfJez(https://www.youtube.com/playlist?list=PL9vTTBa7QaQOoMfpP3ztvgyQkPWDPfJ...','manual'),
('knowledge/链表的实现与介绍','160a07abe6cc358412abf7b8f3422581754a81f18e99a0fd4df1d8a982db6877','——————————————本文旨在交流计算机知识，欢迎指正————————————— 首先，我们回顾一下上一期讲的顺序表： 顺序表是一种物理结构上连续的，一整块连续空间的逻辑表，但是，试想一下，如果每次我们都是申请在一块整块空间里面的顺序表，但是我们并不知道堆空间里面我们malloc一块空间之后我...','manual'),
('knowledge/链表最终章双向链表及其应用','6a0a88d7f4a9123fa66f5f5ef58f8c16780f35a9abcd071506ce65a6828612be','———————————本文旨在交流探讨计算机知识，欢迎交流指正———————————— 上一章，我们介绍了链表的循环扩展，但是，单向链表毕竟是单向查询的，就算是经过循环来查找，终究是效率偏低，下面，我们来介绍一种工程项目中运用更加广泛的一种链表结构：双向链表——：
根据此结构，我们可以发现，虽然代...','manual'),
('knowledge/洛谷p1010递归法题解','dff940d91d5a7da229d7470e40de693821577331360091a7776acc41a8f52271','————————————本文旨在讨论计算机知识，欢迎指正——————————————

输入输出样例 输入 1315 输出
2(2(2+2(0))+2)+2(2(2+2(0)))+2(2(2)+2(0))+2+2(0) 说明/提示 【数据范围】
对于 100% 的数据...','manual'),
('knowledge/洛谷p1115最大字段和的前缀和做法','7f896bcb5b98bc4b527c619af430f67422fbe78e696e19f24660747191aa8b7f','———————————本文旨在学习交流计算机知识，欢迎指正！————————————
看到标题，我们可以发现，这也是一个继承性累加问题，很显然的想到滑动窗口和前缀和两个方法： 首先看滑动窗口，那我们的思路就是左边是left，右边是right，而每次向右判断最大的数更新值但记录最大值，可是，如果这样...','manual'),
('knowledge/洛谷p1996约瑟夫问题数据结构链表模拟法','cebbda8a16323ca1f2ea15f9e2728646aea53a662127ef22146c3f5ccdb04362','———————————本文旨在讨论和交流计算机知识，欢迎指正！！！————————— 题目描述 n 个人围成一圈，从第一个人开始报数,数到 m 的人出列，再由下一个人重新从 1 开始报数，数到 m 的人再出圈，依次类推，直到所有的人都出圈，请输出依次出圈人的编号。 输入格式 输入两个整数 n,m...','manual'),
('knowledge/数据结构二叉树的基本介绍','2a2ff9b0a8597608b390114da2657209d8da2d94f69e1c31e3d2e9fe65b5baa7','————————————本文旨在讨论与学习计算机知识，欢迎交流———————————— 上一章，我们讲解了树结构的综述导论，那么，现在我们来深入了解一下树结构中最常用研究的结构——二叉树结构（上一章的扩展——孩子兄弟表示法就是利用的二叉树的原理）。
以上是关于普通二叉树的基本概念，我们可以结合上一...','manual'),
('knowledge/数据结构深度搜索与广度搜索的概念','6b9aa0dcfa065e6a46b5a312416965503a441442db092cb0d65cc1b3cca76e75','————————————本文旨在交流计算机知识，欢迎指正！———————————— 上一章节我们系统介绍了树的存储结构与基本概念，这一章，我们将详细介绍一下——树的基本应用。首先，笔者会介绍树的基本遍历模式，其次，我会详细讲解深度优先搜索和广度优先搜索的概念。 首先，我们来介绍一下树的几种遍历形式：...','manual'),
('knowledge/数据结构顺序队列及链式队列','fd9c3042aae520b17466e25633f1712d27227703d707740299fac7b7f8b7ce05','————————————本栏目旨在讨论计算机知识，欢迎交流————————————— 上一章，我们讨论了顺序栈和链式栈，这一章，我们将讲解线性结构的最后一个部分——顺序队列和链式队列。相比于栈结构的同端进出，就像原肠生物，而队列则是尾部入队和头部出队，就像后口生物一样。 如图：
那么，如何来实现入...','manual'),
('knowledge/数据结构之树及树的存储','4655e5ca65e47ab63dcdcaba3fb098fd4abb03a2c2023875ab45ec7ed4437f3c','——————————————本栏目旨在交流计算机知识————————————————— 上一章节，我们介绍了线性的数据结构：表，栈，队列。接下来，我们将进入下一章节——树结构的学习。 首先，我们先介绍一下树的基本概念： 结点：使⽤树结构存储的每一个数据元素都被称为“结点”。例如图中的A就是一个结点。...','manual'),
('knowledge/数据结构之顺序栈与链式栈','27c970d598093fe4d0d9c2ec5de0ca3db8ab4f2103f83bc9672a3c01e1c30712','——————————————本文旨在交流计算机技术，欢迎指正————————————— 上一大章，我们深入讲解了链表的内容，这一章，我们详细介绍一种较为简单的数据结构———栈。 首先，我们介绍栈是什么：栈是一种单向的结构，其中栈的底部是固定的，不可以进出，我们可操作的部分只有栈顶，来进行出入栈操作。...','manual'),
('knowledge/顺序表的实现与介绍及部分工程思想的思考','d53258dcd2f72bef49b8e49d75bdc8c73020e45b919516dfb80279230f783bee','——————————本文旨在讨论和探究计算机知识，欢迎指正———————————— 首先，我们来聊聊什么是线性表： 线性表，顾名思义，是一种具有线性结构的数据排布形式 ，是一个类似数组的东西，在逻辑上一个接一个有序的整块链接，区别于链表的无序分布链接。
如图，我们可以得出，顺序表是一条线一样的结构...','manual'),
('knowledge/拓展单向循环链表','7266298af779b0606934c9c500f2d020321c32fedf73433de866550f94d61e4c','—————————————本文旨在讨论计算机知识欢迎指正——————————————— 书接上回：我们已经了解了链表如何编写与前置节点和头指针两种表示方式，下面，我们来了解进阶写法———如何实现单向循环链表。 下面，我们来梳理一下循环链表的实现方式： 这是朴素的链表实现形式：
这是我们理想中的循环...','manual'),
('knowledge/resnet学习心得','dd22aaef6ca461417acb16df52bbf0881b63deceec07f340ff88dd7b2acf5d08','在上一章节，我们着重介绍了有关卷积神经网络的计算原理与优化方法，这一章，我们将介绍ResNet这一个里程碑式的神经网络，它解决了朴实神经网络在训练中的层数增加导致的深度神经网络训练中的梯度消失/爆炸问题和网络深度增加时准确度饱和甚至下降的现象（退化问题）
ResNet被发明于2015年，它的优化方...','manual'),
('mysql/01-数据库与表基础','2591c408e230fd545026f9efe23395867b89d94ac7de375d50078f4834ea501a','关系型数据库分类、建库建表与常用字段类型，打牢 SQL 基础。','manual'),
('mysql/02-insert插入数据','8e0d4f5054b0568495dfdfa5a16fbb8ff44f95a6c6b1fd6a5565806a6f3f1bc8','INSERT 插入单行、多行数据与常见注意事项。','manual'),
('mysql/03-update更新数据','5620d84f64aa3df79f75aa1a34a2549940c77feded8eebf9c1511d0d5035f7e8','UPDATE 更新数据、条件过滤与安全更新。','manual'),
('mysql/04-delete删除数据','bbfbe70d0e2e2cd4aaa6d37a834ace0f7505751e4adf63786da989381b4f0389','DELETE 删除数据、条件过滤与截断表的区别。','manual'),
('mysql/05-select基础查询与where','ceb6c2d897000ed8813a5be27e85abe97db13e3c7f3fbb36220bab03d7e973d8','SELECT 基础查询、字段筛选与 WHERE 条件过滤。','manual'),
('mysql/06-排序分页与聚合查询','3074042bb8dc71c80b9407a00d5c14b6b8c3d121f69548a730f7ac20bd164930','ORDER BY、LIMIT 分页与 COUNT/SUM/AVG 等聚合函数。','manual'),
('mysql/07-多表关系与外键','0579ce3dabc3f0748864aa2f3b51f7c2ea917cad06ddac28e33c72d0ef2a823f','多表关系建模、外键约束与引用完整性。','manual'),
('mysql/08-联表查询join','5a70730fd409ac5d781a30949c9cbc5797ed525d25cc376c044b0ae0eee3016f','INNER/LEFT/RIGHT JOIN 联表查询详解。','manual'),
('mysql/09-分组查询与子查询','7d1ab372f5e089e58c6ff2c87255d1ca27b4a81361d99ae0787811975ccea31a','GROUP BY 分组、HAVING 过滤与子查询。','manual'),
('qt/00-qt-knowledge-map','25d4143880235c409836f0ac6efb1640f631d504600ab26b6bd455d266d8f77f','Qt 学习项目（qt01–qt22，缺 qt18）的全局导航：21 篇带 mermaid 图的学习笔记的学习顺序、依赖关系与跳转索引。','manual'),
('qt/01-qt-first-program','dc6cbc346f7b03aaccd7eedbee7f4a047147105d2953bc86c8950521e86d933f','Qt 第一个程序：理解 QApplication / QCoreApplication、main 函数与 exec() 事件循环的关系，跑通一个最小 Qt 应用。','manual'),
('qt/02-qt-widget-basic','46fae9aeb6b20bf2fd66f98aef267bc1cbbbeb78ab861a390581d6b50b798592','QWidget 基础：用 .ui 设计界面、Ui 命名空间指针、自动连接槽（on_对象名_信号）、资源文件与对象树管理。','manual'),
('qt/03-cmake-build','8ec9b1189dbcc1fa24c2bd0f3ae6fa6f7f10ec4c106183b7e9e64eaa0c97d660','CMake 构建 Qt 工程入门：理解 find_package(Qt5/Qt6)、AUTOMOC/AUTOUIC/AUTORCC、qt_add_executable 与最终化。','manual'),
('qt/04-cmake-qt6','7cdf5762f729364b53a9fca174d5afd5c71b21b00583bc21da2abf831b731d83','CMake + Qt6：相比 Qt5 的 CMake 差异，如 find_package(Qt6)、qt_standard_project_setup()、qt_add_executable 与部署脚本。','manual'),
('qt/05-vscode-cmake-template','ee55482bc04feaf099bebfde675764eba0c243219ec37257e090fc187dbda121','VSCode + CMake 开发 Qt 的模板与配置：CMake Tools 插件、clangd 智能提示、构建目录与 compile_commands 衔接。','manual'),
('qt/06-clion-project','ce3ba9f5c602a8ee112f9fba52e680832a7b760f3458a2a780e4195e57f27e64','CLion 工程配置开发 Qt：CMake 工程在 CLion 中的设置、Qt 工具链路径登记（QtSettings.xml）与自动定位运行时。','manual'),
('qt/07-rcc-resource','a79ae432bab914fc9d2a944be3f1286ef2619d91137f6618eed43f01cad77e7b','Qt 资源系统 RCC：.qrc 文件、qt_add_resources 显式注册、:/前缀访问资源与 rcc 编译流程。','manual'),
('qt/08-object-tree','6e885d2fc7981a9982e5eace277297d5ed9b66d2e98155e404b0699c74c9a59d','通过 QObject 对象树机制理解 Qt 的父子内存自动管理：父对象析构时自动递归析构子对象，无需手动 delete，是 Qt GUI 程序避免内存泄漏的核心范式。','manual'),
('qt/09-qstring-char','875c3f9182979f1a1e6c08a96861d393ca56400a4df4292082cc424de36b2d16','深入 QString 的 UTF-16 内部存储，讲清 QString 与 const char* / std::string 之间的编码转换链路（toUtf8 / fromUtf8 / toLocal8Bit / fromLocal8Bit），剖析中文乱码的根因与规避。','manual'),
('qt/10-char-string','ffebe97d5273ed0906e9672d2bdd6ef51f639471d241524d0954a81ea74e5917','梳理 C/C++ 的 char、char*、std::string 与字符编码基础，并结合 Qt 的 QString 展示字符串增删改查、子串提取、路径解析与容器用法，打通从原生字符串到 Qt 字符串的认知。','manual'),
('qt/11-layout','abd702600f99b431abefb84aaca530e92977ae63a67bae14178dcfbe3d165c89','掌握 Qt 四大布局管理器与 QSplitter 的用法：用布局而非绝对坐标自适应排列控件，理解嵌套布局的层级关系、伸缩因子 stretch 与窗体伙伴 buddy。','manual'),
('qt/12-random-timer','97a3d7bee1e47aa9bfe4d9ae298fe234a60c9ef1099889a790bd1635f9c009f8','掌握 Qt6 的 QRandomGenerator 高质量随机数生成，结合 QObject 元对象系统（metaObject / 属性读写）动态操作对象属性，并理解 QTimer 如何驱动定时刷新与动画。','manual'),
('qt/13-signal-slot','79e06077cc67aefb3bf575b99127d0e63770cfaa95450363e2da06be49942e6b','信号与槽是 Qt 最核心的通信机制，本篇通过自定义类 A/B 的 emit→槽 调用链，讲解 connect、emit、signals/slots 关键字、Q_OBJECT 宏与重载信号槽的连接写法。','manual'),
('qt/14-keypad','691fc3047473a88e973af1db28d2ccdcfd2e2a418b1fda7a32a82438bad36b41','本篇剖析一个仿手机拨号键盘（KeyPad）工程，演示如何用信号槽把 12 个 QPushButton 的 clicked 信号统一接到 lcd_show 槽，实现 LCD 数字显示、删除与随机打乱布局。','manual'),
('qt/15-event-system','e29f4e82d24514b8812329c21074a6ecd16166082de3c56dd48afc3846ee9cb6','本篇剖析 Qt 事件系统的分发原理：QApplication::notify → QWidget::event → 具体事件处理函数，并演示 event() 重写、事件过滤器与自定义控件 InnerLable 处理鼠标事件后 emit 自定义信号。','manual'),
('qt/16-mouse-event','b3188ddb1b382175c5f645a5517da5147041c07e19af40dfd38fef8ff61a95c3','本篇剖析 qt16_tst_mouse：重写 mousePressEvent / mouseMoveEvent / mouseReleaseEvent / mouseDoubleClickEvent / wheelEvent / closeEvent，实现窗口拖动、光标切换、双击全屏、滚轮缩放文本与退出确认。','manual'),
('qt/17-keyboard-event','00dc95ebcad86e78e182eca1ca984ef17859ef7ca2e821be2dd4d70b69943815','本篇剖析 qt17_tst_keyboard：重写 keyPressEvent 用方向键移动按钮，对比 key() 与 text()，并说明键盘焦点（setFocusPolicy/setFocus）为何是键盘事件生效的前提；同时指出工程未实现 keyReleaseEvent。','manual'),
('qt/19-thread-movetothread','7b2ad595bda1c52260c6a54922b64d8b30f9786bc72884f1c62005a608494c37','通过 QThread + moveToThread 把耗时的 Worker 对象搬到子线程执行，用跨线程信号槽把计算结果安全地送回 GUI 线程，彻底摆脱界面卡死。','manual'),
('qt/20-painter-base','a8786931581c3a95037d3f55a8ae1eddcb7bb8269879bcab0c7b2df8aec64a8f','用 paintEvent + QPainter 在窗口上画出自己想要的一切：从 QPen/QBrush 的基本形状，到 QPainterPath 的路径布尔运算，再到 QTimer + update() 驱动的弹球动画。','manual'),
('qt/21-speed-meter','f43fc4fa56102e98ccd6c045dfbe3a4d909e244cdc6956692049c3cca925ccee','把 QPainter 的零散技巧封装成一个可复用的 SpeedWidget 车速表控件：坐标归一化、循环刻度、QPainterPath 镂空指针，以及 setSpeed() + update() 组成的对外数据接口。','manual'),
('qt/22-sqlite','7166800c50d87ff3efbfe11255ba429738a6473ca7fd49bb552b45d4c8f92e3d','使用 Qt SQL 模块操作 SQLite 嵌入式数据库：建库、建表、增删改查、参数绑定、事务与模型视图，以及常见的连接/线程/路径坑。','manual'),
('thoughts/01-如何高效地学习','e6111595a2b97ce7b000171e2a96cf0d8a460ebe8a78cde61789816f62886f81','从大一专业第四到算清一笔账退出排名竞赛，再到转向产品与设计：学习卡住的从来不是努力程度，而是到底在为谁而学。','manual'),
('thoughts/02-对高位者怯魅','655d6a3d920d0ee09a96c142f173b2b00adb90eb0407fe3e15f850656c3eb4b3','把「培养」翻译成经济行为，看清导师关系里的激励结构。问题不在人，在结构——而你现在是可流动的。','manual'),
('thoughts/03-新时代的重要资产与生存智慧','f7f1582e14a324ffc699d07924ac3d70c04ff9daeba73ad66ad8ebad9c2323d1','从一场没有笔试的 AI 初创面试里捞到的判断：项目的上下文是资产，不要轻易丢失；以及高密度信息环境下的生存智慧。','manual'),
('thoughts/04-技术产品设计全栈','7aab49977027c3bc54b7a110fe1b4b12fcc1a95251c6846337822e25b3955e64','后端叙事的失效、全栈地基的变化，以及产品与设计该怎么想——为什么门槛变高反而是好事。','manual'),
('thoughts/05-畅想瓶颈与更高效的协作未来','76d56f196aa1cb65b965245b0a9d0df174f5d67ce4d38c6affa0ddf0d48db926','从 prompt 到 context 到 loop 再到 attention，AI 协作的瓶颈一直在迁移。当前的瓶颈已从模型侧挪到人类侧。','manual')
ON CONFLICT (post_id) DO NOTHING;
COMMIT;
