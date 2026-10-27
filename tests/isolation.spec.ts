import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

// Two Clerk test users (the +clerk_test address never gets real email).
const A = "shelf-tester-a+clerk_test@example.com";
const B = "shelf-tester-b+clerk_test@example.com";

async function signIn(browser: Browser, email: string) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/"); // a page that loads Clerk
  await clerk.signIn({ page, emailAddress: email });
  return page;
}

const shelf = (page: Page) => page.getByRole("region", { name: /On your shelf/ });

/** Search Open Library and put a book on the shelf, waiting until Supabase has saved it. */
async function addBook(page: Page, query: string, title: string) {
  await page.goto("/shelf");
  await expect(page.getByRole("heading", { name: "Your shelf", level: 1 })).toBeVisible();
  if (await shelf(page).getByText(title, { exact: true }).count()) return; // already there from an earlier run

  await page.getByLabel("Find a book").fill(query);
  await page.getByRole("button", { name: "Search" }).click();
  const add = page.getByRole("button", { name: `Add ${title} to your shelf`, exact: true }).first();
  const saved = page.waitForResponse((r) => r.url().includes("/rest/v1/books") && r.request().method() === "POST");
  await add.click();
  expect((await saved).ok()).toBe(true);
  await expect(shelf(page).getByText(title, { exact: true })).toBeVisible();
}

/** Log a session through the form, waiting until Supabase has saved it. */
async function logSession(page: Page, course: string) {
  await page.goto("/log");
  await page.getByLabel("What did you study?").fill(course);
  await page.getByLabel("Minutes").fill("30");
  const saved = page.waitForResponse((r) => r.url().includes("/rest/v1/sessions") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Log session" }).click();
  expect((await saved).ok()).toBe(true);
  await expect(page).toHaveURL(/\/week/);
}

/** Load the week fresh from the database and check whose sessions show up. */
async function expectSessions(page: Page, mine: string, theirs: string) {
  await page.goto("/week");
  const list = page.getByRole("region", { name: "Sessions" });
  await expect(list.getByText(mine, { exact: true })).toBeVisible(); // loaded, and mine is there
  await expect(page.getByText(theirs, { exact: true })).toHaveCount(0); // nowhere on the page
}

async function expectShelf(page: Page, mine: string, theirs: string) {
  await page.goto("/shelf");
  await expect(shelf(page).getByText(mine, { exact: true })).toBeVisible();
  await expect(page.getByText(theirs, { exact: true })).toHaveCount(0); // nowhere on the page
}

test("two people each save something, and neither can see the other's", async ({ browser }) => {
  const run = Date.now().toString(36); // unique names, so earlier runs can't make this pass
  const aCourse = `A's reading ${run}`;
  const bCourse = `B's reading ${run}`;
  const aBook = "Introduction to Algorithms";
  const bBook = "Pride and Prejudice";

  const a = await signIn(browser, A);
  const b = await signIn(browser, B);

  await addBook(a, "introduction to algorithms cormen", aBook);
  await logSession(a, aCourse);

  await addBook(b, "pride and prejudice austen", bBook);
  await logSession(b, bCourse);

  await expectSessions(a, aCourse, bCourse);
  await expectSessions(b, bCourse, aCourse);
  await expectShelf(a, aBook, bBook);
  await expectShelf(b, bBook, aBook);
});
