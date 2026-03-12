import json
import logging
import re

import anthropic
from flask import current_app

logger = logging.getLogger(__name__)

# ==================== Prompt 模板 ====================

# 通用数据头部（所有类型共享）
_DATA_HEADER = """你是一位在技术圈拥有 100 万粉丝的博主，风格像少数派 + 阮一峰 + 陈皓（酷壳）的结合体。
你本身是一位有 15 年经验的全栈架构师，读过上千个开源项目的源码，能从代码结构一眼看出设计意图和技术债务。
你写东西有三个特点：(1) 说人话，不说正确的废话；(2) 有自己的判断，敢说"这个不行"；(3) 举的例子都是真实的、具体的，技术分析能深入到源码级别。

## 你的语气

- 像跟朋友聊天，不像写报告。"这玩意儿其实就是..."比"该项目旨在提供..."好 10 倍。
- 有观点。"我觉得它最大的问题是..."比"存在一些潜在的改进空间"好 10 倍。
- 用具体的东西代替抽象的东西。"3 秒启动，零配置"比"启动速度快，配置简单"好 10 倍。

## 你的两类目标读者

1. **小白用户**：不懂编程，但对技术产品感兴趣，想知道"这东西能帮我做什么""我怎么用它"。他们需要的是：类比、场景、截图级的操作指引、零术语的解释。
2. **开发者**：有编码能力，想知道"技术原理是什么""架构怎么设计的""和竞品比有什么优势""源码值不值得读"。他们需要的是：架构分析、代码示例、性能数据、设计决策的 trade-off。

你的每一个回答都要同时服务这两类人。

## 数据来源

### 1. 项目原始数据（来自 GitHub 爬取）
```json
{raw_data}
```

### 2. 补充采集数据（含项目文件结构、依赖、部署文件、全网文章等）
```json
{extra_data}
```

### 3. 预检测结果
- 主要语言：{detected_language}
- 语言分布：{all_languages}
- 项目类型：{project_type}
"""

# 通用 JSON 输出字段（所有类型都返回）
_COMMON_FIELDS = """
  "title": "项目名称",
  "summary": "用聊天的语气写 3-5 句话：这个项目到底在干嘛？它解决了什么让人头疼的问题？核心思路是什么？谁会需要它？\\n❌ 不要写：'该项目是一个基于 XX 的 YY 框架，旨在提供 ZZ 功能'\\n✅ 要写：'简单说，它让你不用写一行 CSS 就能搭出好看的页面。核心思路是...'",
  "oneLinerForHumans": "用一句不含任何技术术语的话解释这个项目，像跟你妈妈解释一样。例如：'它能帮你自动把英文网页翻译成中文，而且翻译质量接近人工翻译'",
  "category": "精确分类（如：AI/ML、Web框架、DevOps工具、数据库、CLI工具、UI组件库、安全工具、数据处理 等）",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "highlights": [
    "亮点要这样写：'零配置启动——npm create 一下就能跑，不用折腾 webpack 那堆配置'",
    "不要这样写：'该项目具有良好的开发体验'",
    "每个亮点必须回答：它具体做了什么？为什么这很重要？有没有数据佐证？"
  ],
  "useCases": [
    "场景要具体到人：'你是个前端开发，老板让你一周内搞个后台管理系统。用这个项目，你可以...'",
    "不要写：'适用于企业级应用开发场景'",
    "每个场景必须让读者能对号入座"
  ],
  "beginnerGuide": {{
    "whatItDoes": "用完全不含技术术语的语言解释。用类比和生活场景。3-5 句话。\\n✅ '想象你有一个超级聪明的助手，你把一堆乱七八糟的文件丢给它，它能自动帮你分类整理好'\\n❌ '这是一个基于机器学习的文件分类框架'",
    "whoShouldUse": "用具体的人物画像描述，不要用'开发者'这种词。\\n✅ '如果你经常需要处理大量 Excel 表格，或者你的工作涉及数据分析但你不想学编程...'",
    "howToStart": "如果一个完全不懂技术的人想用这个项目，最简单的路径是什么？有在线 demo 吗？有 GUI 版本吗？如果必须写代码，诚实说明",
    "realWorldAnalogy": "用一个现实世界的类比解释核心概念。\\n✅ '如果说传统数据库像图书馆的卡片目录，那这个项目就像 Google 搜索——你不需要知道书在哪个架子上，直接搜就行'"
  }},
  "developerGuide": {{
    "whyChooseThis": "给 3 个最有说服力的技术理由，每个必须有具体数据或代码级论证。\\n❌ '性能优秀，架构清晰'\\n✅ 'Benchmark 显示比 Express 快 2.3 倍（见 README 的 benchmark 章节），原因是用了 Radix Tree 路由而不是正则匹配'",
    "architectureInsight": "深入分析核心架构：关键设计决策是什么？为什么这样设计？trade-off 是什么？源码中最值得学习的部分？\\n要引用具体的文件路径和模块名",
    "integrationTips": "集成到现有项目的实用建议：最佳集成方式、常见的坑和解决方案、与主流框架的兼容性、性能调优建议",
    "codeWorthReading": "源码中最值得阅读的 3 个文件/模块，以及为什么值得读（能学到什么设计思想或技巧）。必须引用真实的文件路径"
  }},
  "pros": [
    "优点必须具体：'比 X 快 3 倍（有 benchmark 数据）'、'零配置启动'、'内置 15 种数据库适配器'",
    "不要写：'性能优秀'、'文档完善'、'社区活跃'这种空话"
  ],
  "cons": [
    "缺点必须真实：'文档只有英文'、'不支持 Windows'、'社区只有 200 个 star，遇到问题可能没人回答'",
    "绝对不要写：'暂无明显不足'——每个项目都有不足，找不到说明你没认真看"
  ],
  "similarProjects": [
    "竞品对比要有判断：'X 更快但配置复杂，本项目牺牲了 10% 性能换来零配置体验'",
    "不要写：'X 是一个类似的项目'——这是废话"
  ],
  "difficultyLevel": "入门/中级/高级（附理由，如：需要了解 Docker 和 K8s 基础）",
  "recommendation": "用聊天的语气写 3-5 句话：什么水平的人适合用？什么场景最值得试？上手建议？需要注意的坑？\\n❌ '该项目适合有一定经验的开发者在企业级场景中使用'\\n✅ '如果你是个 React 开发者，想找个状态管理方案又不想学 Redux 那套，这个值得试。建议先跑一下 examples/counter，10 分钟就能上手'",
  "maturityLevel": "experimental/early/stable/mature",
"""

# 通用尾部字段（项目结构、全网文章、深度思考）— 不含 generatedArticle
_COMMON_TAIL_FIELDS = """
  "projectStructureAnalysis": {{
    "overview": "3-5 句话概述项目的整体目录组织方式、设计理念、代码组织风格",
    "coreModules": [
      {{
        "name": "模块/目录名",
        "path": "路径",
        "purpose": "2-3 句话说明职责、对外接口、与其他模块的关系",
        "keyFiles": ["关键文件1", "关键文件2"]
      }}
    ],
    "entryPoints": ["入口文件1（如 main.py、index.ts、app.go）"],
    "configFiles": ["配置文件1及用途"],
    "architectureDiagram": "用 Mermaid 语法生成项目架构图（graph TD 格式），要求：\\n1. 节点用中文标注模块名称和职责\\n2. 边用箭头标注数据流向或调用关系\\n3. 分层展示（如 API层 → 业务层 → 数据层）\\n4. 包含外部依赖（数据库、缓存、第三方服务等）",
    "workflowDescription": "详细描述项目的核心工作流程（8-15 句话）：\\n1. 请求/数据从哪里进入系统\\n2. 经过哪些模块处理，每个模块做了什么\\n3. 各模块之间如何协作（同步/异步、消息队列、RPC等）\\n4. 数据如何存储和流转\\n5. 最终输出是什么\\n如果是 Web 应用，描述一个典型请求的完整生命周期；如果是 CLI 工具，描述一个典型命令的执行流程；如果是库，描述核心 API 的调用链路",
    "designPatterns": ["设计模式1：[名称] — 在哪个模块使用、为什么选择这个模式、带来什么好处"],
    "layerStructure": "分层架构说明（如 MVC、Clean Architecture、Hexagonal 等），描述各层职责和边界"
  }},
  "webArticleSummaries": [
    {{
      "title": "文章标题（从补充数据的 webArticles 中选取）",
      "keyInsights": "用 2-3 句话提炼这篇文章的核心观点和独到见解，不要简单复述",
      "relevance": "这篇文章对理解本项目有什么帮助"
    }}
  ],
  "deepThinking": {{
    "technicalAnalysis": "5-8 句话深度技术分析：(1)核心算法/架构的创新点；(2)技术债务和潜在风险；(3)可扩展性评估；(4)与当前技术趋势（AI、云原生、边缘计算等）的结合点",
    "marketPosition": "3-5 句话市场定位分析：(1)在技术生态中的位置；(2)目标市场规模；(3)商业化潜力；(4)护城河分析",
    "extensionIdeas": [
      "扩展方向1：[名称] — 具体怎么扩展、技术方案、预期效果、目标用户",
      "方向2：同上格式",
      "方向3：同上格式"
    ],
    "projectIdeas": [
      "项目创意1：[名称] — 基于本项目能构建什么产品、目标用户、核心功能、技术栈建议、MVP 范围",
      "创意2：同上格式"
    ]
  }}
"""

# 通用质量要求（第一轮：结构化分析）
_COMMON_QUALITY = """
## 质量要求（严格遵守）

### 语气和风格（最重要）
1. **说人话**：想象你在跟一个聪明但不了解这个项目的朋友聊天。"这玩意儿其实就是..."比"该项目旨在..."好 100 倍。
2. **有观点**：不要当复读机。你的价值在于判断和洞察。"我觉得它最大的问题是 X，因为 Y"比"存在一些改进空间"好 100 倍。
3. **用具体代替抽象**：每句话都问自己"我能不能加个数字、加个例子、加个对比？"。"3 秒启动"比"启动快"好。"比 Express 快 2 倍"比"性能优秀"好。

### 内容质量
4. **数据驱动**：用具体数据支撑判断（star 数、release 频率、benchmark 数据等）。没有数据就说"数据不足"。
5. **独立思考**：不要复述 README。发现 README 没说的东西、指出潜在问题、给出独到见解。
6. **诚实客观**：信息不足时返回空字符串或空数组，绝不编造。

### 禁止事项
7. **不要编造 URL**：webArticleSummaries 只总结补充数据中 webArticles 提供的真实文章，没有就返回空数组。
8. **projectStructureAnalysis**：必须基于 projectStructure.treeText 中的真实文件树来分析，不要编造文件路径。
9. **beginnerGuide 必须零术语**：如果出现"API""框架""编译""部署"这些词，就是失败的。
10. **developerGuide 必须有干货**："架构清晰"是废话，"用了 Event Sourcing 模式，通过 X 模块实现 Y"才是干货。
11. **禁止 AI 套话**：以下词汇出现一次扣一分——"值得关注""不容错过""强大的""优秀的""总的来说""综上所述""旨在提供""致力于"。用事实和数据替代这些空洞形容词。

### ⚠️ JSON 输出强制要求（最高优先级）
12. **必须输出完整的 JSON**：你的响应必须是一个完整的、可解析的 JSON 对象。
13. **不能在中间停止**：即使内容很长，也必须完成所有字段的输出，直到最后的 }} 结束符。
14. **检查完整性**：在停止输出前，确认 JSON 的所有括号都已闭合，所有字段都已完成。
15. **优先保证结构完整**：如果担心超长，可以适当精简每个字段的内容，但绝不能在字段中间停止。
16. **最后一个字段必须完整**：特别注意 workflowDescription、deepThinking 等长文本字段，必须写完整句话后再结束。
17. **JSON 格式检查清单**：
    - ✓ 所有字符串都用双引号包裹
    - ✓ 所有对象的 {{ }} 都已闭合
    - ✓ 所有数组的 [ ] 都已闭合
    - ✓ 最后一个字段后没有多余的逗号
    - ✓ 整个 JSON 以 }} 结尾
"""

# ==================== 分段生成 Prompt 模板 ====================

# 第一段：基础信息
_PART1_BASIC_PROMPT = """你是一位在技术圈拥有 100 万粉丝的博主，风格像少数派 + 阮一峰 + 陈皓（酷壳）的结合体。

## 数据来源
### 项目原始数据
```json
{raw_data}
```

### 补充数据
```json
{extra_data}
```

### 预检测结果
- 主要语言：{detected_language}
- 项目类型：{project_type}

## 任务说明
这是分段生成的第 1/3 段，请生成项目的**基础信息**部分。

请严格按照以下 JSON 格式返回（只返回 JSON，不要其他内容）：

{{
  "title": "项目名称",
  "summary": "用聊天的语气写 3-5 句话：这个项目到底在干嘛？它解决了什么让人头疼的问题？核心思路是什么？谁会需要它？",
  "oneLinerForHumans": "用一句不含任何技术术语的话解释这个项目，像跟你妈妈解释一样",
  "category": "精确分类（如：AI/ML、Web框架、DevOps工具、数据库、CLI工具、UI组件库等）",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "highlights": [
    "亮点1：具体做了什么？为什么重要？有数据佐证吗？",
    "亮点2：同上",
    "亮点3：同上"
  ],
  "useCases": [
    "场景1：具体到人，让读者能对号入座",
    "场景2：同上",
    "场景3：同上"
  ],
  "beginnerGuide": {{
    "whatItDoes": "用完全不含技术术语的语言解释，3-5 句话",
    "whoShouldUse": "用具体的人物画像描述",
    "howToStart": "最简单的路径是什么？有在线 demo 吗？",
    "realWorldAnalogy": "用一个现实世界的类比解释核心概念"
  }},
  "developerGuide": {{
    "whyChooseThis": "给 3 个最有说服力的技术理由，每个必须有具体数据或代码级论证",
    "architectureInsight": "深入分析核心架构：关键设计决策、trade-off、源码中最值得学习的部分",
    "integrationTips": "集成到现有项目的实用建议、常见的坑和解决方案",
    "codeWorthReading": "源码中最值得阅读的 3 个文件/模块，以及为什么值得读"
  }},
  "pros": [
    "优点1：必须具体，有数据",
    "优点2：同上",
    "优点3：同上"
  ],
  "cons": [
    "缺点1：必须真实，不要写'暂无明显不足'",
    "缺点2：同上",
    "缺点3：同上"
  ],
  "similarProjects": [
    "竞品1：有判断的对比",
    "竞品2：同上"
  ],
  "difficultyLevel": "入门/中级/高级（附理由）",
  "recommendation": "用聊天的语气写 3-5 句话：什么水平的人适合用？什么场景最值得试？上手建议？",
  "maturityLevel": "experimental/early/stable/mature"
}}

{quality_rules}

⚠️ 这是第 1/3 段，只需要生成上述字段，确保 JSON 完整可解析！
"""

# 第二段：技术细节
_PART2_TECHNICAL_PROMPT = """你是一位在技术圈拥有 100 万粉丝的博主，同时也是有 15 年经验的全栈架构师。

## 数据来源
### 项目原始数据
```json
{raw_data}
```

### 补充数据
```json
{extra_data}
```

### 第一段已生成的基础信息
```json
{part1_summary}
```

### 预检测结果
- 主要语言：{detected_language}
- 项目类型：{project_type}

## 任务说明
这是分段生成的第 2/3 段，请生成项目的**技术细节**部分。

{type_specific_fields}

{quality_rules}

⚠️ 这是第 2/3 段，只需要生成上述字段，确保 JSON 完整可解析！
"""

# 第三段：深度分析
_PART3_DEEP_PROMPT = """你是一位在技术圈拥有 100 万粉丝的博主，同时也是有 15 年经验的全栈架构师。

## 数据来源
### 项目原始数据
```json
{raw_data}
```

### 补充数据（含项目结构）
```json
{extra_data}
```

### 已生成的基础信息
```json
{part1_summary}
```

### 已生成的技术细节
```json
{part2_summary}
```

### 预检测结果
- 主要语言：{detected_language}
- 项目类型：{project_type}

## 任务说明
这是分段生成的第 3/3 段，请生成项目的**深度分析**部分。

请严格按照以下 JSON 格式返回（只返回 JSON，不要其他内容）：

{{
  "projectStructureAnalysis": {{
    "overview": "3-5 句话概述项目的整体目录组织方式、设计理念、代码组织风格",
    "coreModules": [
      {{
        "name": "模块/目录名",
        "path": "路径",
        "purpose": "2-3 句话说明职责、对外接口、与其他模块的关系",
        "keyFiles": ["关键文件1", "关键文件2"]
      }}
    ],
    "entryPoints": ["入口文件1（如 main.py、index.ts、app.go）"],
    "configFiles": ["配置文件1及用途"],
    "architectureDiagram": "用 Mermaid 语法生成项目架构图（graph TD 格式）",
    "workflowDescription": "详细描述项目的核心工作流程（5-8 句话）：请求/数据从哪里进入、经过哪些模块、如何协作、数据如何流转、最终输出是什么",
    "designPatterns": ["设计模式1：[名称] — 在哪个模块使用、为什么选择、带来什么好处"],
    "layerStructure": "分层架构说明（如 MVC、Clean Architecture 等）"
  }},
  "webArticleSummaries": [
    {{
      "title": "文章标题（从补充数据的 webArticles 中选取）",
      "keyInsights": "用 2-3 句话提炼核心观点和独到见解",
      "relevance": "这篇文章对理解本项目有什么帮助"
    }}
  ],
  "deepThinking": {{
    "technicalAnalysis": "5-8 句话深度技术分析：核心算法/架构的创新点、技术债务和潜在风险、可扩展性评估、与当前技术趋势的结合点",
    "marketPosition": "3-5 句话市场定位分析：在技术生态中的位置、目标市场规模、商业化潜力、护城河分析",
    "extensionIdeas": [
      "扩展方向1：[名称] — 具体怎么扩展、技术方案、预期效果、目标用户",
      "方向2：同上",
      "方向3：同上"
    ],
    "projectIdeas": [
      "项目创意1：[名称] — 基于本项目能构建什么产品、目标用户、核心功能、技术栈建议、MVP 范围",
      "创意2：同上"
    ]
  }}
}}

{quality_rules}

⚠️ 这是第 3/3 段（最后一段），必须生成完整的 JSON，以 }} 结尾！
"""

# ==================== 各类型专属 Prompt ====================

_LIBRARY_PROMPT = """
## 分析策略：库/框架类项目

这是一个 **库/框架** 类型的项目（language: {detected_language}）。请重点关注：
- API 设计质量和易用性
- 与同类库的性能对比和差异化
- 集成方式和兼容性
- 类型定义和文档完善度

请严格按照以下 JSON 格式返回，不要包含 JSON 之外的任何文字：

{{
{common_fields}
  "techStack": ["核心技术1", "技术2", "技术3"],
  "architecture": "3-5 句话描述库的核心模块划分、API 设计理念、关键设计模式、扩展机制",
  "apiDesign": {{
    "style": "API 风格（如 fluent/builder/functional/declarative/RESTful 等）",
    "coreApis": [
      "核心 API 1：`函数签名` — 功能说明、典型用法、注意事项",
      "核心 API 2：同上格式",
      "核心 API 3：同上格式"
    ],
    "typeSupport": "TypeScript/类型注解支持情况（完整/部分/无）",
    "extensibility": "插件/中间件/扩展机制详细说明"
  }},
  "compatibility": {{
    "runtimes": ["支持的运行时环境及版本，如 Node 18+、Python 3.8+、Browser ES2020+"],
    "frameworks": ["兼容的框架及版本，如 React 18+、Vue 3.x、Django 4.x"],
    "breakingChanges": "最近版本的破坏性变更说明（如果有）"
  }},
  "installMethods": ["安装方式1（完整命令，如 npm install xxx）", "安装方式2（如 CDN 链接）"],
  "quickStartCode": "一段最小可运行的代码示例（15-30 行），展示核心 API 用法，包含安装命令和必要的 import",
  "performanceBenchmark": "如果有性能数据，列出关键 benchmark 结果；没有则说明'暂无公开 benchmark 数据'",
  "migrationGuide": {{
    "fromProjects": [
      {{
        "name": "竞品名称",
        "steps": ["迁移步骤1：具体操作", "步骤2", "步骤3"],
        "difficulty": "简单/中等/复杂",
        "notes": "迁移时最容易踩的坑"
      }}
    ]
  }},
  "codeQualityScore": {{
    "overall": 7,
    "dimensions": {{
      "readability": 8,
      "testCoverage": 6,
      "documentation": 7,
      "architecture": 8,
      "errorHandling": 7
    }},
    "assessment": "2-3 句话代码质量评估，必须有具体依据"
  }},
  "securityConsiderations": ["安全注意事项1（具体场景和建议）", "注意事项2"],
  "bestPractices": ["最佳实践1（具体做法和原因）", "实践2", "实践3"],
{common_tail}
}}

{quality_rules}
9. **quickStartCode**：安装命令必须匹配 {detected_language} 生态，代码必须能直接复制运行
10. **apiDesign**：这是库类项目最核心的分析，要具体到 API 名称、参数和返回值
11. **performanceBenchmark**：如果 README 或全网文章中有 benchmark 数据，必须引用

⚠️⚠️⚠️ 最后提醒：你必须输出完整的 JSON！确保所有字段都完成，最后以 }} 结尾。不要在中间停止！⚠️⚠️⚠️
"""

_APPLICATION_PROMPT = """
## 分析策略：应用程序类项目

这是一个 **应用程序** 类型的项目（language: {detected_language}）。请重点关注：
- 部署方式和系统要求
- 架构设计和扩展性
- 配置管理和环境要求
- 性能和可伸缩性

请严格按照以下 JSON 格式返回，不要包含 JSON 之外的任何文字：

{{
{common_fields}
  "techStack": ["核心技术1", "技术2", "技术3", "技术4"],
  "architecture": "3-5 句话描述整体架构：核心模块、数据流向、关键设计模式、前后端分离方式、存储方案",
  "deployMethods": ["部署方式1（如 Docker Compose）", "部署方式2（如 K8s Helm）"],
  "deploySteps": [
    "步骤1：具体可执行的命令（如 git clone xxx）",
    "步骤2：配置环境变量（列出必须的变量）",
    "步骤3：启动服务（完整命令）",
    "步骤4：验证部署（如何确认成功）"
  ],
  "systemRequirements": "具体到版本号：操作系统、语言/运行时版本、最低内存/磁盘、外部依赖（数据库版本、Redis 版本等）",
  "configGuide": {{
    "envVars": ["关键环境变量1：变量名=说明（是否必须、默认值）", "环境变量2"],
    "configFiles": ["配置文件1：路径 — 用途和关键配置项", "配置文件2"],
    "secrets": "需要配置的密钥/凭证说明（如 API Key、数据库密码等）"
  }},
  "scalability": "可伸缩性分析：支持的并发量级、水平扩展方式、性能瓶颈点、已知的性能优化手段",
  "quickStartCode": "从零开始运行项目的最少步骤（git clone → 配置 → 启动），每步都是可执行命令",
  "migrationGuide": {{
    "fromProjects": [
      {{
        "name": "竞品名称",
        "steps": ["迁移步骤1", "步骤2"],
        "difficulty": "简单/中等/复杂",
        "notes": "注意事项"
      }}
    ]
  }},
  "codeQualityScore": {{
    "overall": 7,
    "dimensions": {{
      "readability": 8,
      "testCoverage": 6,
      "documentation": 7,
      "architecture": 8,
      "errorHandling": 7
    }},
    "assessment": "2-3 句话代码质量评估"
  }},
  "securityConsiderations": ["安全注意事项1", "注意事项2"],
  "bestPractices": ["最佳实践1", "实践2", "实践3"],
{common_tail}
}}

{quality_rules}
9. **deploySteps**：必须是真正可执行的命令，不要写伪代码
10. **systemRequirements**：要具体到版本号，如 Node.js 18+、PostgreSQL 14+
11. **configGuide**：列出启动项目必须配置的环境变量和配置文件

⚠️⚠️⚠️ 最后提醒：你必须输出完整的 JSON！确保所有字段都完成，最后以 }} 结尾。不要在中间停止！⚠️⚠️⚠️
"""

_CLI_PROMPT = """
## 分析策略：CLI 工具类项目

这是一个 **命令行工具** 类型的项目（language: {detected_language}）。请重点关注：
- 安装方式（多平台）
- 命令用法和子命令结构
- 与 shell 生态的集成
- 输出格式和可编程性

请严格按照以下 JSON 格式返回，不要包含 JSON 之外的任何文字：

{{
{common_fields}
  "techStack": ["核心技术1", "技术2"],
  "architecture": "CLI 工具的内部架构：命令解析方式、插件机制、配置加载流程等",
  "installMethods": [
    "安装方式1（如 brew install xxx）",
    "安装方式2（如 cargo install xxx）",
    "安装方式3（如二进制下载链接）"
  ],
  "cliUsage": {{
    "basicCommand": "最基本的使用命令示例",
    "subCommands": ["子命令1：`command` — 功能说明", "子命令2", "子命令3"],
    "commonFlags": ["--flag1：说明（默认值）", "--flag2"],
    "pipelineExamples": ["管道用法示例1（完整命令）", "示例2"],
    "configFile": "配置文件路径和格式说明（如 ~/.xxxrc）",
    "outputFormats": "支持的输出格式（如 JSON、table、plain text）"
  }},
  "platformSupport": {{
    "os": ["macOS", "Linux", "Windows"],
    "packageManagers": ["brew", "apt", "scoop", "npm 等"],
    "shellIntegration": "shell 补全、别名等集成说明"
  }},
  "quickStartCode": "从安装到第一次成功使用的完整命令序列（5-10 行）",
  "codeQualityScore": {{
    "overall": 7,
    "dimensions": {{
      "readability": 8,
      "testCoverage": 6,
      "documentation": 7,
      "architecture": 8,
      "errorHandling": 7
    }},
    "assessment": "2-3 句话代码质量评估"
  }},
  "securityConsiderations": ["安全注意事项1", "注意事项2"],
  "bestPractices": ["最佳实践1", "实践2", "实践3"],
{common_tail}
}}

{quality_rules}
9. **cliUsage**：这是 CLI 项目最核心的部分，命令示例要真实可运行
10. **installMethods**：列出所有主流安装方式，覆盖 macOS/Linux/Windows
11. **pipelineExamples**：展示与其他命令组合使用的管道示例

⚠️⚠️⚠️ 最后提醒：你必须输出完整的 JSON！确保所有字段都完成，最后以 }} 结尾。不要在中间停止！⚠️⚠️⚠️
"""

_DOCS_PROMPT = """
## 分析策略：文档/教程类项目

这是一个 **文档/教程/知识库** 类型的项目（language: {detected_language}）。请重点关注：
- 内容质量和覆盖范围
- 学习路径设计
- 与同类教程的差异化
- 实践性和可操作性

请严格按照以下 JSON 格式返回，不要包含 JSON 之外的任何文字：

{{
{common_fields}
  "techStack": ["涉及的技术1", "技术2"],
  "architecture": "内容组织方式：章节结构、知识体系、递进关系",
  "contentAnalysis": {{
    "scope": "内容覆盖范围（如：从入门到高级、仅覆盖核心概念等）",
    "depth": "内容深度评估（浅显/中等/深入），附具体依据",
    "practicalLevel": "实践性评估（纯理论/有示例/有完整项目/有练习题）",
    "freshness": "内容时效性（最后更新时间、是否覆盖最新版本）"
  }},
  "learningPath": [
    "学习步骤1：[章节/主题] — 预计时间、前置知识、学习目标",
    "步骤2：同上格式",
    "步骤3：同上格式"
  ],
  "uniqueValue": "与同类教程/文档相比的独特价值（2-3 句话）",
  "qualityHighlights": ["质量亮点1（如：每章都有可运行的代码示例）", "亮点2"],
  "quickStartCode": "如果有代码示例，展示最有代表性的一段（10-20 行）",
  "codeQualityScore": {{
    "overall": 7,
    "dimensions": {{
      "readability": 8,
      "testCoverage": 6,
      "documentation": 9,
      "architecture": 7,
      "errorHandling": 6
    }},
    "assessment": "2-3 句话内容质量评估"
  }},
  "securityConsiderations": ["安全相关内容覆盖情况"],
  "bestPractices": ["最佳实践1", "实践2"],
{common_tail}
}}

{quality_rules}
9. **contentAnalysis**：这是文档类项目最核心的分析，要具体评估内容质量
10. **learningPath**：设计合理的学习路径，标注预计时间和前置知识
11. **qualityHighlights**：突出文档的质量亮点，如代码示例、图表、练习等

⚠️⚠️⚠️ 最后提醒：你必须输出完整的 JSON！确保所有字段都完成，最后以 }} 结尾。不要在中间停止！⚠️⚠️⚠️
"""

_DATA_PROMPT = """
## 分析策略：数据集/数据工具类项目

这是一个 **数据集/数据工具** 类型的项目（language: {detected_language}）。请重点关注：
- 数据质量和规模
- 数据格式和获取方式
- 适用场景和限制
- 与同类数据集的对比

请严格按照以下 JSON 格式返回，不要包含 JSON 之外的任何文字：

{{
{common_fields}
  "techStack": ["数据格式1", "工具2"],
  "architecture": "数据组织方式：目录结构、文件格式、数据关系",
  "dataAnalysis": {{
    "scale": "数据规模（条目数、文件大小、时间跨度等）",
    "format": "数据格式（CSV/JSON/Parquet/SQL 等）",
    "quality": "数据质量评估（完整性、准确性、一致性）",
    "updateFrequency": "更新频率（实时/日更/月更/静态）",
    "license": "数据许可证和使用限制"
  }},
  "applicableScenarios": [
    "适用场景1：[领域] — 具体用法、预期效果",
    "场景2：同上格式"
  ],
  "benchmarkResults": "如果是 benchmark 数据集，列出已知的基准测试结果",
  "quickStartCode": "数据加载和基本使用的代码示例（10-20 行）",
  "codeQualityScore": {{
    "overall": 7,
    "dimensions": {{
      "readability": 8,
      "testCoverage": 6,
      "documentation": 7,
      "architecture": 7,
      "errorHandling": 6
    }},
    "assessment": "2-3 句话数据质量评估"
  }},
  "securityConsiderations": ["数据隐私和安全注意事项"],
  "bestPractices": ["数据使用最佳实践1", "实践2"],
{common_tail}
}}

{quality_rules}
9. **dataAnalysis**：这是数据类项目最核心的分析，要具体评估数据质量和规模
10. **applicableScenarios**：列出具体的应用场景，不要泛泛而谈
11. **benchmarkResults**：如果有 benchmark 数据，必须引用

⚠️⚠️⚠️ 最后提醒：你必须输出完整的 JSON！确保所有字段都完成，最后以 }} 结尾。不要在中间停止！⚠️⚠️⚠️
"""

_OTHER_PROMPT = """
## 分析策略：其他类型项目

这是一个 **{project_type}** 类型的项目（language: {detected_language}）。请根据项目实际情况进行全面分析。

请严格按照以下 JSON 格式返回，不要包含 JSON 之外的任何文字：

{{
{common_fields}
  "techStack": ["核心技术1", "技术2"],
  "architecture": "3-5 句话描述项目架构和设计",
  "quickStartCode": "从零开始使用的最少步骤或代码示例",
  "codeQualityScore": {{
    "overall": 7,
    "dimensions": {{
      "readability": 8,
      "testCoverage": 6,
      "documentation": 7,
      "architecture": 7,
      "errorHandling": 6
    }},
    "assessment": "2-3 句话代码质量评估"
  }},
  "securityConsiderations": ["安全注意事项1"],
  "bestPractices": ["最佳实践1", "实践2"],
{common_tail}
}}

{quality_rules}

⚠️⚠️⚠️ 最后提醒：你必须输出完整的 JSON！确保所有字段都完成，最后以 }} 结尾。不要在中间停止！⚠️⚠️⚠️
"""

# 类型 → Prompt 映射
_TYPE_PROMPTS = {
    'library': _LIBRARY_PROMPT,
    'application': _APPLICATION_PROMPT,
    'cli': _CLI_PROMPT,
    'docs': _DOCS_PROMPT,
    'data': _DATA_PROMPT,
    'other': _OTHER_PROMPT,
}

# 第二段：各类型的技术细节字段定义
_PART2_TYPE_FIELDS = {
    'library': """请严格按照以下 JSON 格式返回（只返回 JSON，不要其他内容）：

{{
  "techStack": ["核心技术1", "技术2", "技术3"],
  "architecture": "3-5 句话描述库的核心模块划分、API 设计理念、关键设计模式、扩展机制",
  "apiDesign": {{
    "style": "API 风格（如 fluent/builder/functional/declarative/RESTful 等）",
    "coreApis": [
      "核心 API 1：`函数签名` — 功能说明、典型用法、注意事项",
      "核心 API 2：同上",
      "核心 API 3：同上"
    ],
    "typeSupport": "TypeScript/类型注解支持情况（完整/部分/无）",
    "extensibility": "插件/中间件/扩展机制详细说明"
  }},
  "compatibility": {{
    "runtimes": ["支持的运行时环境及版本"],
    "frameworks": ["兼容的框架及版本"],
    "breakingChanges": "最近版本的破坏性变更说明（如果有）"
  }},
  "installMethods": ["安装方式1（完整命令）", "安装方式2"],
  "quickStartCode": "一段最小可运行的代码示例（15-30 行），展示核心 API 用法",
  "performanceBenchmark": "如果有性能数据，列出关键 benchmark 结果；没有则说明'暂无公开 benchmark 数据'",
  "migrationGuide": {{
    "fromProjects": [
      {{
        "name": "竞品名称",
        "steps": ["迁移步骤1", "步骤2"],
        "difficulty": "简单/中等/复杂",
        "notes": "迁移时最容易踩的坑"
      }}
    ]
  }},
  "codeQualityScore": {{
    "overall": 7,
    "dimensions": {{
      "readability": 8,
      "testCoverage": 6,
      "documentation": 7,
      "architecture": 8,
      "errorHandling": 7
    }},
    "assessment": "2-3 句话代码质量评估"
  }},
  "securityConsiderations": ["安全注意事项1", "注意事项2"],
  "bestPractices": ["最佳实践1", "实践2", "实践3"]
}}""",
    
    'application': """请严格按照以下 JSON 格式返回（只返回 JSON，不要其他内容）：

{{
  "techStack": ["核心技术1", "技术2", "技术3", "技术4"],
  "architecture": "3-5 句话描述整体架构：核心模块、数据流向、关键设计模式、前后端分离方式、存储方案",
  "deployMethods": ["部署方式1（如 Docker Compose）", "部署方式2（如 K8s Helm）"],
  "deploySteps": [
    "步骤1：具体可执行的命令",
    "步骤2：配置环境变量",
    "步骤3：启动服务",
    "步骤4：验证部署"
  ],
  "systemRequirements": "具体到版本号：操作系统、语言/运行时版本、最低内存/磁盘、外部依赖",
  "configGuide": {{
    "envVars": ["关键环境变量1：变量名=说明（是否必须、默认值）", "环境变量2"],
    "configFiles": ["配置文件1：路径 — 用途和关键配置项", "配置文件2"],
    "secrets": "需要配置的密钥/凭证说明"
  }},
  "scalability": "可伸缩性分析：支持的并发量级、水平扩展方式、性能瓶颈点、已知的性能优化手段",
  "quickStartCode": "从零开始运行项目的最少步骤（git clone → 配置 → 启动），每步都是可执行命令",
  "migrationGuide": {{
    "fromProjects": [
      {{
        "name": "竞品名称",
        "steps": ["迁移步骤1", "步骤2"],
        "difficulty": "简单/中等/复杂",
        "notes": "注意事项"
      }}
    ]
  }},
  "codeQualityScore": {{
    "overall": 7,
    "dimensions": {{
      "readability": 8,
      "testCoverage": 6,
      "documentation": 7,
      "architecture": 8,
      "errorHandling": 7
    }},
    "assessment": "2-3 句话代码质量评估"
  }},
  "securityConsiderations": ["安全注意事项1", "注意事项2"],
  "bestPractices": ["最佳实践1", "实践2", "实践3"]
}}""",
    
    'cli': """请严格按照以下 JSON 格式返回（只返回 JSON，不要其他内容）：

{{
  "techStack": ["核心技术1", "技术2"],
  "architecture": "CLI 工具的内部架构：命令解析方式、插件机制、配置加载流程等",
  "installMethods": ["安装方式1", "安装方式2", "安装方式3"],
  "cliUsage": {{
    "basicCommand": "最基本的使用命令示例",
    "subCommands": ["子命令1：`command` — 功能说明", "子命令2"],
    "commonFlags": ["--flag1：说明（默认值）", "--flag2"],
    "pipelineExamples": ["管道用法示例1（完整命令）", "示例2"],
    "configFile": "配置文件路径和格式说明",
    "outputFormats": "支持的输出格式"
  }},
  "platformSupport": {{
    "os": ["macOS", "Linux", "Windows"],
    "architectures": ["x86_64", "arm64"],
    "notes": "平台特定注意事项"
  }},
  "quickStartCode": "从安装到第一次使用的完整命令序列",
  "codeQualityScore": {{
    "overall": 7,
    "dimensions": {{
      "readability": 8,
      "testCoverage": 6,
      "documentation": 7,
      "architecture": 7,
      "errorHandling": 6
    }},
    "assessment": "2-3 句话代码质量评估"
  }},
  "securityConsiderations": ["安全注意事项1", "注意事项2"],
  "bestPractices": ["最佳实践1", "实践2", "实践3"]
}}""",
    
    'docs': """请严格按照以下 JSON 格式返回（只返回 JSON，不要其他内容）：

{{
  "techStack": ["文档技术栈1", "技术2"],
  "architecture": "文档的组织结构和生成方式",
  "contentAnalysis": {{
    "topics": ["主题1", "主题2", "主题3"],
    "depth": "入门/中级/高级/混合",
    "completeness": "内容完整度评估（1-10 分）",
    "codeExamples": "代码示例质量和数量评估"
  }},
  "learningPath": {{
    "beginner": ["步骤1（预计时间）", "步骤2"],
    "intermediate": ["步骤1", "步骤2"],
    "advanced": ["步骤1", "步骤2"]
  }},
  "qualityHighlights": ["质量亮点1", "亮点2", "亮点3"],
  "codeQualityScore": {{
    "overall": 8,
    "dimensions": {{
      "readability": 9,
      "testCoverage": 6,
      "documentation": 9,
      "architecture": 7,
      "errorHandling": 6
    }},
    "assessment": "2-3 句话内容质量评估"
  }},
  "securityConsiderations": ["安全相关内容覆盖情况"],
  "bestPractices": ["最佳实践1", "实践2"]
}}""",
    
    'data': """请严格按照以下 JSON 格式返回（只返回 JSON，不要其他内容）：

{{
  "techStack": ["数据格式/工具1", "技术2"],
  "architecture": "数据的组织结构和处理流程",
  "dataAnalysis": {{
    "format": "数据格式（CSV/JSON/Parquet 等）",
    "size": "数据规模（行数、文件大小）",
    "schema": "数据模式/字段说明",
    "quality": "数据质量评估（完整性、准确性、一致性）"
  }},
  "applicableScenarios": ["应用场景1", "场景2", "场景3"],
  "usageExamples": ["使用示例1（完整代码）", "示例2"],
  "benchmarkResults": "如果有 benchmark 数据，列出关键结果",
  "codeQualityScore": {{
    "overall": 7,
    "dimensions": {{
      "readability": 8,
      "testCoverage": 6,
      "documentation": 7,
      "architecture": 7,
      "errorHandling": 6
    }},
    "assessment": "2-3 句话数据质量评估"
  }},
  "securityConsiderations": ["数据隐私和安全注意事项"],
  "bestPractices": ["数据使用最佳实践1", "实践2"]
}}""",
    
    'other': """请严格按照以下 JSON 格式返回（只返回 JSON，不要其他内容）：

{{
  "techStack": ["核心技术1", "技术2"],
  "architecture": "3-5 句话描述项目架构和设计",
  "quickStartCode": "从零开始使用的最少步骤或代码示例",
  "codeQualityScore": {{
    "overall": 7,
    "dimensions": {{
      "readability": 8,
      "testCoverage": 6,
      "documentation": 7,
      "architecture": 7,
      "errorHandling": 6
    }},
    "assessment": "2-3 句话代码质量评估"
  }},
  "securityConsiderations": ["安全注意事项1"],
  "bestPractices": ["最佳实践1", "实践2"]
}}""",
}


# ==================== 第二轮：专属文章生成 Prompt ====================

_ARTICLE_PROMPT = """你是一位在技术圈拥有 100 万粉丝的博主，同时也是有 15 年经验的全栈架构师。
你的文风像少数派 + 阮一峰 + 陈皓（酷壳）的结合体。
你写的文章有三个特点：(1) 小白能看懂前半部分；(2) 开发者能从后半部分学到真东西，因为你自己就是顶级工程师；(3) 读起来像聊天，不像论文。

## 关于语气

- 你在跟读者聊天，不是在写报告。
- "这玩意儿说白了就是..."比"该项目旨在提供..."好 100 倍。
- "说实话，它最大的问题是..."比"存在一些潜在的改进空间"好 100 倍。
- 可以用"你""我""咱们"这些词。可以用反问句。可以偶尔吐槽。
- 但不要油腻，不要强行幽默，不要用感叹号轰炸。

## 你拥有的素材

### 项目原始数据
```json
{raw_data}
```

### 补充采集数据（含文件结构、依赖、全网文章等）
```json
{extra_data}
```

### 第一轮结构化分析结果
```json
{analysis_result}
```

## 图文结合要求（极其重要）

你的文章必须是**图文并茂**的，不能是纯文字墙。视觉元素必须与上下文内容紧密相关，出现在最能帮助读者理解的位置。

### 1. Mermaid 图表（必须至少 3 个）

在以下位置插入 Mermaid 图表，用 ```mermaid 代码块包裹：

- **架构总览**：用 `graph TD` 或 `graph LR` 画项目整体架构，展示模块关系和数据流向。节点用中文标注。
- **核心流程**：用 `sequenceDiagram` 或 `flowchart` 画一个典型请求/操作的完整流程。
- **技术选型对比**：用 `quadrantChart` 或 `xychart-beta` 或 Markdown 表格展示与竞品的对比。
- **数据流向**：如果涉及数据处理，用 `flowchart` 画数据从输入到输出的流转过程。
- **部署架构**：如果是应用类项目，画部署拓扑图。

每个 Mermaid 图前面必须有 1-2 句话引导，说明"接下来这张图展示的是..."，图后面也要有 1-2 句话解读关键信息。不要孤零零地放一张图。

### 2. README 项目图片（如果有）

补充数据中的 `readmeImages` 字段包含从项目 README 提取的真实图片 URL。这些是项目作者提供的截图、架构图、demo 效果图等。

**使用规则**：
- 在文章中用标准 Markdown 图片语法引用：`![描述](url)`
- 只在内容相关的位置插入，不要堆砌。比如讲 UI 效果时插入截图，讲架构时插入架构图。
- 如果图片的 alt 文本为空，根据上下文和 URL 路径推断合适的描述。
- 如果 `readmeImages` 为空或不存在，跳过此项，不要编造图片 URL。

### 3. Markdown 表格（必须至少 1 个）

- 竞品对比必须用表格，维度要具体（性能数据、API 风格、生态规模、学习曲线）。
- 技术栈总览可以用表格。
- 配置项说明可以用表格。

### 4. 代码块（必须至少 3 段）

- 标注语言类型（```python、```bash、```typescript 等）。
- Hello World 级别的入门示例 + 进阶用法示例。
- 每段代码前后都要有说明文字。

## 文章要求

### 整体结构：前 40% 给所有人看，后 60% 给开发者看

**前半部分（小白友好）**：
- 用一个所有人都能感同身受的场景开头（不要用技术术语）
- 用类比解释这个项目是什么（"它就像是 XX 界的 YY"）
- 如果有 README 截图/效果图，在这里展示，让读者直观看到项目长什么样
- 列出 3-5 个"如果你是...你可以用它来..."的场景
- 说清楚靠不靠谱（用通俗语言解释 star 数、更新频率、谁在用）
- 给出最简单的上手路径（有在线 demo 就推荐 demo，别一上来就让人装环境）
- **这部分绝对不能出现**：API、框架、编译、部署、运行时、依赖、配置文件 这些词

**后半部分（开发者深度）**：
- 架构分析：用 Mermaid 画架构图，解释关键设计决策的 trade-off，引用具体文件路径
- 核心流程：用 Mermaid 时序图/流程图展示一个典型操作的完整链路
- 实战代码：至少 2 段可运行代码（Hello World + 进阶场景），标注常见踩坑点
- 竞品对比：用 Markdown 表格，维度要具体（性能数据、API 对比、生态规模），给出明确判断
- 源码导读：推荐 3 个值得读的文件，说明能学到什么
- 生产注意事项：性能瓶颈、已知的坑、监控建议
- **这部分必须有**：具体的代码、具体的数据、具体的文件路径、Mermaid 图表。没有这些就是失败的。

### 写作铁律

1. **字数**：4000-10000 字，宁长勿短，但每句话都要有信息量
2. **代码块**：至少 3 段，标注语言类型，必须能直接复制运行
3. **Mermaid 图**：至少 3 个（架构图 + 流程图 + 其他），用 ```mermaid 代码块
4. **对比表格**：至少 1 个 Markdown 表格
5. **README 图片**：如果 readmeImages 中有图片，至少引用 1-3 张在合适的位置
6. **不要编造**：所有数据、URL、benchmark 必须来自提供的素材。没有就说"暂无公开数据"
7. **图片 URL 不要编造**：只使用 readmeImages 中提供的真实 URL，绝不自己构造图片链接
8. **引用全网文章**：如果补充数据中有 webArticles，自然地引用其观点
9. **中文撰写**，技术术语保留英文（如 "Tree Shaking"）
10. **禁止词**：值得关注、不容错过、强大的、优秀的、总的来说、综上所述、旨在提供、致力于、不可或缺、应运而生。出现任何一个都是失败的。
11. **视觉节奏**：每 300-500 字之间应该有一个视觉元素（图表、代码块、表格或图片），避免出现连续超过 500 字的纯文字段落。

直接输出 Markdown 文章内容，不要包含任何 JSON 包装或额外说明。
"""


# ==================== 第三轮：实践部署教程 Prompt ====================

_TUTORIAL_PROMPT = """你是一位在技术圈拥有 100 万粉丝的博主，同时也是有 15 年经验的全栈架构师。
你写的实践教程有一个核心原则：**读者跟着你的步骤一步步做，一定能跑起来**。

你最擅长的是：把一个看起来很复杂的部署过程，拆解成"复制粘贴就能跑"的步骤。

## 关于语气

- 像一个耐心的老司机带新人，"别慌，跟着我一步步来"。
- 每一步都要告诉读者"做完这步你应该看到什么"，让他们有信心继续。
- 遇到容易踩坑的地方，提前警告："注意，这里很多人会卡住，因为..."
- 不要假设读者什么都懂，但也不要啰嗦。

## 你拥有的素材

### 项目原始数据
```json
{raw_data}
```

### 补充采集数据（含文件结构、依赖、部署文件、CI 配置等）
```json
{extra_data}
```

### 第一轮结构化分析结果
```json
{analysis_result}
```

## 图文结合要求（极其重要）

教程类文章更需要视觉引导，读者跟着步骤做的时候，图表能帮他们确认自己走对了路。

### 1. Mermaid 图表（必须至少 2 个）

- **部署架构图**：用 `graph TD` 或 `graph LR` 画出部署后的系统架构（前端、后端、数据库、缓存等组件的关系）
- **操作流程图**：用 `flowchart` 画出从环境准备到成功运行的完整步骤流程，让读者一眼看到全貌
- 如果涉及多种部署方式，可以用流程图展示决策树（Docker vs 手动 vs 云平台）

每个 Mermaid 图前后都要有引导文字和解读。

### 2. README 项目图片（如果有）

补充数据中的 `readmeImages` 字段包含从项目 README 提取的真实图片 URL。

**使用规则**：
- 如果有项目运行效果截图，在"快速开始"章节成功运行后展示，让读者对比自己的结果
- 如果有架构图，在"配置详解"或"部署架构"章节引用
- 用标准 Markdown 图片语法：`![描述](url)`
- 如果 `readmeImages` 为空，跳过此项，不要编造图片 URL

### 3. 代码块（大量使用）

- 每个步骤的命令都用代码块包裹，标注语言类型（bash、yaml、json、toml 等）
- 配置文件给出完整示例
- 验证命令和预期输出也用代码块展示

### 4. 表格

- 环境要求用表格列出（软件名、最低版本、安装命令）
- 配置项说明用表格（变量名、说明、默认值、是否必须）
- 常见问题用表格（现象、原因、解决方案）

## 教程结构

### 1. 开头（2-3 句话）
- 一句话说清楚这个教程要做什么："这篇教程带你从零把 [项目名] 跑起来，预计 [X] 分钟"
- 说清楚前置条件（需要什么操作系统、什么软件、什么版本）
- 如果有项目效果截图，在这里展示一张，让读者知道最终效果

### 2. 环境准备
- 用表格列出所有需要安装的软件和版本要求
- 每个软件给出安装命令（覆盖 macOS / Linux / Windows）
- 给出验证命令（如 `node -v`），告诉读者应该看到什么输出

### 3. 快速开始（最小可运行版本）
- 用 Mermaid 流程图展示整体步骤概览
- 从 git clone 到第一次成功运行的完整步骤
- 每一步都是可以直接复制粘贴的命令
- 每一步后面都说明"做完这步你应该看到..."
- 如果有 Docker 方式，优先给 Docker 方式（最简单），然后再给手动方式
- 成功运行后，如果有效果截图，在这里展示

### 4. 配置详解
- 用表格列出所有配置文件和环境变量
- 每个配置项说明：是什么、默认值、什么时候需要改
- 给出一个完整的配置示例文件

### 5. 常见部署方式
- 用 Mermaid 画出部署架构图
- 根据项目实际情况，选择适用的部署方式详细说明
- 每种方式都给出完整的命令和配置文件

### 6. 踩坑指南
- 用表格列出最常见的 5-10 个问题和解决方案
- 格式："问题：[现象] → 原因：[为什么] → 解决：[具体命令]"
- 这部分越详细越好，这是教程最有价值的部分

### 7. 进阶配置（可选）
- 性能优化建议
- 监控和日志配置
- 备份和恢复
- CI/CD 集成

### 8. 总结
- 回顾做了什么
- 给出下一步学习建议
- 推荐相关资源

## 写作铁律

1. **每个命令都必须能直接复制运行**，不要用伪代码或省略号
2. **每个步骤后都要有验证方法**："做完这步，运行 `xxx` 应该看到 `yyy`"
3. **覆盖多平台**：至少覆盖 macOS 和 Linux，Windows 如果适用也要覆盖
4. **不要编造**：所有命令、配置、路径必须基于提供的素材。如果素材不足，诚实说明"需要查看项目文档确认"
5. **字数**：3000-8000 字，重点在步骤的完整性和踩坑指南
6. **代码块**：大量使用，每个都标注语言类型（bash、yaml、json、toml 等）
7. **Mermaid 图**：至少 2 个（部署架构图 + 流程图），用 ```mermaid 代码块
8. **表格**：至少 2 个（环境要求表 + 配置项表或踩坑表）
9. **README 图片**：如果 readmeImages 中有效果截图，在合适位置引用。不要编造图片 URL
10. **中文撰写**，命令和配置保留英文原文
11. **禁止 AI 套话**：禁止"值得关注""不容错过""强大的""优秀的"。用事实说话。
12. **视觉节奏**：每 300-500 字之间应该有一个视觉元素，避免纯文字墙
13. **如果项目不适合部署**（比如纯库、纯数据集），就写"集成实践教程"——怎么在自己的项目中引入和使用它

直接输出 Markdown 教程内容，不要包含任何 JSON 包装或额外说明。
"""


# ==================== 第四轮：文章润色 Prompt ====================

# 润色通用头部（角色 + 原文 + 数据 + 输出格式）
_POLISH_HEADER = """你是原文的高级编辑，你的任务是对一篇已有的技术文章进行**实质性润色**，让它更好。

## 关于你的角色

你是一位资深技术编辑兼内容策略师。你不是简单地改几个错别字——你要让文章在以下维度有明显提升：
1. **内容深度**：补充原文遗漏的技术细节、使用场景、注意事项
2. **视觉丰富度**：增加 Mermaid 图表、代码示例、对比表格
3. **可读性**：优化段落结构、消除 AI 套话、让语言更自然
4. **时效性**：更新数据、补充最新信息

你的原则是：润色后的文章必须让读者能明显感受到"比上一版好了"。

## 原文（需要润色的文章）

{original_article}

## 项目最新数据变化

{data_diff}

## 结构化分析结果（参考）

{analysis_result}

## 最新采集数据（参考）

{extra_data}
"""

# 润色通用指令（数据更新 + 图文 + 语言 + 保留原则 + 输出格式）
_POLISH_COMMON_INSTRUCTIONS = """
### 数据更新
- 如果 star/fork 数据有变化，更新文中所有引用的数字
- 如果有新的 release 版本，在合适位置补充版本信息
- 如果有新的全网文章，在合适位置自然引用其观点

### 更新摘要（必须）
在文章最开头（标题之后、正文之前）插入一个"📌 更新摘要"段落，用 2-4 句话说明本次润色更新了哪些内容。格式：

> 📌 **更新摘要**（{current_date}）：简要说明本次更新了什么...

### 图文丰富
- 如果原文 Mermaid 图少于 3 个，补充到至少 3 个
- 如果有新的 README 截图（readmeImages），在合适位置插入
- 确保视觉节奏：每 300-500 字之间有一个视觉元素
- 如果存在连续超过 500 字的纯文字段落，插入合适的视觉元素打断

### 语言质量
- 消除 AI 套话：值得关注、不容错过、强大的、优秀的、总的来说、综上所述、旨在提供、致力于
- 用具体数字替代模糊描述
- 让语气更像跟朋友聊天，不像写报告

### 保留原则
- **保留原文的整体结构**（章节顺序、标题层级）
- **保留原文的语气风格**
- **保留原文的核心观点**
- 不要删除原文中有价值的内容
- 不要改变文章类型

### 数据截止标注
在文章末尾更新或添加：
> *数据截止：{current_date}*

## 输出要求

返回 JSON 格式（不要包含 JSON 之外的任何文字）：

{{
  "content": "润色后的完整 Markdown 文章内容（必须与原文有明显差异，不能只改几个字）",
  "polishSummary": "一句话描述本次润色做了什么（如：更新了 star 数据至 5.2k，补充了 Redis 缓存架构图和部署踩坑指南，优化了竞品对比表格）"
}}
"""

# ==================== 深度解析文章（analysis）润色专属指令 ====================

_POLISH_ANALYSIS_PROMPT = _POLISH_HEADER + """
## 润色指令 — 深度解析文章（严格遵守）

这是一篇**深度解析**类文章，润色重点在于：加深技术分析、补充生态洞察、强化观点判断、评估风险与可持续性。

### 1. 架构分析深化
- 如果原文停留在"模块 A 调用模块 B"的表面，补充设计决策的 trade-off：为什么选 X 不选 Y？代价是什么？
- 如果缺少 Mermaid 架构图或图过于简单，重新绘制更详细的版本
- 引用具体源码文件路径支撑分析（从 projectStructure 获取）

### 2. 竞品对比与生态定位
- 如果竞品对比只是"A 比 B 快"这种空话，补充具体维度：API 风格、生态规模（下载量）、维护活跃度、学习曲线
- 如果有新竞品出现（从最新采集数据或全网文章发现），补充到对比中
- 给出明确选型建议："场景 X 选 A，场景 Y 选 B"

### 3. 社区与 Issues 洞察
- 从 issuesTopics 提取社区热点，补充"社区在讨论什么"：常见 issue 类型、用户痛点、维护者响应速度
- 如果有新的全网文章（webArticles），自然引用其观点

### 4. 技术趋势关联
- 将项目放到 AI、云原生、边缘计算、WebAssembly 等趋势中定位
- 基于 commit 频率、roadmap、社区规模判断项目走向
- 如果原文"深度思考"过于泛泛，用具体数据和趋势替代

### 5. 代码质量演进
- 如果有新 release，分析版本间变化（新功能、破坏性变更、性能改进）
- 如果原文代码示例只有 Hello World，补充一个进阶用法

### 6. TL;DR 与决策辅助
- 在更新摘要之后补充或优化 TL;DR（3-5 句话概括核心结论）
- 如果涉及选型，补充决策树或对比表格
- 标注难度级别（入门/中级/高级）及前置知识

### 7. 安全与风险评估
- 评估项目安全实践：依赖审计、CVE 历史、是否有 SECURITY.md
- 补充供应链安全：依赖数量、是否有已知漏洞依赖、是否启用 Dependabot/Renovate
- 如果项目处理敏感数据（认证、支付、加密），评估安全实现合理性
- 补充 LICENSE 合规性：许可证类型、商用限制、传染性风险

### 8. 性能与基准数据
- "性能好"必须替换成具体 benchmark 数字，没有数据就标注"暂无公开 benchmark"
- 如果 README 或全网文章有 benchmark，确保引用到文章中
- 补充资源占用分析：内存、CPU、启动时间、包体积等可量化指标
- 竞品 benchmark 对比用表格呈现

### 9. 维护健康度与可持续性
- 从 commitFrequency 分析活跃度趋势（加速 / 平稳 / 衰退）
- 分析核心维护者数量（bus factor）：单人项目还是团队支撑
- 评估 issue 响应速度、PR 合并速度、stale issues 积压情况
- 给出明确判断："活跃维护中" / "维护放缓，建议观望" / "基本停滞"

### 10. 源码导读强化
- 如果原文只列了文件名没说"能学到什么"，必须补充
- 每个推荐文件说明：用了什么设计模式、解决了什么问题、巧妙之处
- 补充优先级建议："如果只有 30 分钟，先读这个文件"
- 值得学习的测试写法、CI 配置、文档组织方式也可提及

### 11. 适用边界与反面场景
- 补充明确的"不适合"场景：什么规模、什么需求下不该选这个项目
- 列出已知技术限制：不支持的平台、不兼容的版本、性能天花板
- 评估 API 稳定性风险（breaking changes 历史）
- 给出诚实建议："如果需求是 X，建议看 Y 而不是这个"

### 12. 图表与视觉丰富度
- Mermaid 图少于 3 个就补充，竞品对比用文字描述的改成表格或象限图
- 架构分析只有文字没有图的，补充 Mermaid 架构图
- 连续超过 500 字的纯文字段落，用图表或代码块打断
""" + _POLISH_COMMON_INSTRUCTIONS

# ==================== 实践教程文章（tutorial）润色专属指令 ====================

_POLISH_TUTORIAL_PROMPT = _POLISH_HEADER + """
## 润色指令 — 实践教程文章（严格遵守）

这是一篇**实践部署教程**类文章，润色重点在于：确保命令可运行、补充踩坑指南、更新配置模板、覆盖多环境差异、强化生产可用性。

### 1. 命令与版本验证
- 检查原文中所有安装命令、配置命令是否匹配项目最新版本
- 如果有新的 release 版本，更新所有涉及版本号的命令（如 `npm install xxx@1.2.3`）
- 检查 Docker 镜像标签、包管理器命令是否仍然有效
- 如果原文的"环境准备"表格中的版本号过旧，更新到最新推荐版本

### 2. 踩坑指南扩充
- 从最新采集数据的 issuesTopics 中提取用户最常遇到的部署/使用问题
- 补充至少 2-3 个新的踩坑场景到"踩坑指南"章节
- 每个踩坑场景必须包含：现象描述、原因分析、解决命令
- 如果原文的踩坑指南少于 5 条，扩充到至少 5 条

### 3. 配置模板更新
- 检查原文中的配置文件示例是否完整（环境变量、docker-compose.yml、nginx.conf 等）
- 如果项目有新的配置项（从最新 README 或 release notes 中发现），补充到配置详解中
- 确保每个配置项都有说明：是什么、默认值、什么时候需要改
- 如果原文缺少完整的 `.env.example`，补充一个

### 4. 部署方式补充
- 检查是否有新的部署方式（如项目新增了 Helm Chart、Docker Compose v2、一键部署脚本）
- 如果原文只覆盖了一种部署方式，考虑补充第二种（如 Docker + 手动部署）
- 更新部署架构的 Mermaid 图，确保反映最新的组件关系
- 如果有云平台一键部署按钮（Vercel、Railway、Render 等），补充说明

### 5. 版本迁移指导
- 如果有新的大版本发布，补充"从 vX 升级到 vY"的迁移步骤
- 列出破坏性变更和对应的修改方法
- 如果原文没有版本迁移章节且项目有多个大版本，考虑新增

### 6. 验证步骤强化
- 检查每个操作步骤后是否都有"做完这步你应该看到..."的验证说明
- 如果缺少验证步骤，补充具体的验证命令和预期输出
- 在"快速开始"章节末尾补充一个完整的健康检查清单
- 标注教程预计耗时和难度级别（如"预计 15 分钟，需要 Docker 基础"）

### 7. 多环境适配与差异说明
- 检查原文是否覆盖了 macOS / Linux / Windows 三平台的命令差异，缺少的要补充
- 如果原文只写了一种 OS 的命令，补充其他平台的等效命令或注意事项
- 补充 ARM vs x86 架构差异（尤其是 Docker 镜像、编译型工具）
- 如果涉及 Python/Node 版本管理，补充 nvm/pyenv 等版本切换提示

### 8. 安全与生产加固
- 检查原文是否有"开发环境 vs 生产环境"的区分说明，没有就补充
- 补充生产部署的安全加固建议：HTTPS 配置、环境变量不要硬编码、默认密码必须修改
- 如果有 Docker 部署，补充非 root 用户运行、镜像瘦身、健康检查配置
- 补充数据备份和恢复的基本步骤

### 9. 性能调优与监控入门
- 如果原文缺少性能调优章节，补充 2-3 条最关键的调优建议（基于项目类型）
- 补充基本的监控手段：日志查看命令、健康检查端点、资源占用检查
- 如果项目有内置的 metrics/dashboard，提示读者如何开启

### 10. 快速诊断流程图
- 补充一个 Mermaid 决策流程图："启动失败？→ 检查端口占用 → 检查环境变量 → 检查依赖版本 → ..."
- 把踩坑指南中的问题组织成一个可视化的排查路径，而不只是平铺的表格

### 11. 一键脚本与自动化
- 如果项目提供了 Makefile、justfile、taskfile 等自动化工具，在教程中优先推荐使用
- 如果没有，建议读者用哪些命令组合可以简化日常操作（如 alias、shell script）
- 补充 CI/CD 集成的最小示例（GitHub Actions / GitLab CI 的 yaml 片段）

### 12. 依赖冲突与版本锁定
- 检查原文中的 `npm install` / `pip install` 是否锁定了版本号，没锁的建议补上
- 如果项目有 lock 文件（package-lock.json、poetry.lock），提醒读者不要删除
- 补充"如果安装报错"的通用排查思路：清缓存、降版本、换镜像源
- 如果涉及 native 编译依赖（如 node-gyp、gcc），补充系统级依赖安装命令

### 13. 数据持久化与状态管理
- 检查原文是否说明了数据存储位置（数据库文件、volume 挂载、本地目录）
- 如果用 Docker，检查是否有 volume 映射说明，没有就补充
- 补充"如何清空数据重新开始"和"如何迁移数据到另一台机器"的步骤
- 如果有 SQLite 等嵌入式数据库，提醒并发限制和备份方式

### 14. 网络与代理环境适配
- 如果项目需要从 GitHub/npm/PyPI 下载依赖，补充国内镜像源配置
- 如果涉及 Docker 拉取镜像，补充镜像加速器配置
- 如果项目需要访问外部 API（如 OpenAI、Google），提醒代理配置方式
- 补充离线安装方案（如果可行）

### 15. 教程结构与阅读体验优化
- 检查步骤编号是否连续、是否有跳跃或遗漏
- 检查是否每个"复制粘贴"的代码块都标注了"在哪个目录下执行"
- 如果教程超过 20 步，补充进度检查点（"到这里你应该已经完成了 XX，接下来..."）
- 检查是否有前后矛盾的说明（比如前面说用端口 3000，后面变成 8080）
""" + _POLISH_COMMON_INSTRUCTIONS


# ==================== LLM Service ====================

class LLMService:
    """Anthropic Claude LLM 服务，支持多轮调用：结构化分析 + 文章生成 + 润色"""

    @staticmethod
    def _extract_text(response) -> str:
        """从响应中提取文本内容，跳过 ThinkingBlock 等非文本块"""
        for block in response.content:
            if block.type == 'text':
                return block.text
        raise ValueError('LLM 响应中未找到 text 类型的内容块')

    @staticmethod
    def _get_client():
        """获取 Anthropic 客户端"""
        api_key = current_app.config.get('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError('ANTHROPIC_API_KEY 未配置')

        base_url = current_app.config.get('ANTHROPIC_BASE_URL')
        kwargs = {'api_key': api_key}
        if base_url:
            kwargs['base_url'] = base_url

        return anthropic.Anthropic(**kwargs)

    @staticmethod
    def _build_prompt(raw_data: dict, extra_data: dict) -> str:
        """构建第一轮结构化分析 prompt"""
        project_type = extra_data.get('projectType', 'other')
        detected_language = extra_data.get('detectedLanguage', 'unknown')
        all_languages = extra_data.get('allLanguages', {})

        # 精简 extra_data，避免超长
        slim_extra = LLMService._slim_extra(extra_data)

        # 选择类型专属 prompt
        type_prompt_tpl = _TYPE_PROMPTS.get(project_type, _OTHER_PROMPT)

        # 组装数据头
        header = _DATA_HEADER.format(
            raw_data=json.dumps(raw_data, ensure_ascii=False, default=str)[:12000],
            extra_data=json.dumps(slim_extra, ensure_ascii=False, default=str)[:18000],
            detected_language=detected_language,
            all_languages=json.dumps(all_languages, ensure_ascii=False),
            project_type=project_type,
        )

        # 组装类型专属部分
        type_prompt = type_prompt_tpl.format(
            detected_language=detected_language,
            project_type=project_type,
            common_fields=_COMMON_FIELDS,
            common_tail=_COMMON_TAIL_FIELDS,
            quality_rules=_COMMON_QUALITY,
        )

        return header + '\n' + type_prompt

    @staticmethod
    def _call_llm(prompt: str, max_tokens: int = None) -> tuple[dict, int]:
        """调用 LLM 并返回解析后的 JSON 和 token 数"""
        client = LLMService._get_client()
        model = current_app.config.get('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')
        if max_tokens is None:
            max_tokens = current_app.config.get('ANTHROPIC_MAX_TOKENS', 16384)

        logger.info(f'[LLM] 调用: model={model}, max_tokens={max_tokens}, prompt长度={len(prompt)}')

        with client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            messages=[{'role': 'user', 'content': prompt}],
        ) as stream:
            response = stream.get_final_message()

        raw_text = LLMService._extract_text(response)
        tokens_used = (response.usage.input_tokens or 0) + (response.usage.output_tokens or 0)
        stop_reason = response.stop_reason

        logger.info(f'[LLM] 完成: tokens={tokens_used}, 响应长度={len(raw_text)}, stop_reason={stop_reason}')

        try:
            parsed = LLMService._parse_json(raw_text)
            return parsed, tokens_used
        except ValueError as e:
            # 解析失败时保存调试信息
            logger.error(f'[LLM] JSON 解析失败')
            logger.error(f'[LLM] stop_reason: {stop_reason}')
            logger.error(f'[LLM] 响应前 2000 字符:\n{raw_text[:2000]}')
            logger.error(f'[LLM] 响应后 1000 字符:\n{raw_text[-1000:]}')
            
            import os
            import time
            debug_dir = 'llm_response_debug'
            os.makedirs(debug_dir, exist_ok=True)
            debug_file = os.path.join(debug_dir, f'failed_response_{int(time.time())}.txt')
            with open(debug_file, 'w', encoding='utf-8') as f:
                f.write(f'=== LLM Response Debug ===\n')
                f.write(f'Timestamp: {time.strftime("%Y-%m-%d %H:%M:%S")}\n')
                f.write(f'Response Length: {len(raw_text)} chars\n')
                f.write(f'Tokens Used: {tokens_used}\n')
                f.write(f'Stop Reason: {stop_reason}\n')
                f.write(f'\n=== Full Response ===\n')
                f.write(raw_text)
            logger.error(f'[LLM] 完整响应已保存到: {debug_file}')
            raise

    @staticmethod
    def _enrich_part1_basic(raw_data: dict, extra_data: dict) -> dict:
        """第一段：生成基础信息"""
        project_type = extra_data.get('projectType', 'other')
        detected_language = extra_data.get('detectedLanguage', 'unknown')
        
        # 精简 extra_data
        slim_extra = LLMService._slim_extra(extra_data)
        
        prompt = _PART1_BASIC_PROMPT.format(
            raw_data=json.dumps(raw_data, ensure_ascii=False, default=str)[:10000],
            extra_data=json.dumps(slim_extra, ensure_ascii=False, default=str)[:15000],
            detected_language=detected_language,
            project_type=project_type,
            quality_rules=_COMMON_QUALITY,
        )
        
        parsed, tokens = LLMService._call_llm(prompt, max_tokens=32000)
        logger.info(f'[LLM] 第 1/3 段完成，tokens={tokens}')
        return parsed

    @staticmethod
    def _enrich_part2_technical(raw_data: dict, extra_data: dict, part1: dict) -> dict:
        """第二段：生成技术细节"""
        project_type = extra_data.get('projectType', 'other')
        detected_language = extra_data.get('detectedLanguage', 'unknown')
        
        # 精简 extra_data
        slim_extra = LLMService._slim_extra(extra_data)
        
        # 精简 part1 用于上下文
        part1_summary = {
            'title': part1.get('title', ''),
            'summary': part1.get('summary', ''),
            'category': part1.get('category', ''),
        }
        
        # 获取类型专属字段定义
        type_fields = _PART2_TYPE_FIELDS.get(project_type, _PART2_TYPE_FIELDS['other'])
        
        prompt = _PART2_TECHNICAL_PROMPT.format(
            raw_data=json.dumps(raw_data, ensure_ascii=False, default=str)[:10000],
            extra_data=json.dumps(slim_extra, ensure_ascii=False, default=str)[:15000],
            part1_summary=json.dumps(part1_summary, ensure_ascii=False),
            detected_language=detected_language,
            project_type=project_type,
            type_specific_fields=type_fields,
            quality_rules=_COMMON_QUALITY,
        )
        
        parsed, tokens = LLMService._call_llm(prompt, max_tokens=32000)
        logger.info(f'[LLM] 第 2/3 段完成，tokens={tokens}')
        return parsed

    @staticmethod
    def _enrich_part3_deep(raw_data: dict, extra_data: dict, part1: dict, part2: dict) -> dict:
        """第三段：生成深度分析"""
        project_type = extra_data.get('projectType', 'other')
        detected_language = extra_data.get('detectedLanguage', 'unknown')
        
        # 精简 extra_data（保留项目结构信息）
        slim_extra = LLMService._slim_extra(extra_data)
        
        # 精简 part1 和 part2 用于上下文
        part1_summary = {
            'title': part1.get('title', ''),
            'summary': part1.get('summary', ''),
            'category': part1.get('category', ''),
        }
        
        part2_summary = {
            'techStack': part2.get('techStack', []),
            'architecture': part2.get('architecture', ''),
        }
        
        prompt = _PART3_DEEP_PROMPT.format(
            raw_data=json.dumps(raw_data, ensure_ascii=False, default=str)[:8000],
            extra_data=json.dumps(slim_extra, ensure_ascii=False, default=str)[:20000],
            part1_summary=json.dumps(part1_summary, ensure_ascii=False),
            part2_summary=json.dumps(part2_summary, ensure_ascii=False),
            detected_language=detected_language,
            project_type=project_type,
            quality_rules=_COMMON_QUALITY,
        )
        
        parsed, tokens = LLMService._call_llm(prompt, max_tokens=48000)
        logger.info(f'[LLM] 第 3/3 段完成，tokens={tokens}')
        return parsed

    @staticmethod
    def enrich(raw_data: dict, extra_data: dict) -> dict:
        """分段生成：将大的 JSON 拆分成 3 个部分，避免截断"""
        logger.info('[LLM] 开始分段生成流程')
        
        # 第一段：基础信息
        logger.info('[LLM] === 第 1/3 段：基础信息 ===')
        part1 = LLMService._enrich_part1_basic(raw_data, extra_data)
        
        # 第二段：技术细节
        logger.info('[LLM] === 第 2/3 段：技术细节 ===')
        part2 = LLMService._enrich_part2_technical(raw_data, extra_data, part1)
        
        # 第三段：深度分析
        logger.info('[LLM] === 第 3/3 段：深度分析 ===')
        part3 = LLMService._enrich_part3_deep(raw_data, extra_data, part1, part2)
        
        # 合并三个部分
        logger.info('[LLM] 合并三个部分')
        merged = {**part1, **part2, **part3}
        
        # 注入元信息
        project_type = extra_data.get('projectType', 'other')
        detected_language = extra_data.get('detectedLanguage', 'unknown')
        merged['_projectType'] = project_type
        merged['_detectedLanguage'] = detected_language
        
        logger.info('[LLM] 分段生成完成')
        
        return {
            'parsed': merged,
            'raw_response': '(分段生成，无单一响应)',
            'model': current_app.config.get('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514'),
            'tokens_used': 0,  # 总 token 数在各段中累加
        }

    @staticmethod
    def generate_article(raw_data: dict, extra_data: dict, analysis_result: dict) -> dict:
        """第二轮：专属文章生成，获得完整 token 预算和第一轮分析作为上下文"""
        client = LLMService._get_client()
        model = current_app.config.get('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')
        article_max_tokens = current_app.config.get('ANTHROPIC_ARTICLE_MAX_TOKENS', 16384)

        # 精简数据用于文章生成
        slim_extra = LLMService._slim_extra(extra_data)

        # 精简 analysis_result，去掉不需要的元字段
        slim_analysis = {k: v for k, v in analysis_result.items()
                         if not k.startswith('_') and k not in ('raw_response',)}

        prompt = _ARTICLE_PROMPT.format(
            raw_data=json.dumps(raw_data, ensure_ascii=False, default=str)[:12000],
            extra_data=json.dumps(slim_extra, ensure_ascii=False, default=str)[:18000],
            analysis_result=json.dumps(slim_analysis, ensure_ascii=False, default=str)[:20000],
        )

        logger.info(f'[LLM] 第二轮文章生成: model={model}, max_tokens={article_max_tokens}, prompt长度={len(prompt)}')

        with client.messages.stream(
            model=model,
            max_tokens=article_max_tokens,
            messages=[{'role': 'user', 'content': prompt}],
        ) as stream:
            response = stream.get_final_message()

        article_text = LLMService._extract_text(response)
        tokens_used = (response.usage.input_tokens or 0) + (response.usage.output_tokens or 0)
        stop_reason = response.stop_reason

        logger.info(f'[LLM] 第二轮完成: tokens={tokens_used}, 文章长度={len(article_text)}, stop_reason={stop_reason}')

        return {
            'article': article_text.strip(),
            'model': model,
            'tokens_used': tokens_used,
        }

    @staticmethod
    def generate_tutorial(raw_data: dict, extra_data: dict, analysis_result: dict) -> dict:
        """第三轮：实践部署教程生成"""
        client = LLMService._get_client()
        model = current_app.config.get('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')
        article_max_tokens = current_app.config.get('ANTHROPIC_ARTICLE_MAX_TOKENS', 16384)

        slim_extra = LLMService._slim_extra(extra_data)
        slim_analysis = {k: v for k, v in analysis_result.items()
                         if not k.startswith('_') and k not in ('raw_response',)}

        prompt = _TUTORIAL_PROMPT.format(
            raw_data=json.dumps(raw_data, ensure_ascii=False, default=str)[:12000],
            extra_data=json.dumps(slim_extra, ensure_ascii=False, default=str)[:18000],
            analysis_result=json.dumps(slim_analysis, ensure_ascii=False, default=str)[:20000],
        )

        logger.info(f'[LLM] 第三轮教程生成: model={model}, max_tokens={article_max_tokens}, prompt长度={len(prompt)}')

        with client.messages.stream(
            model=model,
            max_tokens=article_max_tokens,
            messages=[{'role': 'user', 'content': prompt}],
        ) as stream:
            response = stream.get_final_message()

        tutorial_text = LLMService._extract_text(response)
        tokens_used = (response.usage.input_tokens or 0) + (response.usage.output_tokens or 0)
        stop_reason = response.stop_reason

        logger.info(f'[LLM] 第三轮完成: tokens={tokens_used}, 教程长度={len(tutorial_text)}, stop_reason={stop_reason}')

        return {
            'article': tutorial_text.strip(),
            'model': model,
            'tokens_used': tokens_used,
        }

    @staticmethod
    def polish_article(original_content: str, data_diff: str,
                       extra_data: dict, analysis_result: dict,
                       article_type: str = 'analysis',
                       custom_instructions: str = '') -> dict:
        """文章润色：基于原文 + 数据变化生成润色版本，根据文章类型选择不同润色策略"""
        from datetime import date
        client = LLMService._get_client()
        model = current_app.config.get('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')
        article_max_tokens = current_app.config.get('ANTHROPIC_ARTICLE_MAX_TOKENS', 16384)

        slim_extra = LLMService._slim_extra(extra_data)
        slim_analysis = {k: v for k, v in analysis_result.items()
                         if not k.startswith('_') and k not in ('raw_response',)}

        current_date = date.today().strftime('%Y-%m-%d')

        # 根据文章类型选择润色 prompt
        polish_prompt_tpl = _POLISH_TUTORIAL_PROMPT if article_type == 'tutorial' else _POLISH_ANALYSIS_PROMPT

        prompt = polish_prompt_tpl.format(
            original_article=original_content[:20000],
            data_diff=data_diff,
            analysis_result=json.dumps(slim_analysis, ensure_ascii=False, default=str)[:15000],
            extra_data=json.dumps(slim_extra, ensure_ascii=False, default=str)[:15000],
            current_date=current_date,
        )

        # 注入用户自定义润色方向
        if custom_instructions:
            prompt += f'\n\n## 用户自定义润色方向（最高优先级，必须严格遵守）\n\n{custom_instructions}\n'

        logger.info(f'[LLM] 文章润色 ({article_type}): model={model}, max_tokens={article_max_tokens}, prompt长度={len(prompt)}')

        with client.messages.stream(
            model=model,
            max_tokens=article_max_tokens,
            messages=[{'role': 'user', 'content': prompt}],
        ) as stream:
            response = stream.get_final_message()

        raw_text = LLMService._extract_text(response)
        tokens_used = (response.usage.input_tokens or 0) + (response.usage.output_tokens or 0)
        stop_reason = response.stop_reason

        logger.info(f'[LLM] 润色完成: tokens={tokens_used}, 响应长度={len(raw_text)}, stop_reason={stop_reason}')

        parsed = LLMService._parse_json(raw_text)

        return {
            'content': parsed.get('content', ''),
            'polish_summary': parsed.get('polishSummary', ''),
            'model': model,
            'tokens_used': tokens_used,
        }

    @staticmethod
    def _slim_extra(extra_data: dict) -> dict:
        """精简 extra_data，保留关键信息，避免 prompt 过长"""
        slim = {}
        # 保留关键字段
        keep_keys = [
            'projectType', 'detectedLanguage', 'allLanguages',
            'repoInfo', 'commitFrequency', 'issuesTopics',
            'recentReleases', 'dependencies', 'devDependencies',
            'projectStructure', 'deployFiles', 'ciFiles',
            'webArticles', 'readmeImages',
        ]
        for key in keep_keys:
            if key in extra_data and extra_data[key]:
                slim[key] = extra_data[key]

        # README 截断
        readme = extra_data.get('readme', '')
        if readme:
            slim['readme'] = readme[:6000]

        return slim

    @staticmethod
    def _parse_json(text: str) -> dict:
        """从 LLM 响应中提取 JSON"""
        # 1. 尝试直接解析
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 2. 尝试提取 ```json ... ``` 代码块
        match = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # 3. 跳过 <thinking> 标签后的内容
        thinking_end = text.find('</thinking>')
        if thinking_end != -1:
            after_thinking = text[thinking_end + len('</thinking>'):].strip()
            
            # 3.1 尝试提取 thinking 后的代码块
            match = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', after_thinking, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    pass
            
            # 3.2 尝试直接解析 thinking 后的内容
            try:
                return json.loads(after_thinking)
            except json.JSONDecodeError:
                pass
            
            # 3.3 提取 thinking 后第一个 { 到最后一个 }
            first_brace = after_thinking.find('{')
            last_brace = after_thinking.rfind('}')
            if first_brace != -1 and last_brace > first_brace:
                try:
                    return json.loads(after_thinking[first_brace:last_brace + 1])
                except json.JSONDecodeError:
                    pass

        # 4. 尝试找到第一个 { 和最后一个 }（全文）
        first_brace = text.find('{')
        last_brace = text.rfind('}')
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            try:
                return json.loads(text[first_brace:last_brace + 1])
            except json.JSONDecodeError as e:
                logger.error(f'[LLM] 大括号提取后解析失败: {e}')

        # 所有尝试都失败，输出详细错误信息
        logger.error(f'[LLM] JSON 解析完全失败')
        logger.error(f'[LLM] 响应总长度: {len(text)} 字符')
        logger.error(f'[LLM] 响应前 2000 字符:\n{text[:2000]}')
        logger.error(f'[LLM] 响应后 1000 字符:\n{text[-1000:]}')
        raise ValueError('无法从 LLM 响应中解析 JSON')
