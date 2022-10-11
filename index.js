const MEDUSA_BACKEND_URL = "http://localhost:9000";
const token = "5741674219:AAH-85e9p5eVgI-5HoYQ2I8UIFHrQTmmKN4";

const TelegramBot = require("node-telegram-bot-api");
const Medusa = require("@medusajs/medusa-js");
// const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 });

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
      keyboard: [["/auth"], ["/logout"]],
    },
  });
});

bot.onText(/\/auth (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const ref = match[1].split(" ");
  const email = ref[0];
  const password = ref[1];
  if (!validateEmail(email)) {
    bot.sendMessage(chatId, "Invalid email");
  } else {
    validateFromMedusa(email, password);
    bot.sendMessage(chatId, "Logged in");
  }
});

bot.onText(/\/logout/, (msg) => {
  bot.sendMessage(msg.chat.id, "You are logged out", {
    parse_mode: "HTML",
  });
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, "Help", {
    parse_mode: "HTML",
  });
});

function validateEmail(email) {
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
}

function validateFromMedusa(email, password) {
  console.log("logging in...");
  // medusa.admin.auth
  //   .createSession({
  //     email: email,
  //     password: password,
  //   })
  //   .then(({ user }) => {
  //     console.log(user.id);
  //   });
}
