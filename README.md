# HDU Wiki

杭电百科，给 HDUER 准备的词条解释、经验文章和新生指南。

## 本地开发

```bash
npm install
npm run dev
```

打开 <http://localhost:3000> 查看。

## 部署到 Vercel

Vercel 会自动识别 Next.js 项目。导入仓库后保持默认设置即可：

- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

## 项目结构

```text
articles/        # Markdown 文章
src/app/         # Next.js App Router 页面
src/components/  # 交互组件
src/lib/         # 内容读取和 Markdown 渲染
```

## 文章列表

- [总指南：HDUER FROM SHEEP TO GOAT](articles/main-guide.md)
- [在 HDU 快乐成长](articles/how-to-grow-in-hdu.md)
- [如何成为一个合格的开发者](articles/how-to-become-a-qualified-developer.md)
- [GitHub 使用指南](articles/how-too-use-github.md)
- [AI 使用指北](articles/how-to-use-llm.md)
- [软件安装指南](articles/how-to-install-software.md)
