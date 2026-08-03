import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { DemoProvider } from "./demoState";
import { EvidenceCenterProvider } from "./evidenceCenter";
import { TeachingOperationsProvider } from "./teachingOperations";

const renderApp = () =>
  render(
    <DemoProvider>
      <EvidenceCenterProvider>
        <TeachingOperationsProvider>
          <App />
        </TeachingOperationsProvider>
      </EvidenceCenterProvider>
    </DemoProvider>,
  );

const enterTeacherPrepare = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  await user.click(screen.getByRole("button", { name: "智能备课" }));
};

const enterTeacherLearning = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  await user.click(screen.getByRole("button", { name: "查看班级态势" }));
};

describe("启境培训能力主线", () => {
  it("教师二级入口按任务流排列，知识图谱收进课程资源", async () => {
    const user = userEvent.setup();
    renderApp();
    await enterTeacherPrepare(user);
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs.slice(0, 4)).toEqual([
      "智能备课选择标准课",
      "教学实施确认与发布",
      "课程资源标准 + AI",
      "AI助教陪伴与答疑",
    ]);
    expect(
      screen.getByRole("heading", { name: "智能备课", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "知识图谱" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /课程资源/ }));
    await user.click(screen.getByRole("tab", { name: "知识结构" }));
    const graphButton = screen.getByRole("button", {
      name: "生成课程知识图谱",
    });
    expect(graphButton).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "解析并完成入库" }));
    await waitFor(() => expect(graphButton).toBeEnabled(), { timeout: 2500 });
    await user.click(graphButton);
    await waitFor(
      () => expect(screen.getByText(/课程知识图谱已生成/)).toBeInTheDocument(),
      { timeout: 2500 },
    );
  });

  it("教师可基于标准课生成情境方案、采纳回流并发布", async () => {
    const user = userEvent.setup();
    renderApp();
    await enterTeacherPrepare(user);
    await user.click(
      screen.getByRole("button", { name: /以此课为基线设置情境/ }),
    );
    await user.click(screen.getByRole("button", { name: /企业培训/ }));
    await user.selectOptions(screen.getByLabelText("本次时长"), "60");
    await user.selectOptions(screen.getByLabelText("目标难度"), "4");
    await user.clear(screen.getByLabelText("教学对象"));
    await user.type(screen.getByLabelText("教学对象"), "新入职视觉设计师");
    await user.click(screen.getByRole("button", { name: /生成情境化方案/ }));
    await waitFor(
      () => expect(screen.getByText("情境化方案已生成")).toBeInTheDocument(),
      { timeout: 2500 },
    );
    expect(screen.getByText("60 分钟 · 线下课堂")).toBeInTheDocument();
    expect(screen.getByText("L4 · 基础一般")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /采纳方案并进入教学实施/ }),
    );
    expect(
      screen.getByRole("heading", { name: "教学实施", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/从自然语言描述到高质量视觉作品 · 企业培训/),
    ).toBeInTheDocument();
    expect(screen.getByText(/份关联资源/)).toBeInTheDocument();
    expect(screen.getByText("适配知识点")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "导入案例" }));
    expect(
      screen.getByRole("button", { name: /导入案例 · AI适配版/ }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /AI 补充/ }));
    expect(
      screen.getByRole("heading", { name: "4 道分层题" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "发布教学任务" }));
    await user.click(screen.getByRole("tab", { name: /课程资源/ }));
    await user.click(screen.getByRole("tab", { name: "AI 生成" }));
    expect(
      screen.getByText("从自然语言描述到高质量视觉作品 · 情境化教案"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("正式")).toHaveLength(4);
  });

  it("学生角色保留教、学、测、评但看不到教师管理入口", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "学生" }));
    expect(
      screen.getByRole("navigation", { name: "学生教、学、测、评功能" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "我的学习台", level: 1 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "继续学习" }));
    expect(screen.getByRole("tab", { name: "个性化学习" })).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "智能组卷" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /课程资源/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("研 · AI 研究")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /AI 研究/ }),
    ).not.toBeInTheDocument();
  });

  it("教师学习促进按班级态势、掌握诊断、分层干预组织且不伪装成学生", async () => {
    const user = userEvent.setup();
    renderApp();
    await enterTeacherLearning(user);
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs.slice(0, 3)).toEqual([
      "班级态势过程趋势",
      "掌握诊断目标与证据",
      "分层干预支持与回流",
    ]);
    expect(screen.getByRole("button", { name: "本单元" })).toHaveClass(
      "active",
    );
    expect(
      screen.getByRole("heading", { name: "班级态势", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.queryByText("保存本次迭代")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "学生画像" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "助教答疑洞察" }),
    ).not.toBeInTheDocument();
  });

  it("教师发布分层任务后学生可见并能完成回流", async () => {
    const user = userEvent.setup();
    renderApp();
    await enterTeacherLearning(user);
    await user.click(screen.getByRole("tab", { name: /掌握诊断/ }));
    await waitFor(
      () =>
        expect(
          screen.getByRole("heading", { name: "掌握结论必须能回到证据" }),
        ).toBeInTheDocument(),
      { timeout: 2500 },
    );
    await user.click(screen.getByRole("button", { name: /生成分层建议/ }));
    await waitFor(
      () =>
        expect(
          screen.getByRole("heading", { name: "分层干预", level: 1 }),
        ).toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(screen.getByText("36 名学习者全部纳入")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /预览并发布给 8 人/ }));
    await user.click(screen.getByRole("button", { name: "学生" }));
    await user.click(screen.getByRole("button", { name: "继续学习" }));
    expect(screen.getByText("偏差诊断补强包")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /完成并回传/ }));
    expect(screen.getByText("已完成")).toBeInTheDocument();
    expect(screen.queryByText("班级态势")).not.toBeInTheDocument();
  });

  it("AI批改使用唯一功能标题，并在空状态与结果状态保持唯一导入主操作", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();
    await user.click(screen.getByRole("button", { name: "批改作业" }));
    expect(
      screen.getByRole("heading", { name: "AI 批改", level: 1 }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("main h1")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "暂无待批改作业", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "导入并批改 3 份作业" }),
    ).toHaveLength(1);
    await user.click(
      screen.getByRole("button", { name: "导入并批改 3 份作业" }),
    );
    await waitFor(
      () =>
        expect(
          screen.getByRole("button", { name: "继续导入作业" }),
        ).toBeInTheDocument(),
      { timeout: 2500 },
    );
    expect(
      screen.queryByRole("button", { name: "导入并批改 3 份作业" }),
    ).not.toBeInTheDocument();
  });

  it("教师登录后先看到六类核心任务且首页只有一个标题", () => {
    const { container } = renderApp();
    expect(
      screen.getByRole("heading", { name: "教师工作台", level: 1 }),
    ).toBeInTheDocument();
    [
      "教 · 智能教学",
      "学 · 学习促进",
      "测 · 测评管理",
      "评 · 教学诊断",
      "研 · AI 研究",
      "练 · 自由实训",
    ].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
    expect(container.querySelectorAll("main h1")).toHaveLength(1);
  });

  it("教师可进入研究工作台，且研究与自由实训共用同一工具目录", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    await user.click(
      screen.getByRole("button", { name: "进入研究工作台" }),
    );
    expect(
      await screen.findByRole("heading", { name: "AI 研究工作台", level: 1 }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("main h1")).toHaveLength(1);
    expect(
      screen.getByRole("tab", { name: /研究项目/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("四步完成从问题到成果")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /AI 工具/ }));
    expect(screen.getByText("Dify 应用实验台")).toBeInTheDocument();
    expect(screen.getByText("Vibe Coding 工作台")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /自由实训/ }));
    await user.click(screen.getByRole("tab", { name: /工具广场/ }));
    expect(screen.getByText("Dify 应用实验台")).toBeInTheDocument();
    expect(screen.getByText("Vibe Coding 工作台")).toBeInTheDocument();
  });

  it("选择班级后教学、学习促进和教学诊断继承同一上下文", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "进入课堂" }));
    expect(
      screen.getByRole("heading", { name: "教学实施", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /人工智能 2401 班生成式视觉设计/,
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /学习促进/ }));
    expect(
      screen.getByRole("heading", { name: "班级态势", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("参与度 94% · 8 项需要关注")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /教学诊断/ }));
    expect(
      screen.getByRole("heading", { name: "教学报告", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("第 3 课课堂诊断")).toBeInTheDocument();
  });

  it("顶部切换班级会清除不兼容测评并显示新班级任务", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "批改作业" }));
    await user.click(
      screen.getByRole("button", {
        name: /人工智能 2401 班生成式视觉设计/,
      }),
    );
    await user.click(screen.getByRole("button", { name: /人工智能 2402 班/ }));
    expect(
      screen.getByRole("heading", { name: "测评管理", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "单元二 · 提示词结构测评",
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "AI 批改", level: 1 }),
    ).not.toBeInTheDocument();
  });

  it("不同状态试卷分别进入组卷、考试进度和评分复核", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /测评管理/ }));
    await user.click(screen.getByRole("button", { name: "完成组卷" }));
    expect(
      screen.getByRole("heading", { name: "智能组卷", level: 1 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "重置演示" }));
    await user.click(screen.getByRole("button", { name: /测评管理/ }));
    await user.click(screen.getByRole("button", { name: "查看考试进度" }));
    expect(
      screen.getByRole("heading", { name: "考试进度", level: 1 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "重置演示" }));
    await user.click(screen.getByRole("button", { name: /测评管理/ }));
    await user.click(screen.getAllByRole("button", { name: "查看评分复核" })[0]);
    expect(
      screen.getByRole("heading", { name: "评分复核", level: 1 }),
    ).toBeInTheDocument();
  });

  it("学生首页按课程和测评进入工作区，重置后回到教师首页", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();
    await user.click(screen.getByRole("button", { name: "学生" }));
    expect(
      screen.getByRole("heading", { name: "我的学习台", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "批改作业" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "继续测评" }));
    expect(
      screen.getByRole("heading", { name: "我的测评", level: 1 }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("main h1")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "重置演示" }));
    expect(
      screen.getByRole("heading", { name: "教师工作台", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /选择课程与班级/ }),
    ).toBeInTheDocument();
  });

  it("教师 AI 能力无需班级上下文且保持唯一功能标题", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();
    await user.click(screen.getByRole("button", { name: /教学诊断/ }));
    await user.click(screen.getByRole("button", { name: "查看能力报告" }));
    expect(
      screen.getByRole("heading", { name: "教师 AI 能力", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("跨课程任务产物 · 不依赖班级")).toBeInTheDocument();
    expect(container.querySelectorAll("main h1")).toHaveLength(1);
  });

  it("学生伦理课程展示独立导学内容，图谱与助教不复用主课程", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();
    await user.click(screen.getByRole("button", { name: "学生" }));
    await user.click(screen.getByRole("button", { name: /选择我的课程/ }));
    await user.click(screen.getByRole("button", { name: /AI 创作伦理与安全/ }));
    await user.click(screen.getByRole("button", { name: "查看课程导学" }));
    expect(
      screen.getByRole("heading", { name: "课程导学", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("识别 AI 创作中的版权与隐私风险")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "我的知识图谱" }));
    expect(
      screen.getByRole("heading", { name: "我的知识图谱", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("尚未生成知识图谱")).toBeInTheDocument();
    expect(container.querySelectorAll("main h1")).toHaveLength(1);
  });

  it("学生学习任务练习进度按任务 ID 隔离并可恢复", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "学生" }));
    await user.click(screen.getByRole("button", { name: "继续学习" }));
    expect(screen.getByText("1/2 已完成")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "标记未完成" })[0]);
    expect(screen.getByText("0/2 已完成")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /负向提示词补强练习/ }));
    expect(screen.getByText("0/2 已完成")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /继续完善未来学习空间/ }));
    expect(screen.getByText("0/2 已完成")).toBeInTheDocument();
  });

  it("学生不同测评的答案状态互不复用并能切回恢复", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "学生" }));
    await user.click(screen.getByRole("button", { name: "继续测评" }));
    const submit = screen.getByRole("button", { name: /提交测评/ });
    expect(submit).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: /明确背景层级并加入需要排除的干扰元素/ }),
    );
    expect(submit).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "切换测评" }));
    await user.click(screen.getByRole("button", { name: "开始测评" }));
    expect(screen.getByRole("button", { name: /提交测评/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "切换测评" }));
    await user.click(screen.getByRole("button", { name: "继续测评" }));
    expect(screen.getByRole("button", { name: /提交测评/ })).toBeEnabled();
  });

  it("教师不切换学生身份即可完成摸底并生成个性化培训计划", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getAllByRole("button", { name: /我的成长/ })[0]);
    expect(
      await screen.findByRole("heading", { name: "我的 AI 成长", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("教师 AI 能力摸底包 · 已导入")).toBeInTheDocument();
    for (const answer of [
      "模型处理文字时使用的小单位",
      "告诉 AI 要做什么以及有什么要求的指令",
      "便于判断内容是否可靠和仍然有效",
      "复核评分依据和异常结果",
      "说明样本限制并缩小结论范围",
    ]) {
      await user.click(screen.getByRole("button", { name: new RegExp(answer) }));
    }
    for (const item of [
      "建立统一指标",
      "核验功能与限制",
      "比较隐私、无障碍和成本",
      "记录证据来源",
      "给出有条件的人工结论",
    ]) {
      await user.click(screen.getByRole("checkbox", { name: item }));
    }
    await user.click(screen.getByRole("checkbox", { name: /教师人工确认/ }));
    await user.click(screen.getByRole("button", { name: "提交摸底测评并生成报告" }));
    expect(screen.getByText("L2 AI实践者 · 已形成详细能力证据与提升目标")).toBeInTheDocument();
    expect(screen.getByText("知识库与智能体")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /查看个性化培训计划/ }));
    expect(screen.getByText("李老师 · AI 能力提升计划")).toBeInTheDocument();
    expect(screen.getByLabelText("每周学习时间")).toHaveValue("4");
  });

  it("教师成长使用教师学员上下文且学生端不可见", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getAllByRole("button", { name: /我的成长/ })[0]);
    await user.click(screen.getByRole("button", { name: /课程学习/ }));
    expect(screen.getByText("李老师 · 教师学员")).toBeInTheDocument();
    expect(screen.queryByText("林一诺 · 学生学员")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "学生" }));
    expect(screen.queryByRole("button", { name: /我的成长/ })).not.toBeInTheDocument();
    expect(screen.queryByText("教师 AI 能力摸底包 · 已导入")).not.toBeInTheDocument();
  });

  it("科研智能体可绑定资料、模拟测试、保存版本并关联成果", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "进入研究工作台" }));
    await user.click(screen.getByRole("tab", { name: /科研智能体/ }));
    expect(screen.getByText("科研智能体设计流程")).toBeInTheDocument();
    expect(screen.getByText("来源引用")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "模拟测试" }));
    expect(screen.getByText("模拟运行通过")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "保存新版本" }));
    await user.click(screen.getByRole("button", { name: "关联研究成果" }));
    expect(screen.getByText("阶段成果：课堂互动证据分析备忘录 v1.0")).toBeInTheDocument();
  });

  it("教学班级上下文与教师个人成长上下文互不覆盖", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "进入课堂" }));
    expect(screen.getByRole("button", { name: /人工智能 2401 班生成式视觉设计/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /我的成长/ }));
    expect(screen.getByText("李老师 · 教师个人成长空间")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /教学工作/ }));
    expect(screen.getByRole("button", { name: /人工智能 2401 班生成式视觉设计/ })).toBeInTheDocument();
  });

  it("自由实训成果会回流教师成长记录", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "继续培训任务" }));
    await user.click(screen.getByRole("tab", { name: /工具广场/ }));
    await user.click(screen.getAllByRole("button", { name: /进入实训/ })[0]);
    await user.click(screen.getByRole("button", { name: "开始自由实训" }));
    await user.click(screen.getByRole("button", { name: /我的成长/ }));
    await user.click(screen.getByRole("button", { name: /实训记录/ }));
    expect(screen.getByText(/实训作品 1/)).toBeInTheDocument();
  });
});
