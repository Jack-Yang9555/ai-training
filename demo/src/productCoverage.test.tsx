import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { createInitialCourseRuntimes } from "./courseRuntimeData";
import { DemoProvider } from "./demoState";
import { EvidenceCenterProvider, evidenceRecords } from "./evidenceCenter";
import { canAccess } from "./permissionPolicy";
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

describe("产品定位全面覆盖", () => {
  it("两门课程的任务、测评、报告和补学状态按 courseId 隔离", () => {
    const runtimes = createInitialCourseRuntimes();
    expect(Object.keys(runtimes)).toEqual([
      "course-visual-design",
      "course-ai-ethics",
    ]);
    expect(runtimes["course-ai-ethics"].taskIds).not.toContain(
      "task-visual-revision",
    );
    expect(runtimes["course-visual-design"].assessmentIds).not.toContain(
      "student-assessment-ethics",
    );
    expect(runtimes["course-ai-ethics"].remediation.title).toBe(
      "版权与隐私风险辨识补强包",
    );
  });

  it("统一证据记录包含治理、版本、置信度和人工复核字段", () => {
    evidenceRecords.forEach((record) => {
      expect(record.source).toBeTruthy();
      expect(record.modelVersion).toBeTruthy();
      expect(record.confidence).toBeGreaterThan(0);
      expect(record.permissionScope).toBeTruthy();
      expect(record.reviewStatus).toBeTruthy();
      expect(record.generatedAt).toBeTruthy();
      expect(record.updatedAt).toBeTruthy();
    });
  });

  it("集中权限策略阻止管理者进入编辑、个人成长和学生作答能力", () => {
    expect(canAccess("manager", "manager-workspace")).toBe(true);
    expect(canAccess("manager", "anonymous-student-evidence")).toBe(true);
    expect(canAccess("manager", "aggregate-teacher-development")).toBe(true);
    expect(canAccess("manager", "configure-teacher-development-goals")).toBe(true);
    expect(canAccess("manager", "teacher-growth")).toBe(false);
    expect(canAccess("manager", "teacher-research")).toBe(false);
    expect(canAccess("manager", "edit-lesson")).toBe(false);
    expect(canAccess("manager", "edit-score")).toBe(false);
    expect(canAccess("manager", "student-answer")).toBe(false);
  });

  it("管理者五个任务面可切换且不暴露教师个人成长入口", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "教学管理" }));
    expect(
      await screen.findByRole("heading", { name: "运行总览", level: 1 }),
    ).toBeInTheDocument();
    for (const tab of [
      "课程班级",
      "学习质量",
      "测评运行",
      "AI 应用",
    ]) {
      await user.click(screen.getByRole("tab", { name: tab }));
      expect(
        screen.getByRole("heading", { name: tab, level: 1 }),
      ).toBeInTheDocument();
    }
    expect(
      screen.queryByRole("button", { name: /我的成长/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /AI 研究/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("摸底答案")).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "教师发展" }));
    expect(screen.getByRole("heading", { name: "学校分层培养", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("个人成长数据不可见")).toBeInTheDocument();
    expect(screen.getByText("L1—L4 与待通关分布")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("学校培养目标等级"), "L4");
    await user.selectOptions(screen.getByLabelText("学校培养重点维度"), "研究创新");
    await user.click(screen.getByRole("button", { name: /生成群组方案/ }));
    expect(screen.getByText(/TD-SCH-L4-RES/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "发布学校培养目标" }));
    expect(screen.getByRole("button", { name: "当前方案已发布" })).toBeDisabled();
    expect(screen.getAllByText(/TD-SCH-L4-RES/).length).toBeGreaterThanOrEqual(2);
  });

  it("管理预警可跨管理者、教师和学生完成状态回流", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "教学管理" }));
    await screen.findByRole("heading", { name: "运行总览", level: 1 });
    await user.click(
      screen.getByRole("button", {
        name: /人工智能 2401 班负向提示词掌握度 54%/,
      }),
    );
    expect(screen.getByText("学生 A-018")).toBeInTheDocument();
    expect(screen.queryByText("林一诺")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "交办给周老师" }));
    await user.click(screen.getByRole("button", { name: "关闭" }));

    await user.click(screen.getByRole("button", { name: "教师" }));
    expect(
      screen.getByText("王主任已交办", { exact: false }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /处理管理关注/ }));
    await user.click(screen.getByRole("button", { name: "发布补学干预" }));

    await user.click(screen.getByRole("button", { name: "学生" }));
    await user.click(screen.getByRole("button", { name: /进入补学/ }));
    await user.click(
      screen.getByRole("button", { name: "完成补学并回流" }),
    );

    await user.click(screen.getByRole("button", { name: "教学管理" }));
    expect(
      await screen.findByText("补学完成率 100% · 最近一次诊断提升至 76%"),
    ).toBeInTheDocument();
    expect(screen.getByText("已解决")).toBeInTheDocument();
  });

  it("学生报告只展示本人前后变化并可打开真实证据详情", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "学生" }));
    await user.click(screen.getByRole("button", { name: "查看成长报告" }));
    expect(
      screen.getByText("仅比较本人前后变化 · 较课前提升 9%"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/班级第/)).not.toBeInTheDocument();
    expect(screen.queryByText(/超过.*同学/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "查看评分证据" }));
    expect(
      screen.getByRole("dialog", { name: "报告建议与补学任务依据" }),
    ).toBeInTheDocument();
    expect(screen.getByText("模拟服务版本")).toBeInTheDocument();
    expect(screen.getByText("教师修改与最终确认")).toBeInTheDocument();
  });

  it("伦理副课程可完成导学、学习、测评、报告与补学闭环", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "学生" }));
    await user.click(screen.getByRole("button", { name: /选择我的课程/ }));
    await user.click(
      screen.getByRole("button", { name: /AI 创作伦理与安全/ }),
    );
    await user.click(screen.getByRole("button", { name: "查看课程导学" }));
    expect(
      screen.getByText("识别 AI 创作中的版权与隐私风险"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "进入本课学习" }));
    for (const item of [
      "素材来源与授权范围已记录",
      "人物身份与敏感信息已脱敏",
      "可能造成误导或伤害的内容已修订",
      "AI 使用与最终责任已明确说明",
    ]) {
      await user.click(await screen.findByRole("button", { name: item }));
    }
    await user.click(
      screen.getByRole("button", { name: /保存修订并进入测评/ }),
    );
    for (const answer of [
      "核验授权范围并记录来源",
      "取得授权并完成必要脱敏",
      "错误",
      "保留授权协议与适用范围",
      "暂停发布、人工复核并记录修订依据",
    ]) {
      await user.click(
        await screen.findByRole("button", { name: new RegExp(answer) }),
      );
      if (answer !== "暂停发布、人工复核并记录修订依据") {
        await user.click(await screen.findByRole("button", { name: /下一题/ }));
      }
    }
    await user.click(await screen.findByRole("button", { name: /提交测评/ }));
    await user.click(
      await screen.findByRole("button", { name: /查看五项能力报告/ }),
    );
    expect(await screen.findByText("版权识别")).toBeInTheDocument();
    expect(await screen.findByText("证据核验")).toBeInTheDocument();
    expect(screen.queryByText("视觉表达")).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", { name: /生成补学任务/ }),
    );
    expect(
      await screen.findByText("新补学任务：版权与隐私风险辨识补强包"),
    ).toBeInTheDocument();
  });
});
