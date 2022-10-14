import { Telegraf } from "telegraf";
import Medusa from "@medusajs/medusa-js";
import { telegram, medusa, supabase } from "./config.js";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
const db_user = createClient(supabase.url, supabase.key);

const medusa_instance = new Medusa.default({
  baseUrl: medusa.baseUrl,
  maxRetries: medusa.maxRetries,
});
const bot = new Telegraf(telegram.token);
const auth_obj = {
  email: "",
  password: "",
};
// start
bot.command("start", (ctx) => {
  bot.telegram.sendMessage(
    ctx.chat.id,
    "Hello there! Welcome to Teledusa.",
    {}
  );
});

// auth command
bot.command("auth", (ctx) => {
  const split_message = ctx.message.text.split(" ");
  auth_obj.email = split_message[1];
  auth_obj.password = split_message[2];
  medusa_instance.admin.auth.createSession(auth_obj).then(async (res) => {
    const { data, error } = await db_user
      .from("users")
      .select("*")
      .eq("user_id", ctx.from.id);
    if (data.length > 0) {
      console.log("User already exists");
      await db_user
        .from("users")
        .update({
          cookie: res.response.headers["set-cookie"][0]
            .split(";")[0]
            .split("connect.sid=")[1],
        })
        .eq("user_id", ctx.from.id);
    } else {
      console.log("Creating new user");
      await db_user.from("users").insert(
        [
          {
            user_id: ctx.from.id,
            cookie: res.response.headers["set-cookie"][0]
              .split(";")[0]
              .split("connect.sid=")[1],
          },
        ],
        { returning: "minimal" }
      );
    }
    bot.telegram.sendMessage(
      ctx.chat.id,
      `You are now logged in as Admin ${res.user.name ? res.user.name : ""}`,
      {}
    );
  });
});

bot.command("logout", async (ctx) => {
  const { data, error } = await db_user
    .from("users")
    .select("*")
    .eq("user_id", ctx.from.id);
  if (data.length > 0) {
    let axiosCfg = {
      headers: {
        Cookie: `connect.sid=${data[0].cookie}`,
      },
    };
    axios
      .delete(`${medusa.baseUrl}/admin/auth`, axiosCfg)
      .then((res) => {
        console.log(res);
        bot.telegram.sendMessage(
          ctx.chat.id,
          `You are now logged out as Admin`,
          {}
        );
      })
      .catch((err) => {
        console.log(err);
        bot.telegram.sendMessage(
          ctx.chat.id,
          `There was an error logging you out`,
          {}
        );
      });
  } else {
    bot.telegram.sendMessage(
      ctx.chat.id,
      "Cannot Logout because you are not logged in",
      {}
    );
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
