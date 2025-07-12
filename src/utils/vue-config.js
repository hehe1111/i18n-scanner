import { askScriptTagConfig } from './interactive.js'
import path from 'node:path'
import fse from 'fs-extra'

/**
 * 从项目中自动检测 Vue 配置
 * @param {string} projectRoot 项目根目录
 * @returns {Promise<{version?: number, useTypeScript?: boolean}>}
 */
async function detectVueConfig(projectRoot) {
  
  try {
    // 检查 package.json 中的依赖
    const packageJsonPath = path.join(projectRoot, 'package.json')
    if (fse.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fse.readFileSync(packageJsonPath, 'utf-8'))
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
      
      let version
      let useTypeScript = false
      
      // 检测 Vue 版本
      if (dependencies.vue) {
        const vueVersion = dependencies.vue
        if (vueVersion.includes('^3') || vueVersion.includes('~3') || vueVersion.startsWith('3')) {
          version = 3
        } else if (vueVersion.includes('^2') || vueVersion.includes('~2') || vueVersion.startsWith('2')) {
          version = 2
        }
      }
      
      // 检测 TypeScript
      if (dependencies.typescript || dependencies['@types/node']) {
        useTypeScript = true
      }
      
      // 检查 tsconfig.json
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json')
      if (fse.existsSync(tsconfigPath)) {
        useTypeScript = true
      }
      
      return { version, useTypeScript }
    }
  } catch (error) {
    // 检测失败，返回空对象
  }
  
  return {}
}

/**
 * 解析 Vue script 标签配置
 * 优先级：CLI参数 > 配置文件 > 自动检测 > 用户交互
 * @param {Object} vueConfig CLI参数中的Vue配置
 * @param {string} projectRoot 项目根目录
 * @returns {Promise<{useSetup: boolean, useTypeScript: boolean}>}
 */
async function resolveVueScriptConfig(vueConfig = {}, projectRoot = process.cwd()) {
  // 1. 首先从CLI参数获取配置
  let { version, useTypeScript, useSetup } = vueConfig
  
  // 2. 如果没有完整配置，尝试自动检测
  if (version === undefined || useTypeScript === undefined) {
    const detected = await detectVueConfig(projectRoot)
    
    if (version === undefined) {
      version = detected.version
    }
    if (useTypeScript === undefined) {
      useTypeScript = detected.useTypeScript
    }
  }
  
  // 3. 如果 setup 选项未定义，根据 Vue 版本设置默认值
  if (useSetup === undefined) {
    if (version === 2) {
      useSetup = false // Vue 2 不支持 setup
    } else if (version === 3) {
      useSetup = true  // Vue 3 默认使用 setup
    }
  }
  
  // 4. 如果仍有未定义的选项，询问用户
  if (version === undefined || useTypeScript === undefined || useSetup === undefined) {
    console.log('\n检测到需要创建 <script> 标签，但无法确定完整配置。')
    
    // 显示已检测到的配置
    if (version !== undefined) {
      console.log(`检测到 Vue 版本: ${version}`)
    }
    if (useTypeScript !== undefined) {
      console.log(`检测到 TypeScript: ${useTypeScript ? '是' : '否'}`)
    }
    
    const userConfig = await askScriptTagConfig(version, useTypeScript, useSetup)
    
    if (version === undefined) {
      version = userConfig.version
    }
    if (useTypeScript === undefined) {
      useTypeScript = userConfig.useTypeScript
    }
    if (useSetup === undefined) {
      useSetup = userConfig.useSetup
    }
  }
  
  // 5. Vue 2 强制不使用 setup
  if (version === 2) {
    useSetup = false
  }
  
  return {
    version: version || 3,
    useSetup: useSetup !== false,
    useTypeScript: useTypeScript === true
  }
}

export {
  detectVueConfig,
  resolveVueScriptConfig
}