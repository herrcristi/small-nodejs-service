/**
 * Validation utils
 *
 * shared rules for values that end up in a query string, a path, a pattern, an email or an object key
 */
const Joi = require('joi');

const Public = {
  /**
   * an email used as a username: a conservative set of characters
   * (no space, & = % / ? # < > quotes, backslash, ...) so it cannot change the meaning of a query string,
   * a path, a pattern or the markup of an email. It is always compared as a whole, never expanded into those
   */
  EmailPattern: /^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+$/,

  /**
   * ids that come from a header (tenant, request): letters, digits, '_' and '-'
   */
  IDPattern: /^[A-Za-z0-9_-]{1,64}$/,

  /**
   * keys that must never be accepted from a client as object keys (they change the prototype of the object)
   */
  ForbiddenKeys: new Set(['__proto__', 'constructor', 'prototype']),

  /**
   * the joi rule for an email (chain .required() etc. as needed)
   */
  email: () =>
    Joi.string()
      .email({ tlds: { allow: false } })
      .pattern(Public.EmailPattern, 'email characters')
      .min(1)
      .max(128),

  /**
   * check an id coming from a header
   * returns the id or undefined
   */
  safeID: (val) => {
    return typeof val === 'string' && Public.IDPattern.test(val) ? val : undefined;
  },

  /**
   * find a forbidden key (at any depth) or a nesting that is too deep
   * returns { key } / { tooDeep: true } or null when the value is clean
   */
  findUnsafe: (value, maxDepth = 64) => {
    if (value === null || typeof value !== 'object') {
      return null;
    }

    // iterative, a deep value must not overflow the stack
    const stack = [{ val: value, depth: 1 }];
    while (stack.length) {
      const { val, depth } = stack.pop();
      if (depth > maxDepth) {
        return { tooDeep: true };
      }

      for (const key of Object.keys(val)) {
        if (Public.ForbiddenKeys.has(key)) {
          return { key };
        }

        const child = val[key];
        if (child !== null && typeof child === 'object') {
          stack.push({ val: child, depth: depth + 1 });
        }
      }
    }

    return null;
  },
};

module.exports = { ...Public };
