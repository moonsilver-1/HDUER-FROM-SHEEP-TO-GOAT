import fs from "node:fs";
import path from "node:path";

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
};

export type WikiEntry = {
  term: string;
  aliases: string[];
  summary: string;
  details: string[];
};

const articlesDirectory = path.join(process.cwd(), "articles");

export const wikiEntries: WikiEntry[] = [
  {
    term: "绩点",
    aliases: ["GPA", "平均学分绩点", "裸绩点", "满绩"],
    summary:
      "绩点是衡量课程成绩和学业表现的核心指标。杭电常见满绩为 5.0，平均学分绩点会按课程学分加权计算。",
    details: [
      "课程学分越高，对平均绩点影响越大，所以高数学分课、专业核心课尤其值得认真对待。",
      "奖学金、转专业、保研等场景通常都会参考绩点或综合测评。",
      "竞赛获奖可能带来 GPA 加分，但不同学院和年份政策会变化，最终以当年学院文件为准。"
    ]
  },
  {
    term: "平时分",
    aliases: ["课堂表现", "pre", "实践作业"],
    summary:
      "平时分是课程总评的一部分，可能来自签到、课堂发言、作业、实验、汇报或阶段测验。",
    details: [
      "不同老师规则差异很大，选课前最好向学长学姐了解评价方式。",
      "有些课程按平时分和期末分三七开或四六开，也有课程会加入期中考试。"
    ]
  },
  {
    term: "竞赛",
    aliases: ["比赛", "创新学分", "挑战杯", "数模", "大创"],
    summary:
      "竞赛是杭电学生成长路线里很重要的一支，可能关联综测、GPA、创新学分、项目经验和简历。",
    details: [
      "比赛团队通常需要负责人、产品、研发、美工、答辩等角色协作。",
      "刚开始可以先跟着老师或学长学姐做杂活，逐渐进入核心模块。",
      "别只盯着加分，长期来看，真实做过项目和能讲清楚技术更值钱。"
    ]
  },
  {
    term: "科研",
    aliases: ["论文", "导师", "实验室", "保研", "读研"],
    summary:
      "科研不是遥不可及的神坛，本科阶段也可以从进实验室、读论文、复现实验和做小项目开始。",
    details: [
      "选择导师时，方向匹配和沟通体验都很重要。",
      "科研过程常常枯燥且失败率高，兴趣会显著影响你能坚持多久。",
      "论文、专利、软著、项目经历都可能在升学面试中成为可展开的话题。"
    ]
  },
  {
    term: "GitHub",
    aliases: ["Github", "git", "开源", "版本控制"],
    summary:
      "GitHub 是项目协作、代码托管和展示作品的重要平台，新生越早熟悉越好。",
    details: [
      "建议从 commit、branch、pull request、README 这些基础概念入手。",
      "学生身份还可以申请 GitHub Student Developer Pack，获得不少开发工具权益。"
    ]
  },
  {
    term: "AI",
    aliases: ["LLM", "大模型", "ChatGPT", "人工智能"],
    summary:
      "AI 可以显著提高写作、学习和开发效率，但前提是你能提供清晰需求和足够上下文。",
    details: [
      "输入越清楚，输出越稳定。模糊提问通常只能得到模糊答案。",
      "做作业和项目时要 Review AI 的回答，别把幻觉当事实。",
      "可以用学生邮箱申请一些工具优惠或免费额度。"
    ]
  }
];

function titleFromMarkdown(content: string, fallback: string) {
  const heading = content
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("# "));

  return heading?.replace(/^#\s+/, "").trim() || fallback;
}

function excerptFromMarkdown(content: string) {
  const paragraph = content
    .split(/\r?\n\r?\n/)
    .map((block) => block.replace(/^#+\s+/gm, "").trim())
    .find((block) => block.length > 20);

  return paragraph ? `${paragraph.slice(0, 118)}...` : "来自 HDU 学长学姐的经验文章。";
}

export function getArticles(): Article[] {
  if (!fs.existsSync(articlesDirectory)) {
    return [];
  }

  return fs
    .readdirSync(articlesDirectory)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const content = fs.readFileSync(path.join(articlesDirectory, file), "utf8");

      return {
        slug,
        title: titleFromMarkdown(content, slug),
        excerpt: excerptFromMarkdown(content),
        content
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
}

export function getArticle(slug: string) {
  return getArticles().find((article) => article.slug === slug);
}
