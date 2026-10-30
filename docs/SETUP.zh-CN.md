# LEMMA v0.3.0 · 一步步，解开。

中文优先、七语言的数学学习网页应用。范围已从分部积分扩展到**高中和大学数学的通用 AI 入口**：代数、几何、三角、概率统计、微积分、线性代数、微分方程、离散数学、证明题等。开放输入不等于已经验证可以正确解决所有数学题；不确定的识别、题意、计划和批改必须保留为待复核。

## 在 Windows 运行

安装 Node.js 22.12+，解压后双击 `START_WINDOWS.cmd`，保持终端打开，新版启动器会自动构建本文件夹代码、选择 3107 起的空闲端口，并在 Windows 自动打开 `/#/math`。不要再使用旧的 localhost:3000 窗口。页头标明 v0.3.0，可通过 `/api/version` 核对版本。

也可手动：

```sh
npm ci
npm run dev
```

测试与构建：

```sh
npm test
npm run build
```

生产式本机运行：macOS/Linux 用 `npm start`；Windows PowerShell 用：

```powershell
$env:NODE_ENV="production"
node --import tsx server/index.ts
```

无需密钥可使用六个跨主题离线示例、原有分部积分题库、题目导入、手写画布及本机保存。**任意题目 AI 辅导、图片/PDF 识别、手写识别、动态细分和相似题生成需要配置 API。没有配置时不会伪造成功。**

## 配置 GPT‑6.1

默认模型为官方 API 标识 **`gpt-6.1-sol`**，通过 Responses API 调用；支持文字与图像输入，PDF 通过 input_file 提交。

复制 `.env.example` 为 `.env`，填入自己的 API 密钥后重启：

```dotenv
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-6.1-sol
OPENAI_REASONING_EFFORT=medium
PORT=3000
AI_SESSION_LIMIT=40
AI_DAILY_LIMIT=120
LEMMA_DATA_DIR=.runtime
```

密钥只在服务端读取，不进入浏览器包、localStorage、IndexedDB 或日志。不要将 `.env`、`.runtime` 或用户笔迹提交到 Git。API 的实际可用性取决于账户权限与额度。

本轮**没有真实 API 密钥，未实际调用模型**。接口、模型标识、请求负载、输出验证与降级路径均已实现并用 mock 验证；真实识别质量、数学正确率、延迟、成本和相似题质量尚未实测。

官方参考：

- https://developers.openai.com/api/docs/models/gpt-6.1-sol
- https://developers.openai.com/api/docs/guides/images-vision
- https://developers.openai.com/api/docs/guides/file-inputs

## 学习流程与界面

1. `#/math` 选题页：输入文字，或导入 PNG / JPEG / WebP / PDF / TXT。图片与 PDF 最大 6 MB；TXT 最大 48 KB。文件类型与魔数在服务端校验。识别出的题目可直接编辑，先核对再开始。
2. 选择高中/大学与引导式/先独立尝试。AI 建立按年级组织的教学任务，并进行另一轮模型复核；输出结构或数学一致性未通过时停止，不随意展示。
3. `#/solve/<localId>` **独立专注解题页**：显示完整原题、当前任务、作答空间与大字号反馈。主导航、草稿列表与题库移出解题页。核心教学文字约 22–29px，宽松行距；手机正文也保持约 21–22px。
4. 可用键盘或直接手写。提交后保留正确部分；正确完成的反馈出现在下一步任务前。提示、细分、减少引导、完整讲解各有帮助记录。高级路径与讲解收在“更多学习选项”中。
5. 连接完整解法，再提交整题。已得到帮助的尝试不会重新计为独立通过。
6. 完成后可请求 AI 生成相似题；新题及服务端私有解答通过模型复核后，以独立模式开始，不展示路径、提示或实时正误。题意必须与原题不同，但对“仅改变系数”等教学质量目前依赖模型提示和复核，未做完备的语义相似度保证。
7. 求助退出独立模式会留下帮助记录。完成或未通过后都可创建“回看这道题”的新引导尝试，原有检验记录不被改写。

`AGENTS.md` 记录了后续改进必须遵循的学习体验原则：减少不必要步骤、独立解题页、大字号、保护草稿、对证据给反馈、及时呈现下一步、不能靠泛泛庆祝代替学习支持。没有未经验证的提分或心理效果承诺。

## iPad / 平板内手写

- 原生 Pointer Events 画布，支持触控笔压力、鼠标与可选的手指书写；触控笔模式忽略手指触点，避免常见误触。没有宣称达到原生应用级的防掌触能力。
- 笔、橡皮、撤销、重做；每个任务的原笔迹自动存入 IndexedDB。切换键盘、换题、刷新和返回后可恢复对应页。
- 配好 API 后，可在停笔约 1.8 秒后自动转写；请求至少相隔 6 秒以减少频繁调用。也可手动识别或关闭自动识别。
- 只发送当前画布页面，不发送全量书写轨迹。识别仅转写文字，不判断正误或生成策略；独立检验也保持这一边界。
- 当前识别文字直接进入同页可编辑作答框，无需截图、切换应用或复制粘贴。新笔画出现时取消旧请求；旧版本结果不覆盖新笔迹，手动修改也不会被旧识别结果覆盖。
- 识别不确定处会单独提示。原笔迹保留；未识别内容不能当作正确答案。
- 没有识别 API 时，离线示例默认键盘，避免阻塞；手写仍可切换用于保存笔记。有 API 的触屏设备默认手写，桌面默认键盘。

**验证边界：**实际用浏览器鼠标写入并验证了画布响应、保存与撤销入口，检查了 390px 与 820px CSS 视口。没有真机 iPad、Apple Pencil、Safari 防误触、倾斜/压感硬件实测，也没有真实识别 API 实测。这些是下一轮必须补做的设备验收。

## 三类数学与验证边界

| 内容 | 工作方式 | 正确性边界 |
|---|---|---|
| 六个跨主题离线示例 | 服务端预设任务、有限形式评分 | 预设内容已审阅；自由写法可能返回 unknown |
| 原分部积分题库 | 浏览器本地预设规则 | 8 道题、19 个答案形式曾通过独立符号核验；资源可检查，不用于保密考试 |
| 通用 AI 辅导与相似题 | 服务端生成、schema/DAG 检查、模型复核、逐次提交 | 模型复核不等于形式证明；任意数学题和任意证明不保证正确 |

完整参考答案、未来步骤的解答、私有评分标准和完整计划保留在通用辅导服务端。客户端只得到题目、阶段目标、当前任务与已允许的提示。独立模式不返回路径、当前子任务、提示或讲解。

## 语言

简体中文、English、繁體中文、Français、Español、日本語、Русский。语言保存于 `lemma.locale`，切换不重置题目、帮助或学生输入。数学公式与学生提交原文保持原样。模型使用当前选择的语言生成后续内容；历史模型自由文本保留其生成时的语言。

静态词典位于 `src/i18n/messages.json`，运行不需要翻译 API。`catalog.tsv` 与可选的 `build_catalog.py` 用于维护。新入口与原有功能均接入七语言；公开上线前仍应由母语使用者进一步校对长篇内容。

## 数据与隐私

- 通用题目、原图/PDF、识别文字、草稿、会话 token：本浏览器 IndexedDB `lemma-notebook` / `records`。
- 手写原笔迹：同库的 `ink` 表，以尝试与任务 ID 分开保存。
- 通用计划、参考解答、批改与帮助记录：本机服务器的 `.runtime/tutor.json`，原子写入；普通会话凭证以 hash 查验。派生尝试的重试恢复凭证保存在私有服务端记录中；该目录必须作为敏感数据保护。
- 原有本地题库：localStorage `lemma.v1`，schemaVersion 与损坏恢复逻辑保留。
- 不收集账号、相机轨迹、心理诊断数据或不必要身份信息。不保证跨设备同步。清理浏览器数据会丢失本机笔迹；不要删除 `.runtime` 以免失去服务端计划。
- 上传/识别时，当前文件或画布会经本机服务器发送到 OpenAI。调用使用 `store:false`；本应用没有上传到公共文件站点。

本地记录可由本机修改，不是可信考试系统；也没有实现生产级多用户隔离或账户授权。

## 服务端接口

`/api/tutor` 为通用流程；原有 `/api/attempts` 保留为旧题库接口。

| 方法与路径 | 用途 |
|---|---|
| GET `/config` | 是否配置密钥与当前模型 |
| GET `/examples` | 六个离线示例的公开题面 |
| POST `/recognize` | 图片/PDF/当前手写页识别；返回 text、latex、uncertainParts、needsReview、revision |
| POST `/sessions` | 创建题目教学计划或离线示例尝试；返回公开会话与随机 token |
| GET `/sessions/:id` | 带 Bearer token 恢复公开会话 |
| POST `/sessions/:id` | requestId、action、text、locale；action 为 submit / hint / split / reduce / exit_check / solution / similar / review |

请求限长、同源检查、每 IP 限流、每次学习额度、每日本机调用限制、超时、模型拒绝/格式错误处理均已实现。每次帮助先记录再展示。普通操作使用 requestId 幂等记录；派生题目也保留 requestId 映射用于网络重试恢复。输出使用 React 文本与 trust:false 的 KaTeX，无 eval/new Function，无任意代码或模型工具执行。

每日 IP 限额目前在内存中，重启会重置；多实例和公开运营需迁移到共享存储及账户限额。模型成本/限流仍需真实账户观测。

## 代码结构

```text
src/math/                 通用学习入口、独立解题页、手写、IndexedDB、契约
src/components/           原题库的公式、作答与路径组件
src/content/              原分部积分审核题库
src/domain/               原题库状态、评分与帮助账本
src/i18n/                 七语言字典与呈现层
server/model.ts           GPT-6.1 Responses API、附件校验、超时与错误
server/tutor/             通用教学、模型复核、六个示例、会话存储与接口
server/ai.ts              原题库 AI 适配层（默认也为 GPT-6.1 Sol）
server/index.ts           服务入口与限流
public/qa-mobile.html     390×844 内部验收
public/qa-tablet.html     820×1080 内部验收
AGENTS.md                 后续必须遵守的学习体验原则
tests/                    状态、模型契约、笔迹、上传与语言测试
```

品牌标识来自用户提供的截图，以 CSS 裁切显示原版深色白字区域，保持原图比例。正式上线宜用原始 SVG。页面采用午夜蓝、青蓝与冷白。数学字体随 KaTeX 打包；可选字体在线失败会回退系统字体。

## 本轮实际验证

- `npm test`：25 项通过，含原状态/帮助/独立检验、语言、通用计划依赖、服务端私有答案不披露、文件魔数/MIME 校验、笔迹坐标与撤销、旧识别结果排除、GPT-6.1 多模态请求 mock、无密钥明确失败。
- `npm run build`：TypeScript 与生产构建通过。
- 桌面浏览器：上传 TXT 题面；无密钥时保留题面；代数示例从两步到完整解法完成；真实鼠标笔画与保存；切换键盘；无密钥识别与相似题生成明确失败；返回题库保留记录；独立页刷新恢复。
- 窄屏和平板 CSS 视口：验证独立页、大字号任务、语言入口、键盘/手写切换和页面留白。
- 模型真实调用、任意题数学可靠性、相似题难度匹配、真实手写 OCR、iPad/Apple Pencil 硬件与 Safari：尚未实测，不以 mock 通过冒充完成。

## 下一步

1. 配置真实密钥，端到端测文字、照片、PDF、手写、相似题与正确/错误/未知分支，记录准确性、时延与成本。
2. 用真实 iPad/Apple Pencil 做书写与认知负担测试：落笔延迟、防误触、识别修正、断网恢复、舒适字号及下一步提示。
3. 扩展数学独立验证与替代路径；加入账户与服务端数据库、未成年人适用的数据政策、分布式额度、部署与真实学习效果评估。

本交付没有公开部署、购买服务、创建远端仓库或推送 GitHub。

### v0.3 immersive design
Black-screen arrival with slogan and gradually illuminated neural connections (about 4 seconds, skippable, once per browser session). The problem library offers neural connections, pathfinding light and untangling threads, with pause and persistent reduced-motion controls. OS reduced-motion preference is honored. Direct solving links skip arrival and the solving page keeps its large, quiet learning layout.

Extract this release into a new folder, then run `START_WINDOWS.cmd`. Confirm the header reads **v0.3.0**; use the URL opened by the launcher rather than an old localhost tab.
