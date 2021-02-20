import { EventEmitter } from 'events';

import { initEmitterNow } from './emitterNow';

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

initEmitterNow(emitter);

export default emitter;
