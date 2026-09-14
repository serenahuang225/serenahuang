import { test, expect } from "@playwright/test";
test("project filtering, detail view, and keyboard dismissal work", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Work", exact: true })
    .click();
  await page.getByRole("button", { name: "Research", exact: true }).click();
  await expect(page.locator(".project")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Read about AI Hydrological Modeling" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("0.764");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Product", exact: true }).click();
  await expect(page.locator(".project")).toHaveCount(2);
});
test("axioms, reflections, navigation and small-screen layout work", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Values", exact: true })
    .click();
  await page.getByRole("button", { name: "Read Always learn" }).click();
  await expect(page.locator("#axiom-2-reflection")).toContainText(
    "ability to adapt and learn",
  );
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "About", exact: true })
    .click();
  const thought = page.locator(".floating-thought p");
  const before = await thought.textContent();
  await page.getByRole("button", { name: "Next thought" }).click();
  await expect(thought).not.toHaveText(before!);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("reduced-motion setting is honored and can be changed", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Enable motion" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "still");
  await page.getByRole("button", { name: "Enable motion" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
});
