// Compatibility declaration for Next's server route type-checking.
// Puppeteer's runtime import remains the source of truth.
declare namespace puppeteer {
  interface Browser {
    newPage(): Promise<any>;
    close(): Promise<void>;
  }
}
