const runtimePath = process.env.NODE_ENV === "production" ? "../dist/index.mjs" : "./runtime.js";
const runtimeModule = await import(runtimePath);

export default runtimeModule.default;
