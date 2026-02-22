const runtimePath = process.env.NODE_ENV === "production" ? "../dist/index.mjs" : "./app";
const runtimeModule = await import(runtimePath);

export default runtimeModule.default;
