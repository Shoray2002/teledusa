import TelegramBot from "node-telegram-bot-api";
import Medusa from "@medusajs/medusa-js";
import { telegram, medusa, supabase } from "./config.js";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
let curr_prod_id = "";
const auth_obj = {
  email: "",
  password: "",
};
const db_user = createClient(supabase.url, supabase.key);

const medusa_instance = new Medusa.default({
  baseUrl: medusa.baseUrl,
  maxRetries: medusa.maxRetries,
});

const bot = new TelegramBot(telegram.token, { polling: true });

// start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Hello there! Welcome to Teledusa.");
  bot.sendMessage(msg.chat.id, "Please select an option", {
    reply_markup: JSON.stringify({
      inline_keyboard: [[{ text: "Help", callback_data: "help" }]],
    }),
  });
});

// help command
bot.onText(/\/help/, (msg) => {
  if (msg.data == "help") {
    bot.sendMessage(msg.from.id, "Help");
  }
});

// auth command
bot.onText(/\/auth/, (msg) => {
  const split_message = msg.text.split(" ");
  auth_obj.email = "admin@medusa-test.com";
  auth_obj.password = "supersecret";
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
        `You have been authenticated as ${res.user.id}\n Choose an option to manage: `,
        {
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: "Products", callback_data: "products" }],
              [{ text: "Orders", callback_data: "orders" }],
              [{ text: "Users", callback_data: "users" }],
            ],
          }),
        }
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
        bot.sendMessage(msg.chat.id, "You are not logged in!");
      });
  } else {
    bot.sendMessage(msg.chat.id, "You are not logged in!");
  }
});

// catch inline keyboard callbacks
bot.on("callback_query", function (msg) {
  switch (msg.data) {
    case "help":
      bot.sendMessage(msg.from.id, "Help");
      break;
    case "products":
      bot.sendMessage(msg.from.id, "Managing Products: ", {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: "Create a Product", callback_data: "create_product" }],
            [{ text: "Get a Product", callback_data: "get_product" }],
            [{ text: "List Products", callback_data: "list_products" }],
          ],
        }),
      });
      break;
    case "orders":
      bot.sendMessage(msg.from.id, "Orders");
      break;
    case "users":
      bot.sendMessage(msg.from.id, "Users");
      break;
    case "list_products":
      listProducts(msg);
      break;

    case "list_variants":
      listVariants(msg);
      break;

    case "get_product":
      getProduct(msg);
      break;
  }
});

// list products
async function listProducts(msg) {
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
      .get(`${medusa.baseUrl}/admin/products`, axiosCfg)
      .then((res) => {
        if (res.data.products) {
          const products = res.data.products;
          let productsText = "";
          products.forEach((product) => {
            productsText += `<b>Title</b>: ${product.title}\n<b>Product ID</b>: ${product.id}\n<b>Description</b>: ${product.description}\n<b>Thumbnail: </b> ${product.thumbnail} \n\n`;
          });
          bot.sendMessage(msg.from.id, productsText, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: JSON.stringify({
              inline_keyboard: [
                [
                  {
                    text: "Get a Product",
                    callback_data: "get_product",
                  },
                ],
              ],
            }),
          });
        } else {
          bot.sendMessage(msg.from.id, "You are not logged in!");
        }
      })
      .catch((err) => {
        console.log(err);
        bot.sendMessage(msg.from.id, "You are not logged in!");
      });
  } else {
    bot.sendMessage(msg.from.id, "You are not logged in!");
  }
}

// get product
async function getProduct(msg) {
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
    bot.sendMessage(msg.from.id, "Please enter the product ID");
    bot.on("message", async (msg) => {
      axios
        .get(`${medusa.baseUrl}/admin/products/${msg.text}`, axiosCfg)
        .then((res) => {
          if (res.data.product) {
            const product = res.data.product;
            curr_prod_id = product.id;
            let productText = `<b>Title</b>: ${product.title}\n<b>Product ID</b>: ${product.id}\n<b>Description</b>: ${product.description}\n<b>Thumbnail: </b> ${product.thumbnail} \n\n`;
            bot.sendMessage(msg.from.id, productText, {
              parse_mode: "HTML",
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [{ text: "Update Product", callback_data: "update_product" }],
                  [{ text: "Delete Product", callback_data: "delete_product" }],
                  [{ text: "List Variants", callback_data: "list_variants" }],
                ],
              }),
            });
          }
        })
        .catch((err) => {
          console.log(err);
          bot.sendMessage(msg.from.id, "Invalid Product Id!");
        });
    });
  } else {
    bot.sendMessage(msg.from.id, "You are not logged in!");
  }
}

// list variants
async function listVariants(msg) {
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
      .get(
        `${medusa.baseUrl}/admin/products/${curr_prod_id}/variants`,
        axiosCfg
      )
      .then((res) => {
        console.log(res.data);
        if (res.data.variants) {
          const variants = res.data.variants;
          let variantsText = "";
          variants.forEach((variant) => {
            variantsText += `<b>Variant ID</b>: ${variant.id}\n`;
          });
          bot.sendMessage(msg.from.id, variantsText, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
          });
        }
      })
      .catch((err) => {
        console.log(err);
        bot.sendMessage(msg.from.id, "Invalid Product Id!");
      });
  } else {
    bot.sendMessage(msg.from.id, "You are not logged in!");
  }
}
