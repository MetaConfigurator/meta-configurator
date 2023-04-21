import '@vitest/utils';

function isFinalObj(obj) {
  return obj === Object.prototype || obj === Function.prototype || obj === RegExp.prototype;
}
function collectOwnProperties(obj, collector) {
  const collect = typeof collector === "function" ? collector : (key) => collector.add(key);
  Object.getOwnPropertyNames(obj).forEach(collect);
  Object.getOwnPropertySymbols(obj).forEach(collect);
}
function groupBy(collection, iteratee) {
  return collection.reduce((acc, item) => {
    const key = iteratee(item);
    acc[key] || (acc[key] = []);
    acc[key].push(item);
    return acc;
  }, {});
}
function isPrimitive(value) {
  return value === null || typeof value !== "function" && typeof value !== "object";
}
function getAllMockableProperties(obj, isModule) {
  const allProps = /* @__PURE__ */ new Map();
  let curr = obj;
  do {
    if (isFinalObj(curr))
      break;
    collectOwnProperties(curr, (key) => {
      const descriptor = Object.getOwnPropertyDescriptor(curr, key);
      if (descriptor)
        allProps.set(key, { key, descriptor });
    });
  } while (curr = Object.getPrototypeOf(curr));
  if (isModule && !allProps.has("default") && "default" in obj) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, "default");
    if (descriptor)
      allProps.set("default", { key: "default", descriptor });
  }
  return Array.from(allProps.values());
}
function slash(str) {
  return str.replace(/\\/g, "/");
}
function noop() {
}
function toArray(array) {
  if (array === null || array === void 0)
    array = [];
  if (Array.isArray(array))
    return array;
  return [array];
}
function toString(v) {
  return Object.prototype.toString.call(v);
}
function isPlainObject(val) {
  return toString(val) === "[object Object]" && (!val.constructor || val.constructor.name === "Object");
}
function deepMerge(target, ...sources) {
  if (!sources.length)
    return target;
  const source = sources.shift();
  if (source === void 0)
    return target;
  if (isMergeableObject(target) && isMergeableObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isMergeableObject(source[key])) {
        if (!target[key])
          target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
  }
  return deepMerge(target, ...sources);
}
function isMergeableObject(item) {
  return isPlainObject(item) && !Array.isArray(item);
}
function stdout() {
  return console._stdout || process.stdout;
}
function getEnvironmentTransformMode(config, environment) {
  var _a, _b;
  if (!((_b = (_a = config.deps) == null ? void 0 : _a.experimentalOptimizer) == null ? void 0 : _b.enabled))
    return void 0;
  return environment === "happy-dom" || environment === "jsdom" ? "web" : "ssr";
}
class AggregateErrorPonyfill extends Error {
  constructor(errors, message = "") {
    super(message);
    this.errors = [...errors];
  }
}

const DEFAULT_TIMEOUT = 6e4;
function createBirpc(functions, options) {
  const {
    post,
    on,
    eventNames = [],
    serialize = (i) => i,
    deserialize = (i) => i,
    timeout = DEFAULT_TIMEOUT
  } = options;
  const rpcPromiseMap = /* @__PURE__ */ new Map();
  const rpc = new Proxy({}, {
    get(_, method) {
      const sendEvent = (...args) => {
        post(serialize({ m: method, a: args, t: "q" }));
      };
      if (eventNames.includes(method)) {
        sendEvent.asEvent = sendEvent;
        return sendEvent;
      }
      const sendCall = (...args) => {
        return new Promise((resolve, reject) => {
          const id = nanoid();
          rpcPromiseMap.set(id, { resolve, reject });
          post(serialize({ m: method, a: args, i: id, t: "q" }));
          if (timeout >= 0) {
            setTimeout(() => {
              reject(new Error(`[birpc] timeout on calling "${method}"`));
              rpcPromiseMap.delete(id);
            }, timeout);
          }
        });
      };
      sendCall.asEvent = sendEvent;
      return sendCall;
    }
  });
  on(async (data, ...extra) => {
    const msg = deserialize(data);
    if (msg.t === "q") {
      const { m: method, a: args } = msg;
      let result, error;
      try {
        result = await functions[method].apply(rpc, args);
      } catch (e) {
        error = e;
      }
      if (msg.i)
        post(serialize({ t: "s", i: msg.i, r: result, e: error }), ...extra);
    } else {
      const { i: ack, r: result, e: error } = msg;
      const promise = rpcPromiseMap.get(ack);
      if (error)
        promise?.reject(error);
      else
        promise?.resolve(result);
      rpcPromiseMap.delete(ack);
    }
  });
  return rpc;
}
const urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
function nanoid(size = 21) {
  let id = "";
  let i = size;
  while (i--)
    id += urlAlphabet[Math.random() * 64 | 0];
  return id;
}

export { AggregateErrorPonyfill as A, getEnvironmentTransformMode as a, stdout as b, createBirpc as c, deepMerge as d, getAllMockableProperties as e, groupBy as g, isPrimitive as i, noop as n, slash as s, toArray as t };
