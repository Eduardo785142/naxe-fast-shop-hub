import { createHash } from "node:crypto";
type ShippingProduct = {
  id?: string;
  weight: number;
  originPostalCode: string;
  height?: number;
  width?: number;
  length?: number;
};
type ShippingQuote = { cents: number; label: string; maxCents: number };
export interface ShippingProvider {
  quote(product: ShippingProduct, destination: string): ShippingQuote;
}
export class DemoShippingProvider implements ShippingProvider {
  private readonly quotes = new Map<
    string,
    { value: ShippingQuote; expiresAt: number }
  >();
  quote(p: ShippingProduct, destination: string): ShippingQuote {
    const key = [
      p.id ?? "",
      p.weight,
      p.height ?? 0,
      p.width ?? 0,
      p.length ?? 0,
      p.originPostalCode,
      destination,
      "DEMO_STANDARD",
    ].join(":");
    const cached = this.quotes.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const region = Math.abs(
      Number(destination.slice(0, 2)) - Number(p.originPostalCode.slice(0, 2)),
    );
    const cents =
      1200 + Math.min(1800, region * 20) + Math.ceil(p.weight / 1000) * 150;
    const value = {
      cents,
      label: "Frete demonstrativo fixado ao ofertar",
      maxCents: cents,
    };
    if (this.quotes.size >= 1000) {
      const first = this.quotes.keys().next().value;
      if (first) this.quotes.delete(first);
    }
    this.quotes.set(key, { value, expiresAt: Date.now() + 300000 });
    return value;
  }
}
export interface PaymentProvider {
  capture(scenario: string): string;
  refund(): string;
}
export class SandboxPaymentProvider implements PaymentProvider {
  capture(scenario: string) {
    return (
      (
        {
          APPROVED: "PAID_SANDBOX",
          DECLINED: "PAYMENT_DECLINED",
          PENDING: "PAYMENT_PENDING",
        } as Record<string, string>
      )[scenario] ?? "PAYMENT_DECLINED"
    );
  }
  refund() {
    return "REFUNDED_SANDBOX";
  }
}
export interface StreamingProvider {
  createSession(id: string): Promise<{
    mode: string;
    publishUrl?: string;
    playbackUrl?: string;
    message?: string;
  }>;
}
export class DemoStreamingProvider implements StreamingProvider {
  async createSession() {
    return {
      mode: "demo",
      message:
        "Prévia de câmera local. Não há vídeo compartilhado nesta modalidade.",
    };
  }
}
export class CloudflareStreamingProvider implements StreamingProvider {
  async createSession(id: string) {
    const account = process.env.CLOUDFLARE_ACCOUNT_ID,
      token = process.env.CLOUDFLARE_API_TOKEN;
    if (!account || !token)
      throw new Error(
        "Configure credenciais Cloudflare no backend para streaming real.",
      );
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/stream/live_inputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meta: { name: `NAXE ${id}` },
          recording: { mode: "off" },
        }),
      },
    );
    const data = (await response.json()) as {
      success: boolean;
      result?: { webRTC?: { url: string }; webRTCPlayback?: { url: string } };
    };
    if (
      !response.ok ||
      !data.success ||
      !data.result?.webRTC?.url ||
      !data.result.webRTCPlayback?.url
    )
      throw new Error("O provedor não retornou endpoints WebRTC compatíveis.");
    return {
      mode: "webrtc",
      publishUrl: data.result.webRTC.url,
      playbackUrl: data.result.webRTCPlayback.url,
    };
  }
}
export const shipping = new DemoShippingProvider();
export const payments = new SandboxPaymentProvider();
// Stable anonymous identity; never expose email, address or full names in public bid feeds.
export const pseudonym = (id: string) =>
  `Colecionador ${createHash("sha256").update(id).digest("hex").slice(0, 6)}`;
