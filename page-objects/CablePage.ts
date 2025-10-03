import { type Locator, Page, expect } from '@playwright/test';

export class CablePage {
  readonly page: Page;
  readonly baseURL = 'https://www.thomann.de/intl/cableguy.html';

  readonly acceptCookiesBtn: Locator;
  readonly cableBeginningBtn: Locator;
  readonly cableEndBtn: Locator;
  readonly brandAlt: string;

  constructor(page: Page) {
    this.page = page;
    this.acceptCookiesBtn = page.locator('.spicy-consent-bar__action-accept'); // locale-proof
    this.cableBeginningBtn = page.locator('.cg-plugButton--left');
    this.cableEndBtn = page.locator('.cg-plugButton--right');
    this.brandAlt = 'Sennheiser';
  }

  // Scoped image inside a slot
  private slotImage(slot: 'begin' | 'end') {
    const root = slot === 'begin' ? this.cableBeginningBtn : this.cableEndBtn;
    return root.locator('img.cg-plugImage');
  }

  // Card in the modal identified by image token (e.g., "bnc_female")
  private modalCardByToken(token: string) {
    return this.page.locator(`.cg-plugItem:has(img.cg-plugImage[src*="${token}"])`);
  }

  async open() {
    const resp = await this.page.goto(this.baseURL, { waitUntil: 'domcontentloaded' });
    expect(resp?.ok()).toBeTruthy();
    await expect(this.page).toHaveURL(/cableguy\.html/);
    await this.acceptCookiesBtn.click({ timeout: 1500 }).catch(() => {});
  }

  // Generic select+verify (works for both slots)
  async selectSlotByToken(slot: 'begin' | 'end', token: string) {
    const slotBtn = slot === 'begin' ? this.cableBeginningBtn : this.cableEndBtn;
    await slotBtn.click(); // open picker
    await this.modalCardByToken(token).click(); // pick item by image src token
    await expect(this.slotImage(slot)) // verify selected in slot
      .toHaveAttribute('src', new RegExp(token));
  }

  // Convenience wrappers
  async selectCableBeginning() {
    await this.selectSlotByToken('begin', 'bnc_female');
  }
  async selectCableEnd() {
    await this.selectSlotByToken('end', 'bnc_male');
  }

 
}
