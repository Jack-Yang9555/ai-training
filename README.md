# AI 通识培训平台

本仓库同时维护 React 高保真 Demo、AI 通识实训平台、培训与课程资料、正式交付物及历史归档。主要应用分别位于 [`demo/`](./demo/) 和 [`AI通识实训平台-demo/`](./AI通识实训平台-demo/)，培训方案和配套资料统一从 [`实训资料/`](./实训资料/) 进入。

## 目录说明

| 目录 | 内容 |
| --- | --- |
| `demo/` | React Demo、测试、模拟数据及 Demo 自身的产品说明 |
| `AI通识实训平台-demo/` | 三日实训任务与成果闭环 Demo |
| `实训资料/` | 培训方案、课程与测评、实训设计、产品与交付文件 |
| `scripts/` | 可重复运行的维护脚本，按测评题库、文档生成等用途分组 |
| `需求文档/` | 原始需求与参考输入 |
| `output/` | 临时 Word、PDF 和浏览器验收等可再生成产物 |
| `archive/` | 已退出当前工作流、但需要保留追溯的阶段性文件 |
| `tmp/` | 可再生成的临时工作文件，已由 Git 忽略 |

## 开发入口

进入 `demo/` 后执行：

```bash
npm install
npm run dev
```

常用验证命令：

```bash
npm run typecheck
npm run test
npm run build
```

## 文件管理约定

1. `demo/` 只保存产品运行所需源码、测试、模拟数据和 Demo 产品说明。
2. 可维护的培训、课程、测评及交付文件放入 `实训资料/`，具体分类见 [`实训资料/README.md`](./实训资料/README.md)。
3. 需版本管理的正式 Word 放入 `实训资料/产品与交付/`；临时 Word、PDF 和浏览器验收产物分别放入 `output/word`、`output/pdf` 和 `output/playwright`。
4. 仍在使用的维护脚本放入 `scripts/`；完成使命的阶段性脚本按日期和任务移入 `archive/`。
5. 不清理未确认归属的文件；修改前先运行 `git status --short`。
