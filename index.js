import TelegramBot from "node-telegram-bot-api";
import Medusa from "@medusajs/medusa-js";
import { telegram, medusa, supabase } from "./config.js";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const db_user = createClient(supabase.url, supabase.key);

const medusa_instance = new Medusa.default({
  baseUrl: medusa.baseUrl,
  maxRetries: medusa.maxRetries,
});

const bot = new TelegramBot(telegram.token, { polling: true });

const auth_obj = {
  email: "",
  password: "",
};

// start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Hello there! Welcome to Teledusa.");
});

// auth command
bot.onText(/\/auth/, (msg) => {
  const split_message = msg.text.split(" ");
  auth_obj.email = split_message[1];
  auth_obj.password = split_message[2];
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auth_obj.email)) {
    medusa_instance.admin.auth.createSession(auth_obj).then(async (res) => {
      const { data, error } = await db_user
        .from("users")
        .select("*")
        .eq("user_id", msg.from.id);

      if (data.length > 0) {
        console.log("User already exists");
        await db_user
          .from("users")
          .update({
            cookie: res.response.headers["set-cookie"][0]
              .split(";")[0]
              .split("connect.sid=")[1],
          })
          .eq("user_id", msg.from.id);
      } else {
        console.log("Creating new user");
        await db_user.from("users").insert([
          {
            user_id: msg.from.id,
            cookie: res.response.headers["set-cookie"][0]
              .split(";")[0]
              .split("connect.sid=")[1],
          },
        ]);
      }
      bot.sendMessage(
        msg.chat.id,
        `You have been authenticated as ${res.user.id}`
      );
    });
  } else {
    bot.sendMessage(msg.chat.id, `Please enter a valid email address`);
  }
});

// logout command
bot.onText(/\/logout/, async (msg) => {
  const { data, error } = await db_user
    .from("users")
    .select("*")
    .eq("user_id", msg.from.id);
  if (data.length > 0) {
    let axiosCfg = {
      headers: {
        Cookie: `connect.sid=${data[0].cookie}`,
      },
    };
    axios
      .delete(`${medusa.baseUrl}/admin/auth`, axiosCfg)
      .then((res) => {
        bot.sendMessage(msg.chat.id, `You have been logged out!`);
      })
      .catch((err) => {
        console.log(err);
        bot.sendMessage(msg.chat.id, "There was an error logging you out.");
      });
  } else {
    bot.sendMessage(msg.chat.id, "You are not logged in!");
  }
});

// user command
bot.onText(/\/info/, async (msg) => {
  const { data, error } = await db_user
    .from("users")
    .select("*")
    .eq("user_id", msg.from.id);
  if (data.length > 0) {
    let axiosCfg = {
      headers: {
        Cookie: `connect.sid=${data[0].cookie}`,
      },
    };
    axios
      .get(`${medusa.baseUrl}/admin/auth`, axiosCfg)
      .then((res) => {
        if (res.data.user) {
          const user = res.data.user;
          let unixCreatedAt = Date.parse(user.created_at);
          let createdAt = new Date(unixCreatedAt);

          bot.sendMessage(
            msg.chat.id,
            `<b>User_ID</b>: ${user.id}\n<b>First Name</b>: ${
              user.first_name ? user.first_name : "undefined"
            }\n<b>Last Name</b>: ${
              user.last_name ? user.last_name : "undefined"
            }\n<b>Email</b>: ${user.email}\n<b>Role</b>: ${
              user.role
            }\n<b>Created At (DD/MM/YYYY)</b>: ${createdAt.getDate()}/${createdAt.getMonth()}/${createdAt.getFullYear()}
            `,
            { parse_mode: "HTML" }
          );
        } else {
          bot.sendMessage(msg.chat.id, "You are not logged in!");
        }
      })
      .catch((err) => {
        console.log(err);
        bot.sendMessage(msg.chat.id, "You are not logged in!.");
      });
  } else {
    bot.sendMessage(msg.chat.id, "You are not logged in!");
  }
});
