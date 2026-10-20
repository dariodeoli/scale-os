// Focal review uses the shared real-component harness; transport is synthetic.
process.env.QA_FLOWS='contracts';
process.env.QA_VIEWPORTS=JSON.stringify([[320,844],[390,844],[1440,1000]]);
process.env.QA_CONTRACT_REVIEW='1';
process.env.QA_SCREENSHOT_DIR=process.env.QA_SCREENSHOT_DIR||'/tmp/scale-contracts-307-shots';
process.env.OUT=process.env.OUT||'/tmp/scale-contracts-307.json';
await import('./qa-mobile-actions-295.mjs');
