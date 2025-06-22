"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function globalTeardown(config) {
    console.log('Starting global test teardown...');
    // Perform any global cleanup tasks here
    // For example, cleaning up test data, closing connections, etc.
    console.log('Global test teardown completed');
}
exports.default = globalTeardown;
//# sourceMappingURL=global-teardown.js.map