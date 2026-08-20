# 维护脚本

本目录只存放需要版本管理、能够重复运行的生成或校验脚本。一次性补丁、浏览器用户目录、日志、预检 PDF、页面渲染图和依赖缓存统一放在仓库根目录的 `tmp/`；`tmp/` 已由 `.gitignore` 排除，可在任务完成后整体清理。

## Word 文档生成器

以下脚本使用脚本位置自动定位仓库根目录，可以从任意工作目录运行。正式 Word 文件统一输出到 `实训资料/产品与交付/`：

| 脚本 | 输出文件 |
| --- | --- |
| `generate_platform_parameters_docx.py` | `实训资料/产品与交付/AI通识培训与教学应用平台技术参数及功能要求.docx` |
| `generate_procurement_parameter_spec_docx.py` | `实训资料/产品与交付/AI通识培训与教学应用平台技术参数说明书.docx` |
| `generate_quote_docx.py` | `实训资料/产品与交付/AI通识培训与教学应用平台项目报价单.docx` |
| `generate_school_product_parameter_docx.py` | `实训资料/产品与交付/AI通识培训与教学应用平台产品参数说明书.docx` |

运行前需安装 `python-docx`。示例：

```powershell
python scripts/文档生成/generate_quote_docx.py
```

生成器会直接覆盖对应的正式 Word 文件。修改脚本后应先在独立分支或备份环境中预检版式，再更新正式交付物。
