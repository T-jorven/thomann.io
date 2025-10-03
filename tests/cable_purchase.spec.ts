import { test, expect } from '@playwright/test';
import { CablePage } from '../page-objects/CablePage';

test.describe(' Cable Page flow', () => {
  test.use({
    viewport: { width: 1366, height: 900 },
  });

  test('open the cable page', async ({ page }, testInfo) => {
    const cablePage = new CablePage(page);
    await cablePage.open();
    await cablePage.selectCableBeginning();
    await cablePage.selectCableEnd();
  
  });
});
