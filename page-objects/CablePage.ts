import { type Locator, Page, expect } from '@playwright/test';

export class CablePage {
  readonly page: Page;
  readonly baseURL = 'https://www.thomann.de/intl/cableguy.html';

  readonly acceptCookiesBtn: Locator;
  readonly cableBeginningBtn: Locator;
  readonly cableEndBtn: Locator;
  readonly searchFld: Locator;
  readonly manufacturerSection: Locator;
  readonly manufacturerCard: Locator;
  readonly displayedProducts: Locator;
  readonly cableItems: Locator;

  private articlesCount = 0;
  private plugMsgs: string[] = [];
  private randomBrand: string[] = [];

  constructor(page: Page) {
    this.page = page;
    this.acceptCookiesBtn = page.locator('.spicy-consent-bar__action-accept');
    this.cableBeginningBtn = page.locator('.cg-plugButton--left');
    this.cableEndBtn = page.locator('.cg-plugButton--right');
    this.searchFld = page.locator('input.cg-plugmodal__search__input');
    this.manufacturerSection = page
      .locator('.cg-brands.cg-section')
      .filter({ has: page.locator('.cg-brands__header') });
    this.manufacturerCard = this.manufacturerSection.locator('.cg-brands__item');
    this.displayedProducts = this.page.locator('.cg-articles-list > .fx-product-list-entry');
    this.cableItems = this.page.locator('.cg-plugItem__subheadline');
  }

  async open() {
    const resp = await this.page.goto(this.baseURL, { waitUntil: 'domcontentloaded' });
    expect(resp?.ok()).toBeTruthy();
    await expect(this.page).toHaveURL(/cableguy\.html/);
    //accept cookies
    await this.acceptCookiesBtn.click({ timeout: 1500 }).catch(() => {});
  }

  async selectCableBeginning() {
    await this.cableBeginningBtn.click();

    //get all plugs
    const plugNames = (await this.cableItems.allTextContents())
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    // Count, pick random index, get that item’s text
    const total = plugNames.length;
    if (total === 0) throw new Error('No plug items found');
    const idx = this.getRandomNumber(total);
    const name = plugNames[idx];
    await this.cableItems.nth(idx).scrollIntoViewIfNeeded();
    const respWait = this.page.waitForResponse(
      (r) => r.ok() && /(cableguy_ajax\.html|cableguy.*ajax)/i.test(r.url()),
      { timeout: 10000 },
    );
    this.page.waitForTimeout(1500);
    await this.cableItems.nth(idx).click();

    // parse response and collect all msg values
    const resp = await respWait;
    const data = await resp.json().catch(async () => JSON.parse(await resp.text()));
    this.plugMsgs = (data?.plugs?.plugs ?? [])
      .map((p: any) => String(p?.msg ?? '').trim())
      .filter(Boolean);
  }

  async selectCableEnd() {
    // pick random end from the list you already built
    const totalEnds = this.plugMsgs.length;
    if (!totalEnds) throw new Error('No plug messages found');
    const endIdx = this.getRandomNumber(totalEnds);

    // open end picker
    await this.cableEndBtn.click();

    // response wait and click simultaneously
    const [resp] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.ok() &&
          (r.request().resourceType() === 'xhr' || r.request().resourceType() === 'fetch') &&
          /(cableguy_ajax\.html|cableguy.*ajax)/i.test(r.url()),
        { timeout: 10000 },
      ),
      this.cableItems.nth(endIdx).click(),
    ]);

    // parse brands and pick a random one
    const data = await resp.json().catch(async () => JSON.parse(await resp.text()));
    const brands = (data?.brands ?? [])
      .map((b: any) => String(b?.brand ?? '').trim())
      .filter(Boolean);
    const totalBrands = brands.length;
    console.log('total brands from JSON: ' + totalBrands);
    if (!totalBrands) throw new Error('No manufacturers found in response');
    const brandIdx = this.getRandomNumber(totalBrands);
    const chosenBrand = brands[brandIdx];
    this.randomBrand = chosenBrand;
    const totalItemsCount = Number(
      (data?.brands ?? []).find(
        (b) => String(b?.brand).trim().toLowerCase() === chosenBrand.toLowerCase(),
      )?.count ?? 0,
    );

    console.log('total items count for a selected manufacturer: ' + totalItemsCount);
    this.articlesCount = totalItemsCount;
  }

  async getRandomBrand() {
    const item = this.page.locator('.cg-brands__item', {
      has: this.page.locator(`img[alt*="${this.randomBrand}" i]`),
    });
    console.log('Slected random manufacturer: ' + this.randomBrand);
    await item.click();

    //get count

    const productCount = parseInt(
      await this.page
        .locator(
          `.item:has(.cg-brands__item img[alt*="${this.randomBrand}" i]) .cg-brands__item__count`,
        )
        .innerText(),
      10,
    );
    console.log('Number of products displayed: ' + productCount);

    //assert the number of elements displayed:
    // will be asserted through the received html, instead of UI because UI returns all shadow elements instead of the only ones displayed.

    expect(productCount).toBe(this.articlesCount);
  }

  getRandomNumber(maxExclusive: number): number {
    return Math.floor(Math.random() * Math.floor(maxExclusive));
  }
}
