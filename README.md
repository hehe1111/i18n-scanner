# i18n-scanner

一个用于 `.js|.jsx|.ts|.tsx|.vue` 文件国际化的命令行工具。

![演示](./showcase.gif)

## 安装

```bash
npm i i18n-scanner -g
```

## 使用

```bash
i18n scan -h
```

1. 命令行使用

```bash
i18n scan 默认扫描当前目录
i18n scan <glob path>
i18n scan --ext .js,.jsx,.ts,.tsx
i18n scan <glob path> --output <输出文案文件，需要内置默认值>
i18n scan --output <输出文案文件，需要内置默认值>
```

2. 配置文件 i18n.config.js + 命令行

```js
export default {
  i18nCallee: 'i18nFake.t',
  output: './fixtures/here-is-where-i-put-my-i18n-files',
  importStatement: 'import i18nFake from "my-awesome-i18n-lib-that-does-not-exist"',
  exclude: ['**/*.config.js']
}
```

注意：配置文件里的配置优先级高于命令行的参数配置
