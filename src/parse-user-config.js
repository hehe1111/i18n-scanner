// https://github.com/cosmiconfig/cosmiconfig
import { cosmiconfig } from 'cosmiconfig'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')
const MODULE_NAME = packageJson.name
const explorer = cosmiconfig(MODULE_NAME);

const searchedFor = await explorer.search() || {};

export default searchedFor.config || {}
