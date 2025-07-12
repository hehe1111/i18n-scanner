// https://github.com/cosmiconfig/cosmiconfig
import { cosmiconfigSync } from 'cosmiconfig'

const MODULE_NAME = 'i18n'
const explorerSync = cosmiconfigSync(MODULE_NAME);
const searchedFor = explorerSync.search() || {};

export default searchedFor.config || {}
