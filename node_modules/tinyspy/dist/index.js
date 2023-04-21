// src/utils.ts
function R(e, t) {
  if (!e)
    throw new Error(t);
}
function i(e, t) {
  return typeof t === e;
}
function b(e) {
  return e instanceof Promise;
}
function g(e, t, n) {
  Object.defineProperty(e, t, n);
}
function l(e, t, n) {
  Object.defineProperty(e, t, { value: n });
}

// src/constants.ts
var y = Symbol.for("tinyspy:spy");

// src/internal.ts
var m = /* @__PURE__ */ new Set(), M = (e) => {
  e.called = !1, e.callCount = 0, e.calls = [], e.results = [];
}, C = (e) => (g(e, y, { value: { reset: () => M(e[y]) } }), e[y]), A = (e) => e[y] || C(e);
function I(e) {
  R(i("function", e) || i("undefined", e), "cannot spy on a non-function value");
  let t = function(...o) {
    let r = A(t);
    if (r.called = !0, r.callCount++, r.calls.push(o), r.next) {
      let [p, s] = r.next;
      if (r.results.push(r.next), r.next = null, p === "ok")
        return s;
      throw s;
    }
    let a, f = "ok";
    if (r.impl)
      try {
        a = r.impl.apply(this, o), f = "ok";
      } catch (p) {
        throw a = p, f = "error", r.results.push([f, p]), p;
      }
    let u = [f, a];
    if (b(a)) {
      let p = a.then((s) => u[1] = s).catch((s) => {
        throw u[0] = "error", u[1] = s, s;
      });
      Object.assign(p, a), a = p;
    }
    return r.results.push(u), a;
  };
  l(t, "_isMockFunction", !0), l(t, "length", e ? e.length : 0), l(t, "name", e && e.name || "spy");
  let n = A(t);
  return n.reset(), n.impl = e, t;
}
function v(e) {
  let t = A(e);
  g(e, "returns", {
    get: () => t.results.map(([, n]) => n)
  }), ["called", "callCount", "results", "calls", "reset", "impl"].forEach((n) => g(e, n, { get: () => t[n], set: (o) => t[n] = o })), l(e, "nextError", (n) => (t.next = ["error", n], t)), l(e, "nextResult", (n) => (t.next = ["ok", n], t));
}

// src/spy.ts
function z(e) {
  let t = I(e);
  return v(t), t;
}

// src/spyOn.ts
var P = (e, t) => Object.getOwnPropertyDescriptor(e, t);
function E(e, t, n) {
  R(!i("undefined", e), "spyOn could not find an object to spy upon"), R(i("object", e) || i("function", e), "cannot spyOn on a primitive value");
  let o = () => {
    if (!i("object", t))
      return [t, "value"];
    if ("getter" in t && "setter" in t)
      throw new Error("cannot spy on both getter and setter");
    if ("getter" in t)
      return [t.getter, "get"];
    if ("setter" in t)
      return [t.setter, "set"];
    throw new Error("specify getter or setter to spy on");
  }, [r, a] = o(), f = P(e, r), u = Object.getPrototypeOf(e), p = u && P(u, r), s = f || p;
  R(s || r in e, `${String(r)} does not exist`);
  let w = !1;
  a === "value" && s && !s.value && s.get && (a = "get", w = !0, n = s.get());
  let c;
  s ? c = s[a] : a !== "value" ? c = () => e[r] : c = e[r], n || (n = c);
  let d = I(n), O = (h) => {
    let { value: G, ...k } = s || {
      configurable: !0,
      writable: !0
    };
    a !== "value" && delete k.writable, k[a] = h, g(e, r, k);
  }, K = () => O(c), T = d[y];
  return l(T, "restore", K), l(T, "getOriginal", () => w ? c() : c), l(T, "willCall", (h) => (T.impl = h, d)), O(w ? () => d : d), m.add(d), d;
}
function W(e, t, n) {
  let o = E(e, t, n);
  return v(o), ["restore", "getOriginal", "willCall"].forEach((r) => {
    l(o, r, o[y][r]);
  }), o;
}

// src/restoreAll.ts
function Z() {
  for (let e of m)
    e.restore();
  m.clear();
}
export {
  I as createInternalSpy,
  A as getInternalState,
  E as internalSpyOn,
  Z as restoreAll,
  m as spies,
  z as spy,
  W as spyOn
};
