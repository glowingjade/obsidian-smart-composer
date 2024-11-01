# Development Notes

## PGlite in Obsidian Environment

PGlite typically uses the `node:fs` module to load bundle files. However, Obsidian plugins run in a browser-like environment where `node:fs` is not available. This presents a challenge in implementing PGlite in Obsidian's environment.

To address this, we developed a workaround in `src/database/DatabaseManager.ts`:

1. Manually fetch required PGlite resources (Postgres data, WebAssembly module, and Vector extension).
2. Use PGlite's option to directly set bundle files or URLs when initializing the database.

This approach allows PGlite to function in Obsidian's browser-like environment without relying on `node:fs`.

In `esbuild.config.mjs`, we set the `process` variable to an empty object to prevent PGlite from detecting a Node environment:

```javascript:esbuild.config.mjs
define: {
  // ... other definitions ...
  process: '{}',
  // ... other definitions ...
},
```

While this solution works currently, we should be aware that setting `process` to an empty object might cause issues with other libraries that rely on this variable. We'll monitor for any potential problems and explore alternative solutions if needed.

## ESM Compatibility Shim for PGlite

Our project faces a challenge because we use the PGlite module, which is written in ECMAScript modules (ESM) and doesn't support CommonJS directly. However, our Obsidian plugin is built using CommonJS for broader compatibility. This mismatch creates issues, particularly with ESM-specific features like `import.meta.url` that PGlite relies on.

To address this, we've implemented a shim in `import-meta-url-shim.js`. This shim provides a workaround for the `import.meta.url` feature, allowing it to function in our CommonJS environment. We inject this shim and define `import.meta.url` in our `esbuild.config.mjs`:

```javascript:esbuild.config.mjs
define: {
  // ... other definitions ...
  'import.meta.url': 'import_meta_url',
  // ... other definitions ...
},
inject: [path.resolve('import-meta-url-shim.js')],
```

By implementing this shim, we can use PGlite (an ESM module) within our CommonJS-based Obsidian plugin. It ensures that ESM-specific features like `import.meta.url` work correctly, bridging the gap between ESM and CommonJS environments.

## Memory Leak During Plugin Reloading

A memory leak has been identified when reloading the plugin. This may not be critical for end-users who typically don't reload the plugin frequently, but it can become problematic for developers who reload often during the development process. If you experience Obsidian becoming unresponsive or slow after reloading the plugin multiple times, it may be due to this memory leak. We are actively investigating the root cause and working on potential fixes. Any reports or fixes in this area are appreciated.
