// TODO: 命名空间支持
// i18n.t('xxx', { namespace: '', placeholder: title }, '兜底')
// function t(key, payload, originText) {
//   const textCollection = file.get(TEXT_COLLECTION)
//   const a = textCollection[key]
//   // a 'xxx {placeholder1} ... {placeholder2} ...'
//   return Object.keys(payload).reduce((result, key) => {
//     if (key === 'namespace') {
//       return result
//     }
//     return result.replace(`${key}`, payload[key])
//   }, a)
// }

const { declare } = require('@babel/helper-plugin-utils')

const {
  SHOULD_IMPORT,
  validateOptions,
  readFromOutputFile,
  ensureImportI18nModule,
  skipImportSource,
  literalUtils,
  jsxTextUtils,
  writeTextCollectionToFile
} = require('./helper')

module.exports = declare((api, options, dirname) => {
  validateOptions(api, options)

  return {
    pre(file) {
      // TODO: 优化点：不需要每个文件都执行一遍序列化，考虑把 textCollection 存在内存中，处理每个文件时，都可共享
      readFromOutputFile(file, options)
    },
    visitor: {
      Program: {
        enter(_, state) {
          // 记到全局状态，方便后续生成国际化函数调用
          state.i18nCallee = options.i18nCallee
        },
        exit(programPath, state) {
          // 如果设置了 forceImport 或者当前文件有需要替换的文本，则确保导入国际化包
          if (options.forceImport || state[SHOULD_IMPORT] === true) {
            ensureImportI18nModule(api, programPath, options)
          }
        }
      },
      ImportDeclaration(path) {
        skipImportSource(path)
      },
      'StringLiteral|TemplateLiteral'(path, state) {
        if (literalUtils.shouldSkip(path, state)) return
        if (literalUtils.handleDisableComment(path)) return
        if (path.isStringLiteral()) {
          literalUtils.replaceStringLiteral(api, path, state)
        } else {
          literalUtils.replaceTemplateLiteral(api, path, state)
        }
      },
      JSXText(path, state) {
        if (jsxTextUtils.shouldSkip(path)) return
        if (jsxTextUtils.handleDisableComment(path)) return
        jsxTextUtils.replace(api, path, state)
      }
    },
    post(file) {
      writeTextCollectionToFile(file, options)
    }
  }
})
