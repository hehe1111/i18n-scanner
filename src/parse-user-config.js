// https://github.com/cosmiconfig/cosmiconfig
import { cosmiconfig } from 'cosmiconfig'

const MODULE_NAME = 'i18n'
const explorer = cosmiconfig(MODULE_NAME);

const searchedFor = await explorer.search() || {};

export default searchedFor.config || {}
