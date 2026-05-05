import { Bot, InlineKeyboard, webhookCallback } from "grammy";

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

bot.on("message:text", async (ctx) => {
  // Nice fallback for users typing without slash
  if (ctx.msg.text.trim().toLowerCase() === "appss_verify") {
    await ctx.reply(appssCode);
  }
});

export default webhookCallback(bot, "std/http");

