-- Initial seed used local source 6633dbd, while Vercel already builds 6bec5f19de24ff84f28d548eea0aaa5c454a7b6f.
-- Preserve descriptions requested on 2026-10-22; only align known unchanged manual seed rows.
-- Never changes summary/source/model or matches later body hashes. Safe to rerun.
UPDATE blog_post_summaries AS current_summary
SET content_hash=baseline.new_hash
FROM (VALUES
 ('ai-engineering/01-用-agent-sdk-构建-ai-应用','fc8cb0dfd73a5641b639797af55b2dbefdd7b9fa0afed3b3a0d0e6920ededb55','493c600b9dca4c0e775b91033ef97e26a3b4952b58d12af4b50de79542fecff1'),
 ('ai-engineering/02-从零构建-ai-聊天应用','1ba9267fdf5f83e023d5ccfaa5ca76134f79f31f21d906aeb2290702ca262de1','b5c3d657063c74569092cba3732d373d47059d97158ac25ac0e6b23b79854608'),
 ('ai-engineering/03-多智能体研究助理拆解','3f395cc0a61b9f8fa6cb814ab4287fec5e2659577eba8929cb68f8dbd0f64a1f','91764ff599b94057b0774034fa814bddff70c5fbe15461ae0d5eeba84cbb7e2f'),
 ('ai-engineering/04-会话体系与跨轮记忆','20f90b10cbd57bcdac09322f705d20e96730617bb75ff7c01b94fa5304199866','2e0c16dc4fff8ee3d2d134b99c5356192a2081adc93ea2a070be650bb6a6a0eb'),
 ('ai-engineering/05-ai-上下文控制完整教程','0b20b168c0e5cf341f263dc34f616cc0b9edbaaee5dcb579b71115f993474f80','cfeb37610af277a05d39a3f417c89570a4a9cd2bc400ce8023fc412da7c1c625'),
 ('ai-engineering/12-文档撰写示例','94f3b0c748ce41b9e3bdb0cca9c271e8e8b9c0a6bdb811e972cf9aaf80ff13c7','045ec0422d0d8ead7585a9638c1cfe0212f50e073746b03d000ca521efd9a2bf'),
 ('docker/01-概述与架构原理','a4d39cd76e6edd0297d7616cfb7ef2295fcee43a69c7d93e6b8a3d83add83ed5','609ebbf8719af901130a59c89f1798ec0d9d43fa37151ac8bd5fbd9c9cfde70f'),
 ('docker/02-环境安装','028f3055c66858630ee65ea06660741fca45d0a6c4ab660e771a10f8dc12d004','102fa9cf3d4a0f43f9fa307e726b80ddf69cc859c7cee9e1d431e7bab7cced7c'),
 ('docker/03-dockerfile-与-docker-run','afe6d329690c69b76096537e8130c2c8ca69ddaee81a0faeebeb1c9b96c7014e','b7bbd628281723f9cf0823ddb55c5a0e8db961c13f4e35d1ab82d4adc844851f'),
 ('docker/04-镜像制作实践','6ad4ca43122ab91e4df98e10c6fa9f75fc51512aabaffab92c3776dcacbc7b42','75f0e32c055b49e8a9920e8874ba6ce0bf3d5cc3b7bc45ab03758fa3ccd3d3ac'),
 ('docker/05-容器内常用命令','a24e8b0d8587a6731b5889a6ac94c80114536e67e149dc1817a38b2714439251','54a81413754d8bbca54b1a6ad4e1dfcba1f6c857f90962e74f70f9ab5abb174b'),
 ('docker/06-文件系统解析','849dde0e2eb9583d24bcc9f5d20be3c0ec59f244a7b42d6ba77839e8ed31ae72','f58176efe79fc9ffe19d30725d3dff7ea71da3cc654d80677af0847f1470eb76'),
 ('thoughts/05-畅想瓶颈与更高效的协作未来','76d56f196aa1cb65b965245b0a9d0df174f5d67ce4d38c6affa0ddf0d48db926','775c953f1efe61ce73418b7055ce28213f671cf6b99f064169850e9f52bac162')
) AS baseline(post_id,old_hash,new_hash)
WHERE current_summary.post_id=baseline.post_id
 AND current_summary.source='manual'
 AND current_summary.content_hash=baseline.old_hash;
