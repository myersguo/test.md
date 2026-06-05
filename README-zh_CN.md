# TEST.md

`TEST.md` 是面向编码 agent 的 Markdown-first 测试契约。它说明一个仓库期望 agent 如何发现、生成、选择、运行和汇报测试。

本仓库定义 `TEST.md` 规范，并提供示例和一个小型 CLI 辅助工具。采用该规范的项目，应在仓库、包或服务层级创建自己的 `TEST.md` 文件。

## 阅读规范

- 完整规范：[`docs/spec.md`](docs/spec.md)
- 服务规范示例：
  - [`examples/go-api/TEST.md`](examples/go-api/TEST.md)
  - [`examples/kitex-rpc/TEST.md`](examples/kitex-rpc/TEST.md)
  - [`examples/monorepo/TEST.md`](examples/monorepo/TEST.md)
- 测试生成案例：
  - [`examples/diff-generate.md`](examples/diff-generate.md)
  - [`examples/impact-generate.md`](examples/impact-generate.md)

## 采用方快速开始

1. 在被治理代码附近添加一个 `TEST.md` 文件。
2. 描述真实的测试分层、测试技术、命令、smoke 契约和质量门禁。
3. 在 `AGENTS.md` 中添加测试指引，让 agent 在测试工作前读取最近适用的 `TEST.md`。

推荐的 `AGENTS.md` 条目：

```md
## Testing

Before adding, changing, or selecting tests, read the nearest applicable `TEST.md`.
Use `TEST.md` for test generation mode, test type contracts, smoke requirements, commands, and quality gates.
```

## CLI

```sh
cd cli
npm test
node ./bin/testmd.js lint ../examples/go-api/TEST.md
node ./bin/testmd.js suggest ..
node ./bin/testmd.js spec
```

CLI 只是辅助工具。Markdown 规范仍然是事实来源。
