"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
async function globalSetup(config) {
    console.log('Starting global test setup...');
    // Create a browser instance for setup
    const browser = await test_1.chromium.launch({
        channel: 'chrome'
    });
    // Perform any global setup tasks here
    console.log('Browser launched for setup');
    // Close the setup browser
    await browser.close();
    console.log('Global test setup completed');
}
exports.default = globalSetup;
//# sourceMappingURL=global-setup.js.map