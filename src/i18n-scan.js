const { transformFromAstSync, transformSync } = require('@babel/core')
const parser = require('@babel/parser')
const fse = require('fs-extra')
const prettier = require('prettier')
const i18nScanner = require('./plugin/babel-plugin-i18n-scanner')
const { successLog } = require('./utils')
const prettierConfig = require('./prettier-config')

/**
 * @param {Object} params
 * @param {string} [params.sourceCode] 待处理的源代码。优先级高于 filePath
 * @param {string} params.filePath 待处理的文件的路径。优先级低于 sourceCode 参数
 * @param {Object} params.pluginOptions
 * @param {string} params.pluginOptions.importStatement
 * @param {string} params.pluginOptions.i18nCallee
 * @param {string} params.pluginOptions.output
 * @param {boolean} [params.forceImport] 是否强制导入国际化包，即使没有需要替换的文本
 * @param {Function} [params.afterTransform] 代码处理完成后，提供一个钩子给外部，方便外部进行二次处理
 */
module.exports = async function i18nScan({
  sourceCode,
  filePath,
  pluginOptions,
  forceImport = false,
  afterTransform
}) {
  let _sourceCode
  // 解决 <script></script> 中没有内容时，babel 会报错的问题
  if (sourceCode === '') {
    _sourceCode = ' '
  } else if (sourceCode) {
    _sourceCode = sourceCode
  } else if (filePath) {
    _sourceCode = fse.readFileSync(filePath, {
      encoding: 'utf-8'
    })
  }

  if (!_sourceCode) {
    throw new Error('Nothing to parse.')
  }

  const ast = parser.parse(_sourceCode, {
    sourceType: 'unambiguous',
    // 插件从前往后
    plugins: ['typescript', 'jsx'],
  })

  // 必须指定 targets：https://babeljs.io/docs/options#no-targets
  // > When no targets are specified: Babel will assume you are targeting the oldest browsers possible. For example, @babel/preset-env will transform all ES2015-ES2020 code to be ES5 compatible.
  const { code } = transformFromAstSync(ast, _sourceCode, {
    plugins: [[i18nScanner, { ...pluginOptions, forceImport }]],
    /**
     * Specify the "root" folder that defines the location to search for "babel.config.js", and the default folder to allow `.babelrc` files inside of.
     *
     * Default: `"."`
     */
    root: __dirname,
    generatorOpts: {
      // 尽量避免改动代码，减少 diff，方便 cr
      retainLines: true
    },
    // 直接处理一段代码，而不是从一个文件读取代码再进行处理的场景下，filename 参数时必须的，否则在 transform 阶段会直接报错
    // 用于支持 .vue 单文件的扫描
    filename: filePath
  })

  // const { code } = transformSync(_sourceCode, {
  //   sourceType: 'unambiguous',
  //   // Error: Cannot find module 'babel-plugin-typescript'
  //   plugins: ['typescript', 'jsx', [i18nScanner, pluginOptions]],
  //   root: __dirname,
  //   // 直接处理一段代码，而不是从一个文件读取代码再进行处理的场景下，filename 参数时必须的，否则在 transform 阶段会直接报错
  //   // 用于支持 .vue 单文件的扫描
  //   filename: filePath
  // })

  if (typeof afterTransform === 'function') {
    afterTransform(code)
  } else {
    // parser 不使用 babel 而是使用 babel-ts 是为了兼顾 ts 代码
    const formattedCode = await prettier.format(code, { ...prettierConfig, parser: 'babel-ts' })
    fse.writeFileSync(filePath, formattedCode, 'utf-8')
  }

  successLog(`File: ${filePath} => Done.`)
}
