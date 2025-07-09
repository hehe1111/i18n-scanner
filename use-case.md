# 使用场景

1. 命令行使用

```bash
i18n scan 默认扫描当前目录，如果没有文案，则提示说「没有在当前目录下扫描到文案」，并退出。有文案，则尝试向上查找 src 目录，并把文案输出到 src 目录下
i18n scan <glob path>
i18n scan --ext .js,.jsx,.ts,.tsx
i18n scan <glob path> --output <输出文案文件，需要内置默认值>
i18n scan --output <输出文案文件，需要内置默认值>
```

2. 配置文件 i18n.config.js

```js
module.exports = {
  entry: <路径字符串 | 路径字符串数组>,
  output: 文案文件输出目录路径字符串,
  moduleName: 'i18n',
  methodName: 't', // 可选。i18n.t() | i18n() | t()
}
```
