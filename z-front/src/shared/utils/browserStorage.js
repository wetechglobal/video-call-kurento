import engine from 'store/src/store-engine';
import localStorage from 'store/storages/localStorage';
import cookieStorage from 'store/storages/cookieStorage';
import pluginDefaults from 'store/plugins/defaults';

const storages = [localStorage, cookieStorage];

const plugins = [pluginDefaults];

const browserStorage = engine.createStore(storages, plugins);

export default browserStorage;
