const import_meta_url =
  typeof document === 'undefined'
    ? require('url').pathToFileURL(__filename).href
    : (document.currentScript && document.currentScript.src) ||
      new URL('main.js', document.baseURI).href

export { import_meta_url }
