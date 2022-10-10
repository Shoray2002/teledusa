const TelegramBot = require("node-telegram-bot-api");
const token = "5741674219:AAH-85e9p5eVgI-5HoYQ2I8UIFHrQTmmKN4";

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
  console.log("logged in");
  // var request = require("request");
  // var options = {
  //   method: "POST",
  //   url: "https://medusa.com/api/auth/login",
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   body: { email: email, password: password },
  //   json: true,
  // };

  // request(options, function (error, response, body) {
  //   if (error) throw new Error(error);
  //   console.log(body);
  // });
}
