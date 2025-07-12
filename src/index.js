#!/usr/bin/env node

// https://github.com/tj/commander.js
import { Command } from 'commander'
// https://github.com/isaacs/node-glob
import { globSync } from 'glob'
import fse from 'fs-extra'
import path from 'node:path'
import { createRequire } from 'node:module'
import i18nScan from './i18n-scan.js'
import parsedConfig from './parse-config.js'
import handleVueSFC from './sfc/handle-vue-sfc.js'
import { errorLogAndExit } from './utils.js'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')

const VERSION = packageJson.version
const DEFAULT_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.vue']
const DEFAULT_GLOB_PATH = './**/*'
// FIXME: 这个应该要求用户传，不应该走默认值。待删除
const DEFAULT_IMPORT_STATEMENT = 'import intl from "intl"'
// FIXME: 这个应该要求用户传，不应该走默认值。待删除
const DEFAULT_I18N_CALLEE = 'intl.t'
const DEFAULT_OUTPUT = './i18n'

const program = new Command()

program
  .name('i18n')
  .description('A i18n tool to scan and replace text in code.')
  .version(VERSION)

program
  .command('scan')
  .description('Scan files.')
  .argument('[path]', 'Directory or files to scan and replace. Support glob path.', DEFAULT_GLOB_PATH)
  .option('-i, --importStatement <string>', 'Statement to import i18n package.', DEFAULT_IMPORT_STATEMENT)
  .option('-c, --i18nCallee <string>', 'i18n callee', DEFAULT_I18N_CALLEE)
  .option('-e, --ext <string>', 'File extensions. The kind of files to handle.', DEFAULT_EXTENSIONS.join())
  .option('-o, --output <string>', 'Directory path to place output files.', DEFAULT_OUTPUT)
  .option('--vue-version <number>', 'Vue version (2 or 3). Affects script tag generation.')
  .option('--use-typescript', 'Use TypeScript for generated script tags.')
  .option('--no-typescript', 'Do not use TypeScript for generated script tags.')
  .option('--use-setup', 'Use <script setup> syntax for Vue 3.')
  .option('--no-setup', 'Use traditional <script> syntax.')
  .action(onScan)

program.parse()

// TODO: JSDoc 注释
async function onScan(pathStr, options) {
  // TODO: 在 windows 下，用户传入的路径可能使用了单反斜杠 D:\path\using\backslash，没有使用双斜杠，这种场景下，str 会是 D:pathusingbackslash，单斜杠会被吞掉。暂时想不到好的处理方法，先不处理
  // ! 暂时只支持斜杠，不支持反斜杠

  let inputExtensions
  let notSupportExtension = false

  // 1. 用户在路径中指定了文件后缀。此场景下用户传入的 --ext 参数会被忽略，只使用路径中的文件后缀
  const ext = path.extname(pathStr)
  if (ext) {
    // 用户可能传 .{js|jsx} 等后缀，而不是 .js
    inputExtensions = ext.startsWith('.{')
      ? ext.replace('.{', '').replace('}', '').split('|').filter(Boolean).map(e => `.${e}`)
      : [ext]
  } else {
    // 2. 用户通过 --ext 选项指定文件后缀
    inputExtensions = options.ext.split(',').filter(Boolean)
  }
  notSupportExtension = !inputExtensions.every(ext =>
    DEFAULT_EXTENSIONS.includes(ext)
  )
  if (notSupportExtension) {
    errorLogAndExit(`Error: Not supported type of files: ${ext || options.ext} .`)
  }

  // 用户传了不带文件后缀的路径
  if (!ext) {
    let extensionsStr = `${inputExtensions.map(i => i.slice(1)).join()}`
    inputExtensions.length > 1 && (extensionsStr = `{${extensionsStr}}`)
    if (pathStr.endsWith('*')) {
      // 1. path/to/*
      pathStr += `.${extensionsStr}`
    } else if (pathStr.endsWith('/')) {
      // 2. path/to/
      pathStr += `*.${extensionsStr}`
    } else {
      // 3. path/to
      pathStr += `/*.${extensionsStr}`
    }
  }
  // don't look in node_modules
  const filePathList = globSync(pathStr, {
    ignore: 'node_modules/**'
  })

  filePathList.length === 0 && errorLogAndExit('Nothing to scan.')

  const output = path.resolve(
    process.cwd(),
    parsedConfig.output || options.output
  )
  fse.ensureDirSync(output)
  const pluginOptions = {
    importStatement: parsedConfig.importStatement || options.importStatement,
    i18nCallee: parsedConfig.i18nCallee || options.i18nCallee,
    output,
    // Vue 相关配置
    vueConfig: {
      version: options.vueVersion ? parseInt(options.vueVersion) : undefined,
      useTypeScript: options.typescript !== undefined ? options.typescript : undefined,
      useSetup: options.setup !== undefined ? options.setup : undefined
    }
  }
  for (const filePath of filePathList) {
    if (path.extname(filePath) === '.vue') {
      await handleVueSFC({ filePath, pluginOptions })
      continue
    }

    // for .js,.jsx,.ts,.tsx
    await i18nScan({ filePath, pluginOptions })
  }
}
