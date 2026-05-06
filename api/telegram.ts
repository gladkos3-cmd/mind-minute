import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { getPremiumUntilMs, setPremiumUntilMs } from "./_lib/premiumStore";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const token = requireEnv("BOT_TOKEN");
const appssCode = process.env.APPSS_VERIFY_CODE ?? "appss_35b97f";
const webAppUrl = process.env.WEBAPP_URL;

const bot = new Bot(token);

bot.command("appss_verify", async (ctx) => {
  await ctx.reply(appssCode);
});

bot.command("start", async (ctx) => {
  if (!webAppUrl) {
    await ctx.reply("Привет! Web App URL ещё не настроен.");
    return;
  }
  const kb = new InlineKeyboard().webApp("Открыть Mind Minute", webAppUrl);
  await ctx.reply("Готово. Открывай приложение:", { reply_markup: kb });
});

bot.on("pre_checkout_query", async (ctx) => {
  // Always answer to avoid payment hanging.
  await ctx.answerPreCheckoutQuery(true);
});

bot.on("message:successful_payment", async (ctx) => {
  try {
    const payloadRaw = ctx.message.successful_payment.invoice_payload;
    const payload = JSON.parse(payloadRaw) as { sku?: string; userId?: number };
    const userId = Number(payload.userId ?? ctx.from?.id);
    const sku = String(payload.sku ?? "");
    const days = sku === "premium_year" ? 365 : 30;

    const cur = await getPremiumUntilMs(userId);
    const base = Math.max(Date.now(), cur);
    const premiumUntilMs = base + days * 24 * 60 * 60 * 1000;
    await setPremiumUntilMs(userId, premiumUntilMs);

    await ctx.reply("Premium активирован. Спасибо! Можно возвращаться в приложение.");
  } catch {
    // best effort
    await ctx.reply("Платёж получен. Если Premium не включился — напиши /start.");
  }
});

bot.on("message:text", async (ctx) => {
  // Nice fallback for users typing without slash
  if (ctx.msg.text.trim().toLowerCase() === "appss_verify") {
    await ctx.reply(appssCode);
  }
});

export default webhookCallback(bot, "std/http");

