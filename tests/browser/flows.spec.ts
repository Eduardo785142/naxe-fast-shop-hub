import { cleanupBrowserFixtures } from "../cleanup";
import { test, expect, type BrowserContext } from "@playwright/test";
test.beforeAll(async () => {
  await cleanupBrowserFixtures();
});
test.afterEach(async () => {
  await cleanupBrowserFixtures();
});
async function login(c: BrowserContext, email: string) {
  const r = await c.request.post("/api/auth/login", {
    data: { email, password: process.env.DEMO_PASSWORD ?? "NaxeDemo2026!" },
  });
  expect(r.ok()).toBeTruthy();
}
test("marketplace navigation, anonymous room, responsive layout", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /O próximo achado/ }),
  ).toBeVisible();
  await expect(page.locator(".stream-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Tecnologia", exact: true }).click();
  await expect(page.locator(".stream-card")).toHaveCount(1);
  await page.locator(".stream-card").first().click();
  await expect(page.locator(".bid-panel")).toBeVisible();
  await expect(
    page.getByText("Mídia demonstrativa · sem vídeo compartilhado"),
  ).toBeVisible();
  const sample = page.locator(".sample-video");
  await sample.evaluate(async (video) => {
    await (video as HTMLVideoElement).play();
  });
  await expect
    .poll(() =>
      sample.evaluate((video) => (video as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
test("two independent buyers, spectator and seller share bids, reconnect and winner", async ({
  browser,
  baseURL,
}) => {
  const seller = await browser.newContext({ baseURL });
  const a = await browser.newContext({ baseURL });
  const b = await browser.newContext({ baseURL });
  const guest = await browser.newContext({ baseURL });
  try {
    await login(seller, "vendedor@naxe.test");
    await login(a, "comprador.a@naxe.test");
    await login(b, "comprador.b@naxe.test");
    const live = await seller.request.post("/api/seller/streams", {
      data: { title: "Browser multiuser test", category: "TEST" },
    });
    expect(live.ok()).toBeTruthy();
    const stream = await live.json();
    const created = await seller.request.post(
      `/api/seller/streams/${stream.id}/lots`,
      {
        data: {
          productId: "perfume",
          startCents: 1500,
          incrementCents: 100,
          bidMode: "FIXED",
          durationSeconds: 10,
          position: 0,
        },
      },
    );
    const lot = await created.json();
    expect(created.ok()).toBeTruthy();
    const pa = await a.newPage(),
      pb = await b.newPage(),
      pg = await guest.newPage();
    await Promise.all([
      pa.goto(`/live/${stream.id}`),
      pb.goto(`/live/${stream.id}`),
      pg.goto(`/live/${stream.id}`),
    ]);
    await expect(pa.getByText("● Conectado em tempo real")).toBeVisible();
    const start = await seller.request.post(
      `/api/seller/lots/${lot.id}/start`,
      { data: {} },
    );
    expect(start.ok()).toBeTruthy();
    await expect(pa.getByTestId("bid-button")).toContainText("15,00");
    await pa.getByTestId("bid-button").click();
    await expect(pb.getByTestId("bid-button")).toContainText("16,00");
    await expect(pg.locator(".auction-metrics strong")).toContainText("15,00");
    await pb.getByTestId("bid-button").click();
    await expect(pa.getByTestId("bid-button")).toContainText("17,00");
    await a.setOffline(true);
    await pb.getByTestId("bid-button").click();
    await expect(pb.getByTestId("bid-button")).toContainText("18,00");
    await a.setOffline(false);
    await expect(pa.getByTestId("bid-button")).toContainText("18,00", {
      timeout: 12000,
    });
    await pa.reload();
    await expect(pa.getByTestId("bid-button")).toContainText("18,00");
    await expect(pb.getByTestId("bid-button")).toContainText(
      "Lote arrematado",
      { timeout: 18000 },
    );
    await expect(pg.getByTestId("bid-button")).toContainText("Lote arrematado");
    const stateA = await (
      await a.request.get(`/api/streams/${stream.id}`)
    ).json();
    const stateB = await (
      await b.request.get(`/api/streams/${stream.id}`)
    ).json();
    expect(stateA.lots[0].result.winnerId).toBe(stateB.lots[0].result.winnerId);
    const account = await (await b.request.get("/api/account")).json();
    expect(
      account.orders.some((o: { lotId: string }) => o.lotId === lot.id),
    ).toBeTruthy();
  } finally {
    await Promise.all([seller.close(), a.close(), b.close(), guest.close()]);
  }
});
test("registration and buyer enablement never automatically creates a bid", async ({
  page,
  context,
}) => {
  const email = `test-${Date.now()}@naxe.test`;
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar ou criar conta" }).click();
  await page.getByRole("button", { name: /Ainda não tenho conta/ }).click();
  await page.getByLabel("Nome completo").fill("Pessoa de Teste");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("SenhaDemoSegura2026!");
  await page
    .getByRole("button", { name: "Criar minha conta", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/minha-conta");
  await page
    .getByRole("button", { name: "Habilitar lances", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("CEP", { exact: true }).fill("01310100");
  await dialog.getByLabel("Endereço", { exact: true }).fill("Rua Demonstração");
  await dialog.getByLabel("Número", { exact: true }).fill("123");
  await dialog.getByLabel("Cidade", { exact: true }).fill("São Paulo");
  await dialog.getByLabel("UF", { exact: true }).fill("SP");
  await dialog.locator("input[name=terms]").check();
  await dialog
    .getByRole("button", { name: "Habilitar e voltar à sala" })
    .click();
  await expect(dialog).toHaveCount(0);
  const account = await (await context.request.get("/api/account")).json();
  expect(account.user.enabled).toBe(true);
  expect(account.bids).toHaveLength(0);
  expect(account.payment.provider).toBe("SANDBOX");
});
test("seller studio creates product and lot through visible forms", async ({
  page,
  context,
}) => {
  await login(context, "vendedor@naxe.test");
  await page.goto("/seller/produtos");
  await page.getByRole("button", { name: "Adicionar produto" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Nome", { exact: true })
    .fill(`Produto de teste ${Date.now()}`);
  await page
    .getByRole("dialog")
    .getByLabel("Descrição", { exact: true })
    .fill("Produto fictício para teste automatizado.");
  await page
    .getByRole("button", { name: "Salvar produto", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Criar transmissão" }).click();
  await page
    .getByLabel("Título", { exact: true })
    .fill("Live de teste do Studio");
  await page.getByRole("button", { name: "Criar e configurar lotes" }).click();
  await expect(page).toHaveURL(/\/seller\/studio\//);
  await context.grantPermissions(["camera", "microphone"]);
  await page
    .getByRole("button", { name: "Testar câmera e microfone", exact: true })
    .click();
  await expect(page.locator(".camera-preview video")).toBeVisible();
  expect(
    await page
      .locator(".camera-preview video")
      .evaluate(
        (v) =>
          ((v as HTMLVideoElement).srcObject as MediaStream).getTracks().length,
      ),
  ).toBe(2);
  await page
    .getByRole("button", { name: "Iniciar mídia", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Não há vídeo compartilhado",
  );
  await page.getByRole("button", { name: "Parar câmera", exact: true }).click();
  await page.getByRole("button", { name: "Lote", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Abertura (R$) · 0 permitido", { exact: true })
    .fill("0");
  await page.getByRole("button", { name: "Salvar configuração" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".studio-lot")).toHaveCount(1);
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(page.getByText("CONTROLE DO LOTE ATIVO")).toBeVisible();
  await expect(page.locator(".studio-active .clock")).toBeVisible();
});
