// https://github.com/cosmiconfig/cosmiconfig
import { cosmiconfig } from 'cosmiconfig'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')
const MODULE_NAME = packageJson.name

/**
 * 解析用户配置文件
 * @param {string} [configPath] - 配置文件路径，如果提供则直接加载指定文件
 * @returns {Promise<Object>} 配置对象
 */
export async function parseUserConfig(configPath) {
  const explorer = cosmiconfig(MODULE_NAME)

  let searchedFor
  if (configPath) {
    // 如果指定了配置文件路径，直接加载
    const absolutePath = path.resolve(process.cwd(), configPath)
    try {
      searchedFor = await explorer.load(absolutePath)
    } catch (error) {
      throw new Error(`Failed to load config file at ${absolutePath}: ${error.message}`)
    }
  } else {
    // 否则搜索默认位置
    searchedFor = await explorer.search()
  }

  return (searchedFor && searchedFor.config) || {}
}

