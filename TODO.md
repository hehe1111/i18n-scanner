# TODO

- [x] 格式化产物
- [ ] 格式化 vue sfc 文件时，需要自动引入 `i18n` 相关的依赖

```js
module.exports = async function handleVueSFC({ filePath, pluginOptions }) {
  const encoding = { encoding: 'utf-8' }
  let content = fse.readFileSync(filePath, encoding)
  content = handleTemplate({ content, filePath, pluginOptions })
  // TODO: handleTemplate 如果有国际化处理过原代码，则应在 handleScript 中自动引入 i18n 相关的依赖
  content = handleScript({ content, filePath, pluginOptions })
  content = await prettier.format(content, {
    ...prettierConfig,
    parser: 'vue'
  })
  fse.writeFileSync(filePath, content, encoding)
}
```

- [ ] esm 支持
- [ ] ts 支持
- [ ] 命名空间支持
