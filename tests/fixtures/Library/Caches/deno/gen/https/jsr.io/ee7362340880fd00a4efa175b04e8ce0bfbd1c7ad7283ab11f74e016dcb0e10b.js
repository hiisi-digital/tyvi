// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
// Bare keys may only contain ASCII letters,
// ASCII digits, underscores, and dashes (A-Za-z0-9_-).
function joinKeys(keys) {
  // Dotted keys are a sequence of bare or quoted keys joined with a dot.
  // This allows for grouping similar properties together:
  return keys.map((str) => {
    return str.length === 0 || str.match(/[^A-Za-z0-9_-]/) ? JSON.stringify(str) : str;
  }).join(".");
}
class Dumper {
  maxPad = 0;
  srcObject;
  output = [];
  #arrayTypeCache = new Map();
  constructor(srcObjc) {
    this.srcObject = srcObjc;
  }
  dump(fmtOptions = {}) {
    // deno-lint-ignore no-explicit-any
    this.output = this.#printObject(this.srcObject);
    this.output = this.#format(fmtOptions);
    return this.output;
  }
  #printObject(obj, keys = []) {
    const out = [];
    const props = Object.keys(obj);
    const inlineProps = [];
    const multilineProps = [];
    for (const prop of props) {
      if (this.#isSimplySerializable(obj[prop])) {
        inlineProps.push(prop);
      } else {
        multilineProps.push(prop);
      }
    }
    const sortedProps = inlineProps.concat(multilineProps);
    for (const prop of sortedProps) {
      const value = obj[prop];
      if (value instanceof Date) {
        out.push(this.#dateDeclaration([
          prop,
        ], value));
      } else if (typeof value === "string" || value instanceof RegExp) {
        out.push(this.#strDeclaration([
          prop,
        ], value.toString()));
      } else if (typeof value === "number") {
        out.push(this.#numberDeclaration([
          prop,
        ], value));
      } else if (typeof value === "boolean") {
        out.push(this.#boolDeclaration([
          prop,
        ], value));
      } else if (value instanceof Array) {
        const arrayType = this.#getTypeOfArray(value);
        if (arrayType === "ONLY_PRIMITIVE") {
          out.push(this.#arrayDeclaration([
            prop,
          ], value));
        } else if (arrayType === "ONLY_OBJECT_EXCLUDING_ARRAY") {
          // array of objects
          for (let i = 0; i < value.length; i++) {
            out.push("");
            out.push(this.#headerGroup([
              ...keys,
              prop,
            ]));
            out.push(...this.#printObject(value[i], [
              ...keys,
              prop,
            ]));
          }
        } else {
          // this is a complex array, use the inline format.
          const str = value.map((x) => this.#printAsInlineValue(x)).join(",");
          out.push(`${
            this.#declaration([
              prop,
            ])
          }[${str}]`);
        }
      } else if (typeof value === "object") {
        out.push("");
        out.push(this.#header([
          ...keys,
          prop,
        ]));
        if (value) {
          const toParse = value;
          out.push(...this.#printObject(toParse, [
            ...keys,
            prop,
          ]));
        }
        // out.push(...this._parse(value, `${path}${prop}.`));
      }
    }
    out.push("");
    return out;
  }
  #isPrimitive(value) {
    return value instanceof Date || value instanceof RegExp || [
      "string",
      "number",
      "boolean",
    ].includes(typeof value);
  }
  #getTypeOfArray(arr) {
    if (this.#arrayTypeCache.has(arr)) {
      return this.#arrayTypeCache.get(arr);
    }
    const type = this.#doGetTypeOfArray(arr);
    this.#arrayTypeCache.set(arr, type);
    return type;
  }
  #doGetTypeOfArray(arr) {
    if (!arr.length) {
      // any type should be fine
      return "ONLY_PRIMITIVE";
    }
    const onlyPrimitive = this.#isPrimitive(arr[0]);
    if (arr[0] instanceof Array) {
      return "MIXED";
    }
    for (let i = 1; i < arr.length; i++) {
      if (onlyPrimitive !== this.#isPrimitive(arr[i]) || arr[i] instanceof Array) {
        return "MIXED";
      }
    }
    return onlyPrimitive ? "ONLY_PRIMITIVE" : "ONLY_OBJECT_EXCLUDING_ARRAY";
  }
  #printAsInlineValue(value) {
    if (value instanceof Date) {
      return `"${this.#printDate(value)}"`;
    } else if (typeof value === "string" || value instanceof RegExp) {
      return JSON.stringify(value.toString());
    } else if (typeof value === "number") {
      return value;
    } else if (typeof value === "boolean") {
      return value.toString();
    } else if (value instanceof Array) {
      const str = value.map((x) => this.#printAsInlineValue(x)).join(",");
      return `[${str}]`;
    } else if (typeof value === "object") {
      if (!value) {
        throw new Error("Should never reach");
      }
      const str = Object.keys(value).map((key) => {
        return `${
          joinKeys([
            key,
          ])
        } = ${
          // deno-lint-ignore no-explicit-any
          this.#printAsInlineValue(value[key])}`;
      }).join(",");
      return `{${str}}`;
    }
    throw new Error("Should never reach");
  }
  #isSimplySerializable(value) {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ||
      value instanceof RegExp || value instanceof Date ||
      value instanceof Array && this.#getTypeOfArray(value) !== "ONLY_OBJECT_EXCLUDING_ARRAY";
  }
  #header(keys) {
    return `[${joinKeys(keys)}]`;
  }
  #headerGroup(keys) {
    return `[[${joinKeys(keys)}]]`;
  }
  #declaration(keys) {
    const title = joinKeys(keys);
    if (title.length > this.maxPad) {
      this.maxPad = title.length;
    }
    return `${title} = `;
  }
  #arrayDeclaration(keys, value) {
    return `${this.#declaration(keys)}${JSON.stringify(value)}`;
  }
  #strDeclaration(keys, value) {
    return `${this.#declaration(keys)}${JSON.stringify(value)}`;
  }
  #numberDeclaration(keys, value) {
    if (Number.isNaN(value)) {
      return `${this.#declaration(keys)}nan`;
    }
    switch (value) {
      case Infinity:
        return `${this.#declaration(keys)}inf`;
      case -Infinity:
        return `${this.#declaration(keys)}-inf`;
      default:
        return `${this.#declaration(keys)}${value}`;
    }
  }
  #boolDeclaration(keys, value) {
    return `${this.#declaration(keys)}${value}`;
  }
  #printDate(value) {
    function dtPad(v, lPad = 2) {
      return v.padStart(lPad, "0");
    }
    const m = dtPad((value.getUTCMonth() + 1).toString());
    const d = dtPad(value.getUTCDate().toString());
    const h = dtPad(value.getUTCHours().toString());
    const min = dtPad(value.getUTCMinutes().toString());
    const s = dtPad(value.getUTCSeconds().toString());
    const ms = dtPad(value.getUTCMilliseconds().toString(), 3);
    // formatted date
    const fData = `${value.getUTCFullYear()}-${m}-${d}T${h}:${min}:${s}.${ms}`;
    return fData;
  }
  #dateDeclaration(keys, value) {
    return `${this.#declaration(keys)}${this.#printDate(value)}`;
  }
  #format(options = {}) {
    const { keyAlignment = false } = options;
    const rDeclaration = /^(\".*\"|[^=]*)\s=/;
    const out = [];
    for (let i = 0; i < this.output.length; i++) {
      const l = this.output[i];
      // we keep empty entry for array of objects
      if (l[0] === "[" && l[1] !== "[") {
        // non-empty object with only subobjects as properties
        if (
          this.output[i + 1] === "" &&
          this.output[i + 2]?.slice(0, l.length) === l.slice(0, -1) + "."
        ) {
          i += 1;
          continue;
        }
        out.push(l);
      } else {
        if (keyAlignment) {
          const m = rDeclaration.exec(l);
          if (m && m[1]) {
            out.push(l.replace(m[1], m[1].padEnd(this.maxPad)));
          } else {
            out.push(l);
          }
        } else {
          out.push(l);
        }
      }
    }
    // Cleaning multiple spaces
    const cleanedOutput = [];
    for (let i = 0; i < out.length; i++) {
      const l = out[i];
      if (!(l === "" && out[i + 1] === "")) {
        cleanedOutput.push(l);
      }
    }
    return cleanedOutput;
  }
}
/**
 * Converts an object to a {@link https://toml.io | TOML} string.
 *
 * @example Usage
 * ```ts
 * import { stringify } from "@std/toml/stringify";
 * import { assertEquals } from "@std/assert";
 *
 * const obj = {
 *   title: "TOML Example",
 *   owner: {
 *     name: "Bob",
 *     bio: "Bob is a cool guy",
 *  }
 * };
 * const tomlString = stringify(obj);
 * assertEquals(tomlString, `title = "TOML Example"\n\n[owner]\nname = "Bob"\nbio = "Bob is a cool guy"\n`);
 * ```
 * @param obj Source object
 * @param options Options for stringifying.
 * @returns TOML string
 */ export function stringify(obj, options) {
  return new Dumper(obj).dump(options).join("\n");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvdG9tbC8xLjAuMTEvc3RyaW5naWZ5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbi8vIEJhcmUga2V5cyBtYXkgb25seSBjb250YWluIEFTQ0lJIGxldHRlcnMsXG4vLyBBU0NJSSBkaWdpdHMsIHVuZGVyc2NvcmVzLCBhbmQgZGFzaGVzIChBLVphLXowLTlfLSkuXG5mdW5jdGlvbiBqb2luS2V5cyhrZXlzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIC8vIERvdHRlZCBrZXlzIGFyZSBhIHNlcXVlbmNlIG9mIGJhcmUgb3IgcXVvdGVkIGtleXMgam9pbmVkIHdpdGggYSBkb3QuXG4gIC8vIFRoaXMgYWxsb3dzIGZvciBncm91cGluZyBzaW1pbGFyIHByb3BlcnRpZXMgdG9nZXRoZXI6XG4gIHJldHVybiBrZXlzXG4gICAgLm1hcCgoc3RyOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgcmV0dXJuIHN0ci5sZW5ndGggPT09IDAgfHwgc3RyLm1hdGNoKC9bXkEtWmEtejAtOV8tXS8pXG4gICAgICAgID8gSlNPTi5zdHJpbmdpZnkoc3RyKVxuICAgICAgICA6IHN0cjtcbiAgICB9KVxuICAgIC5qb2luKFwiLlwiKTtcbn1cblxudHlwZSBBcnJheVR5cGUgPVxuICB8IFwiT05MWV9QUklNSVRJVkVcIlxuICB8IFwiT05MWV9PQkpFQ1RfRVhDTFVESU5HX0FSUkFZXCJcbiAgfCBcIk1JWEVEXCI7XG5cbi8qKlxuICogT3B0aW9ucyBmb3Ige0BsaW5rY29kZSBzdHJpbmdpZnl9LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0cmluZ2lmeU9wdGlvbnMge1xuICAvKipcbiAgICogRGVmaW5lIGlmIHRoZSBrZXlzIHNob3VsZCBiZSBhbGlnbmVkIG9yIG5vdC5cbiAgICpcbiAgICogQGRlZmF1bHQge2ZhbHNlfVxuICAgKi9cbiAga2V5QWxpZ25tZW50PzogYm9vbGVhbjtcbn1cblxuY2xhc3MgRHVtcGVyIHtcbiAgbWF4UGFkID0gMDtcbiAgc3JjT2JqZWN0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgb3V0cHV0OiBzdHJpbmdbXSA9IFtdO1xuICAjYXJyYXlUeXBlQ2FjaGUgPSBuZXcgTWFwPHVua25vd25bXSwgQXJyYXlUeXBlPigpO1xuICBjb25zdHJ1Y3RvcihzcmNPYmpjOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikge1xuICAgIHRoaXMuc3JjT2JqZWN0ID0gc3JjT2JqYztcbiAgfVxuICBkdW1wKGZtdE9wdGlvbnM6IFN0cmluZ2lmeU9wdGlvbnMgPSB7fSk6IHN0cmluZ1tdIHtcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIHRoaXMub3V0cHV0ID0gdGhpcy4jcHJpbnRPYmplY3QodGhpcy5zcmNPYmplY3QgYXMgYW55KTtcbiAgICB0aGlzLm91dHB1dCA9IHRoaXMuI2Zvcm1hdChmbXRPcHRpb25zKTtcbiAgICByZXR1cm4gdGhpcy5vdXRwdXQ7XG4gIH1cbiAgI3ByaW50T2JqZWN0KG9iajogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIGtleXM6IHN0cmluZ1tdID0gW10pOiBzdHJpbmdbXSB7XG4gICAgY29uc3Qgb3V0ID0gW107XG4gICAgY29uc3QgcHJvcHMgPSBPYmplY3Qua2V5cyhvYmopO1xuICAgIGNvbnN0IGlubGluZVByb3BzID0gW107XG4gICAgY29uc3QgbXVsdGlsaW5lUHJvcHMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcHMpIHtcbiAgICAgIGlmICh0aGlzLiNpc1NpbXBseVNlcmlhbGl6YWJsZShvYmpbcHJvcF0pKSB7XG4gICAgICAgIGlubGluZVByb3BzLnB1c2gocHJvcCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtdWx0aWxpbmVQcm9wcy5wdXNoKHByb3ApO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBzb3J0ZWRQcm9wcyA9IGlubGluZVByb3BzLmNvbmNhdChtdWx0aWxpbmVQcm9wcyk7XG4gICAgZm9yIChjb25zdCBwcm9wIG9mIHNvcnRlZFByb3BzKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IG9ialtwcm9wXTtcbiAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgb3V0LnB1c2godGhpcy4jZGF0ZURlY2xhcmF0aW9uKFtwcm9wXSwgdmFsdWUpKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiIHx8IHZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgIG91dC5wdXNoKHRoaXMuI3N0ckRlY2xhcmF0aW9uKFtwcm9wXSwgdmFsdWUudG9TdHJpbmcoKSkpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgb3V0LnB1c2godGhpcy4jbnVtYmVyRGVjbGFyYXRpb24oW3Byb3BdLCB2YWx1ZSkpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgICAgIG91dC5wdXNoKHRoaXMuI2Jvb2xEZWNsYXJhdGlvbihbcHJvcF0sIHZhbHVlKSk7XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICB2YWx1ZSBpbnN0YW5jZW9mIEFycmF5XG4gICAgICApIHtcbiAgICAgICAgY29uc3QgYXJyYXlUeXBlID0gdGhpcy4jZ2V0VHlwZU9mQXJyYXkodmFsdWUpO1xuICAgICAgICBpZiAoYXJyYXlUeXBlID09PSBcIk9OTFlfUFJJTUlUSVZFXCIpIHtcbiAgICAgICAgICBvdXQucHVzaCh0aGlzLiNhcnJheURlY2xhcmF0aW9uKFtwcm9wXSwgdmFsdWUpKTtcbiAgICAgICAgfSBlbHNlIGlmIChhcnJheVR5cGUgPT09IFwiT05MWV9PQkpFQ1RfRVhDTFVESU5HX0FSUkFZXCIpIHtcbiAgICAgICAgICAvLyBhcnJheSBvZiBvYmplY3RzXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgb3V0LnB1c2goXCJcIik7XG4gICAgICAgICAgICBvdXQucHVzaCh0aGlzLiNoZWFkZXJHcm91cChbLi4ua2V5cywgcHJvcF0pKTtcbiAgICAgICAgICAgIG91dC5wdXNoKC4uLnRoaXMuI3ByaW50T2JqZWN0KHZhbHVlW2ldLCBbLi4ua2V5cywgcHJvcF0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdGhpcyBpcyBhIGNvbXBsZXggYXJyYXksIHVzZSB0aGUgaW5saW5lIGZvcm1hdC5cbiAgICAgICAgICBjb25zdCBzdHIgPSB2YWx1ZS5tYXAoKHgpID0+IHRoaXMuI3ByaW50QXNJbmxpbmVWYWx1ZSh4KSkuam9pbihcIixcIik7XG4gICAgICAgICAgb3V0LnB1c2goYCR7dGhpcy4jZGVjbGFyYXRpb24oW3Byb3BdKX1bJHtzdHJ9XWApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBvdXQucHVzaChcIlwiKTtcbiAgICAgICAgb3V0LnB1c2godGhpcy4jaGVhZGVyKFsuLi5rZXlzLCBwcm9wXSkpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICBjb25zdCB0b1BhcnNlID0gdmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgICAgICAgb3V0LnB1c2goLi4udGhpcy4jcHJpbnRPYmplY3QodG9QYXJzZSwgWy4uLmtleXMsIHByb3BdKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gb3V0LnB1c2goLi4udGhpcy5fcGFyc2UodmFsdWUsIGAke3BhdGh9JHtwcm9wfS5gKSk7XG4gICAgICB9XG4gICAgfVxuICAgIG91dC5wdXNoKFwiXCIpO1xuICAgIHJldHVybiBvdXQ7XG4gIH1cbiAgI2lzUHJpbWl0aXZlKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgRGF0ZSB8fFxuICAgICAgdmFsdWUgaW5zdGFuY2VvZiBSZWdFeHAgfHxcbiAgICAgIFtcInN0cmluZ1wiLCBcIm51bWJlclwiLCBcImJvb2xlYW5cIl0uaW5jbHVkZXModHlwZW9mIHZhbHVlKTtcbiAgfVxuICAjZ2V0VHlwZU9mQXJyYXkoYXJyOiB1bmtub3duW10pOiBBcnJheVR5cGUge1xuICAgIGlmICh0aGlzLiNhcnJheVR5cGVDYWNoZS5oYXMoYXJyKSkge1xuICAgICAgcmV0dXJuIHRoaXMuI2FycmF5VHlwZUNhY2hlLmdldChhcnIpITtcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IHRoaXMuI2RvR2V0VHlwZU9mQXJyYXkoYXJyKTtcbiAgICB0aGlzLiNhcnJheVR5cGVDYWNoZS5zZXQoYXJyLCB0eXBlKTtcbiAgICByZXR1cm4gdHlwZTtcbiAgfVxuICAjZG9HZXRUeXBlT2ZBcnJheShhcnI6IHVua25vd25bXSk6IEFycmF5VHlwZSB7XG4gICAgaWYgKCFhcnIubGVuZ3RoKSB7XG4gICAgICAvLyBhbnkgdHlwZSBzaG91bGQgYmUgZmluZVxuICAgICAgcmV0dXJuIFwiT05MWV9QUklNSVRJVkVcIjtcbiAgICB9XG5cbiAgICBjb25zdCBvbmx5UHJpbWl0aXZlID0gdGhpcy4jaXNQcmltaXRpdmUoYXJyWzBdKTtcbiAgICBpZiAoYXJyWzBdIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgIHJldHVybiBcIk1JWEVEXCI7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoXG4gICAgICAgIG9ubHlQcmltaXRpdmUgIT09IHRoaXMuI2lzUHJpbWl0aXZlKGFycltpXSkgfHwgYXJyW2ldIGluc3RhbmNlb2YgQXJyYXlcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gXCJNSVhFRFwiO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb25seVByaW1pdGl2ZSA/IFwiT05MWV9QUklNSVRJVkVcIiA6IFwiT05MWV9PQkpFQ1RfRVhDTFVESU5HX0FSUkFZXCI7XG4gIH1cbiAgI3ByaW50QXNJbmxpbmVWYWx1ZSh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB8IG51bWJlciB7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgcmV0dXJuIGBcIiR7dGhpcy4jcHJpbnREYXRlKHZhbHVlKX1cImA7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh2YWx1ZS50b1N0cmluZygpKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSBcImJvb2xlYW5cIikge1xuICAgICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIHZhbHVlIGluc3RhbmNlb2YgQXJyYXlcbiAgICApIHtcbiAgICAgIGNvbnN0IHN0ciA9IHZhbHVlLm1hcCgoeCkgPT4gdGhpcy4jcHJpbnRBc0lubGluZVZhbHVlKHgpKS5qb2luKFwiLFwiKTtcbiAgICAgIHJldHVybiBgWyR7c3RyfV1gO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiKSB7XG4gICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBuZXZlciByZWFjaFwiKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHN0ciA9IE9iamVjdC5rZXlzKHZhbHVlKS5tYXAoKGtleSkgPT4ge1xuICAgICAgICByZXR1cm4gYCR7am9pbktleXMoW2tleV0pfSA9ICR7XG4gICAgICAgICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICAgICAgICB0aGlzLiNwcmludEFzSW5saW5lVmFsdWUoKHZhbHVlIGFzIGFueSlba2V5XSl9YDtcbiAgICAgIH0pLmpvaW4oXCIsXCIpO1xuICAgICAgcmV0dXJuIGB7JHtzdHJ9fWA7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIG5ldmVyIHJlYWNoXCIpO1xuICB9XG4gICNpc1NpbXBseVNlcmlhbGl6YWJsZSh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoXG4gICAgICB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgfHxcbiAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiB8fFxuICAgICAgdHlwZW9mIHZhbHVlID09PSBcImJvb2xlYW5cIiB8fFxuICAgICAgdmFsdWUgaW5zdGFuY2VvZiBSZWdFeHAgfHxcbiAgICAgIHZhbHVlIGluc3RhbmNlb2YgRGF0ZSB8fFxuICAgICAgKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkgJiZcbiAgICAgICAgdGhpcy4jZ2V0VHlwZU9mQXJyYXkodmFsdWUpICE9PSBcIk9OTFlfT0JKRUNUX0VYQ0xVRElOR19BUlJBWVwiKVxuICAgICk7XG4gIH1cbiAgI2hlYWRlcihrZXlzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBbJHtqb2luS2V5cyhrZXlzKX1dYDtcbiAgfVxuICAjaGVhZGVyR3JvdXAoa2V5czogc3RyaW5nW10pOiBzdHJpbmcge1xuICAgIHJldHVybiBgW1ske2pvaW5LZXlzKGtleXMpfV1dYDtcbiAgfVxuICAjZGVjbGFyYXRpb24oa2V5czogc3RyaW5nW10pOiBzdHJpbmcge1xuICAgIGNvbnN0IHRpdGxlID0gam9pbktleXMoa2V5cyk7XG4gICAgaWYgKHRpdGxlLmxlbmd0aCA+IHRoaXMubWF4UGFkKSB7XG4gICAgICB0aGlzLm1heFBhZCA9IHRpdGxlLmxlbmd0aDtcbiAgICB9XG4gICAgcmV0dXJuIGAke3RpdGxlfSA9IGA7XG4gIH1cbiAgI2FycmF5RGVjbGFyYXRpb24oa2V5czogc3RyaW5nW10sIHZhbHVlOiB1bmtub3duW10pOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0aGlzLiNkZWNsYXJhdGlvbihrZXlzKX0ke0pTT04uc3RyaW5naWZ5KHZhbHVlKX1gO1xuICB9XG4gICNzdHJEZWNsYXJhdGlvbihrZXlzOiBzdHJpbmdbXSwgdmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke3RoaXMuI2RlY2xhcmF0aW9uKGtleXMpfSR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfWA7XG4gIH1cbiAgI251bWJlckRlY2xhcmF0aW9uKGtleXM6IHN0cmluZ1tdLCB2YWx1ZTogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBpZiAoTnVtYmVyLmlzTmFOKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGAke3RoaXMuI2RlY2xhcmF0aW9uKGtleXMpfW5hbmA7XG4gICAgfVxuICAgIHN3aXRjaCAodmFsdWUpIHtcbiAgICAgIGNhc2UgSW5maW5pdHk6XG4gICAgICAgIHJldHVybiBgJHt0aGlzLiNkZWNsYXJhdGlvbihrZXlzKX1pbmZgO1xuICAgICAgY2FzZSAtSW5maW5pdHk6XG4gICAgICAgIHJldHVybiBgJHt0aGlzLiNkZWNsYXJhdGlvbihrZXlzKX0taW5mYDtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBgJHt0aGlzLiNkZWNsYXJhdGlvbihrZXlzKX0ke3ZhbHVlfWA7XG4gICAgfVxuICB9XG4gICNib29sRGVjbGFyYXRpb24oa2V5czogc3RyaW5nW10sIHZhbHVlOiBib29sZWFuKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGhpcy4jZGVjbGFyYXRpb24oa2V5cyl9JHt2YWx1ZX1gO1xuICB9XG4gICNwcmludERhdGUodmFsdWU6IERhdGUpOiBzdHJpbmcge1xuICAgIGZ1bmN0aW9uIGR0UGFkKHY6IHN0cmluZywgbFBhZCA9IDIpOiBzdHJpbmcge1xuICAgICAgcmV0dXJuIHYucGFkU3RhcnQobFBhZCwgXCIwXCIpO1xuICAgIH1cbiAgICBjb25zdCBtID0gZHRQYWQoKHZhbHVlLmdldFVUQ01vbnRoKCkgKyAxKS50b1N0cmluZygpKTtcbiAgICBjb25zdCBkID0gZHRQYWQodmFsdWUuZ2V0VVRDRGF0ZSgpLnRvU3RyaW5nKCkpO1xuICAgIGNvbnN0IGggPSBkdFBhZCh2YWx1ZS5nZXRVVENIb3VycygpLnRvU3RyaW5nKCkpO1xuICAgIGNvbnN0IG1pbiA9IGR0UGFkKHZhbHVlLmdldFVUQ01pbnV0ZXMoKS50b1N0cmluZygpKTtcbiAgICBjb25zdCBzID0gZHRQYWQodmFsdWUuZ2V0VVRDU2Vjb25kcygpLnRvU3RyaW5nKCkpO1xuICAgIGNvbnN0IG1zID0gZHRQYWQodmFsdWUuZ2V0VVRDTWlsbGlzZWNvbmRzKCkudG9TdHJpbmcoKSwgMyk7XG4gICAgLy8gZm9ybWF0dGVkIGRhdGVcbiAgICBjb25zdCBmRGF0YSA9IGAke3ZhbHVlLmdldFVUQ0Z1bGxZZWFyKCl9LSR7bX0tJHtkfVQke2h9OiR7bWlufToke3N9LiR7bXN9YDtcbiAgICByZXR1cm4gZkRhdGE7XG4gIH1cbiAgI2RhdGVEZWNsYXJhdGlvbihrZXlzOiBzdHJpbmdbXSwgdmFsdWU6IERhdGUpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0aGlzLiNkZWNsYXJhdGlvbihrZXlzKX0ke3RoaXMuI3ByaW50RGF0ZSh2YWx1ZSl9YDtcbiAgfVxuICAjZm9ybWF0KG9wdGlvbnM6IFN0cmluZ2lmeU9wdGlvbnMgPSB7fSk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCB7IGtleUFsaWdubWVudCA9IGZhbHNlIH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IHJEZWNsYXJhdGlvbiA9IC9eKFxcXCIuKlxcXCJ8W149XSopXFxzPS87XG4gICAgY29uc3Qgb3V0ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm91dHB1dC5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgbCA9IHRoaXMub3V0cHV0W2ldIGFzIHN0cmluZztcbiAgICAgIC8vIHdlIGtlZXAgZW1wdHkgZW50cnkgZm9yIGFycmF5IG9mIG9iamVjdHNcbiAgICAgIGlmIChsWzBdID09PSBcIltcIiAmJiBsWzFdICE9PSBcIltcIikge1xuICAgICAgICAvLyBub24tZW1wdHkgb2JqZWN0IHdpdGggb25seSBzdWJvYmplY3RzIGFzIHByb3BlcnRpZXNcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRoaXMub3V0cHV0W2kgKyAxXSA9PT0gXCJcIiAmJlxuICAgICAgICAgIHRoaXMub3V0cHV0W2kgKyAyXT8uc2xpY2UoMCwgbC5sZW5ndGgpID09PSBsLnNsaWNlKDAsIC0xKSArIFwiLlwiXG4gICAgICAgICkge1xuICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBvdXQucHVzaChsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChrZXlBbGlnbm1lbnQpIHtcbiAgICAgICAgICBjb25zdCBtID0gckRlY2xhcmF0aW9uLmV4ZWMobCk7XG4gICAgICAgICAgaWYgKG0gJiYgbVsxXSkge1xuICAgICAgICAgICAgb3V0LnB1c2gobC5yZXBsYWNlKG1bMV0sIG1bMV0ucGFkRW5kKHRoaXMubWF4UGFkKSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQucHVzaChsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0LnB1c2gobCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQ2xlYW5pbmcgbXVsdGlwbGUgc3BhY2VzXG4gICAgY29uc3QgY2xlYW5lZE91dHB1dCA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBsID0gb3V0W2ldIGFzIHN0cmluZztcbiAgICAgIGlmICghKGwgPT09IFwiXCIgJiYgb3V0W2kgKyAxXSA9PT0gXCJcIikpIHtcbiAgICAgICAgY2xlYW5lZE91dHB1dC5wdXNoKGwpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2xlYW5lZE91dHB1dDtcbiAgfVxufVxuXG4vKipcbiAqIENvbnZlcnRzIGFuIG9iamVjdCB0byBhIHtAbGluayBodHRwczovL3RvbWwuaW8gfCBUT01MfSBzdHJpbmcuXG4gKlxuICogQGV4YW1wbGUgVXNhZ2VcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBzdHJpbmdpZnkgfSBmcm9tIFwiQHN0ZC90b21sL3N0cmluZ2lmeVwiO1xuICogaW1wb3J0IHsgYXNzZXJ0RXF1YWxzIH0gZnJvbSBcIkBzdGQvYXNzZXJ0XCI7XG4gKlxuICogY29uc3Qgb2JqID0ge1xuICogICB0aXRsZTogXCJUT01MIEV4YW1wbGVcIixcbiAqICAgb3duZXI6IHtcbiAqICAgICBuYW1lOiBcIkJvYlwiLFxuICogICAgIGJpbzogXCJCb2IgaXMgYSBjb29sIGd1eVwiLFxuICogIH1cbiAqIH07XG4gKiBjb25zdCB0b21sU3RyaW5nID0gc3RyaW5naWZ5KG9iaik7XG4gKiBhc3NlcnRFcXVhbHModG9tbFN0cmluZywgYHRpdGxlID0gXCJUT01MIEV4YW1wbGVcIlxcblxcbltvd25lcl1cXG5uYW1lID0gXCJCb2JcIlxcbmJpbyA9IFwiQm9iIGlzIGEgY29vbCBndXlcIlxcbmApO1xuICogYGBgXG4gKiBAcGFyYW0gb2JqIFNvdXJjZSBvYmplY3RcbiAqIEBwYXJhbSBvcHRpb25zIE9wdGlvbnMgZm9yIHN0cmluZ2lmeWluZy5cbiAqIEByZXR1cm5zIFRPTUwgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnkoXG4gIG9iajogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIG9wdGlvbnM/OiBTdHJpbmdpZnlPcHRpb25zLFxuKTogc3RyaW5nIHtcbiAgcmV0dXJuIG5ldyBEdW1wZXIob2JqKS5kdW1wKG9wdGlvbnMpLmpvaW4oXCJcXG5cIik7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEs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
// denoCacheMetadata=9915958584901434785,13747083824968478488
