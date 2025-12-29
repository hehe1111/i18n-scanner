export default {
  i18nCallee: 'i18nFake.t',
  output: './fixtures/here-is-where-i-put-my-i18n-files',
  importStatement:
    'import i18nFake from "my-awesome-i18n-lib-that-does-not-exist"',
  exclude: ['**/*.config.js'],
  // 是否使用数组格式作为国际化函数调用的第二个参数（插值数据），默认为 false（使用对象格式）
  // true: i18n.t('key', [var1, var2], '文案 {placeholder_1} {placeholder_2}')
  // false: i18n.t('key', {placeholder_1: var1, placeholder_2: var2}, '文案 {placeholder_1} {placeholder_2}')
  useArrayPayload: false
}
