const MEDUSA_BACKEND_URL = "http://localhost:9000";
const token = "5741674219:AAH-85e9p5eVgI-5HoYQ2I8UIFHrQTmmKN4";

const TelegramBot = require("node-telegram-bot-api");
const Medusa = require("@medusajs/medusa-js");
const medusa = new Medusa.default({
  baseUrl: MEDUSA_BACKEND_URL,
  maxRetries: 1,
});
console.log(medusa.admin.auth);
console.log("-----------------------------");

const bot = new TelegramBot(token, { polling: true });
bot.on("message", (msg) => {
  var Hi = "hi";
  if (msg.text.toString().toLowerCase().indexOf(Hi) === 0) {
    bot.sendMessage(msg.chat.id, "Hello dear user");
  }
});
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "<b>Placeholder</b>", {
    parse_mode: "HTML",
    reply_markup: {
      keyboard: [["/auth admin@medusa-test.com supersecret"], ["/logout"]],
    },
  });
});

bot.onText(/\/auth (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const ref = match[1].split(" ");
  const email = ref[0];
  const password = ref[1];
  if (!/\S+@\S+\.\S+/.test(email)) {
    bot.sendMessage(chatId, "Invalid email");
  } else {
    medusa.admin.auth
      .createSession({
        email: email,
        password: password,
      })
      .then(({ user }) => {
        console.log(user);
        bot.sendMessage(chatId, "Logged in as " + user.id);
      })
      .catch((err) => {
        bot.sendMessage(chatId, "Invalid credentials");
      });
  }
});

bot.onText(/\/logout/, (msg) => {
  medusa.admin.auth
    .deleteSession()
    .then(() => {
      console.log("Logged out");
      bot.sendMessage(msg.chat.id, "Logged out");
    })
    .catch((error) => {
      console.log("Error logging out");
      bot.sendMessage(msg.chat.id, "Error logging out");
    });
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, "Help", {
    parse_mode: "HTML",
  });
});
