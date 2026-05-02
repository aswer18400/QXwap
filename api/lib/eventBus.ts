import { EventEmitter } from "node:events";

export const chatBus = new EventEmitter();
chatBus.setMaxListeners(0);
