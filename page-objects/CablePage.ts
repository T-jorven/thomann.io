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

  private lastBrands: { brand: string; count: number }[] = [];
  private articlesCount = 0;
  private plugMsgs: string[] = [];
  private randomBrand: string[] = [];

  constructor(page: Page) {
    this.page = page;
    this.acceptCookiesBtn = page.locator('.spicy-consent-bar__action-accept'); // locale-proof
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

  async selectCableBeginning() {
    await this.cableBeginningBtn.click();
    // open picker
    //search for the needed type

    //get all plugs
    // 1) Get all items’ texts
    //const items = this.page.locator('.cg-plugItem__subheadline');
    const plugNames = (await this.cableItems.allTextContents())
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    // 2) Count, pick random index, get that item’s text
    const total = plugNames.length;
    if (total === 0) throw new Error('No plug items found');

    const idx = Math.floor(Math.random() * total);
    const name = plugNames[idx];

    //console.log({ total, idx, name });

    // 3) (optional) act on the same DOM item
    // use the locator index to click/scroll, staying in sync with the chosen text
    await this.cableItems.nth(idx).scrollIntoViewIfNeeded();
    // before the click

    const respWait = this.page.waitForResponse(
      (r) => r.ok() && /(cableguy_ajax\.html|cableguy.*ajax)/i.test(r.url()),
      { timeout: 10000 },
    );
    this.page.waitForTimeout(1500);
    await this.cableItems.nth(idx).click(); // triggers the request
    // parse response and collect all msg values
    const resp = await respWait;
    const data = await resp.json().catch(async () => JSON.parse(await resp.text()));
    this.plugMsgs = (data?.plugs?.plugs ?? [])
      .map((p: any) => String(p?.msg ?? '').trim())
      .filter(Boolean);

    // optional: return them
    // console.log('Plugs End: ' + this.plugMsgs);
    return this.plugMsgs;
  }

  async selectCableEnd() {
    // pick random end from the list you already built
    const totalEnds = this.plugMsgs.length;
    if (!totalEnds) throw new Error('No plug messages found');
    const endIdx = Math.floor(Math.random() * totalEnds);

    // open end picker
    await this.cableEndBtn.click();
    await this.cableItems.nth(endIdx).scrollIntoViewIfNeeded();

    // arm response wait and click simultaneously
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
    if (!totalBrands) throw new Error('No brands found in response');

    const brandIdx = Math.floor(Math.random() * totalBrands);
    const chosenBrand = brands[brandIdx];

    // store if you want to reuse later
    this.randomBrand = chosenBrand;
    this.articlesCount = totalBrands;
    console.log({ totalEnds, endIdx, totalBrands, brandIdx, chosenBrand });
    return chosenBrand;
  }

  // Call this right around the click that triggers the update
  async getBrandsFromUpdate() {
    const resp = await this.page.waitForResponse(
      (r) => r.ok() && /cableguy.*ajax|cableguy_ajax\.html/i.test(r.url()), // adjust if needed
    );

    //get cable names:
    const html = await resp.text();
    const m = html.match(/"cableData"\s*:\s*(\[[\s\S]*?\])/);
    if (!m) throw new Error('cableData not found in response');

    const cableData = JSON.parse(m[1]);
    const cableNames = cableData.map((c) => c.name);
    console.log(cableData, cableNames);
    // Prefer JSON; fallback to text→JSON if server mislabels content-type
    let data: any;
    try {
      data = await resp.json();
    } catch {
      const txt = await resp.text();
      data = JSON.parse(txt); // body is JSON even if URL says .html
    }
    const side = data?.plugs?.side;
    const brands = (data?.brands ?? []).map((b: any) => b.brand);
    const brandPairs = (data?.brands ?? []).map((b: any) => ({
      brand: b.brand,
      count: String(b.count),
    }));

    const count = Number(
      data?.data?.result?.articles?.count ?? data?.data?.result?.articles?.items?.length ?? 0,
    );

    this.articlesCount = count;

    //const filterProductsReturned = data?.data?.result?.articles?.count;
    //count of returned
    //console.log('count of returned: ' + filterProductsReturned);
    this.lastBrands = brands;
    console.log('side: ' + side + '; ' + 'Brands:', brands);
    return { count, brands, brandPairs, raw: data };
  }

  async getRandomBrand() {
    const item = this.page.locator('.cg-brands__item', {
      has: this.page.locator(`img[alt*="${this.randomBrand}" i]`),
    });
    console.log(this.randomBrand);
    await item.click();
  
    console.log('from the class: ' + this.articlesCount); // value saved on the class instance
    //get count

    const productCount = parseInt(
      await this.page
        .locator(
          `.item:has(.cg-brands__item img[alt*="${this.randomBrand}" i]) .cg-brands__item__count`,
        )
        .innerText(),
      10,
    );

    console.log('number of products:' + productCount);

    //assert the number of elements displayed:
    // will be asserted through the received html, instead of UI because UI returns all shadow elements instead of the only ones displayed.

    expect(productCount).toBe(this.articlesCount);
  }
}
