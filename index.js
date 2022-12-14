import TelegramBot from "node-telegram-bot-api";
import Medusa from "@medusajs/medusa-js";
import * as dotenv from "dotenv";
dotenv.config();
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
let curr_prod_id = "";
let curr_order_id = "";
let curr_customer_id = "";
let baseURL = process.env.MEDUSA_BASE_URL;
const auth_obj = {
  email: "",
  password: "",
};

const help_text = `Welcome to the Teledusa Bot! Here are the commands you can use:\n\n<b>/auth</b> - Authorize your Medusa Admin Account by passing your Email and Password inline \n<b>/options</b> - View Managing Options\n<b>/info</b> - Get info about your logged admin account\n<b>/logout</b> - Logout from your Admin Account\n<b>/help</b> - Show this message\n\n`;
const db_user = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const medusa_instance = new Medusa.default({
  baseUrl: baseURL,
  maxRetries: process.env.MEDUSA_MAXRETRIES || 3,
});

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

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
  bot.sendMessage(msg.from.id, help_text, {
    parse_mode: "HTML",
  });
  bot.sendPhoto(
    msg.chat.id,
    "https://i.ibb.co/MN52hqQ/Screenshot-20221017-185412.png",
    {
      caption: "Here is a reference to the available operations",
    }
  );
});

// auth command
bot.onText(/\/auth/, (msg) => {
  const split_message = msg.text.split(" ");
  auth_obj.email = split_message[1];
  auth_obj.password = split_message[2];
  if (!auth_obj.email || !auth_obj.password) {
    bot.sendMessage(
      msg.from.id,
      "Please enter your credentials in the format /auth <email> <password>"
    );
  } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auth_obj.email)) {
    medusa_instance.admin.auth
      .createSession(auth_obj)
      .then(async (res) => {
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
          `You have been authenticated as ${res.user.id}\nChoose an option to manage: `,
          {
            reply_markup: JSON.stringify({
              inline_keyboard: [
                [{ text: "Customers", callback_data: "customers" }],
                [{ text: "Orders", callback_data: "orders" }],
                [{ text: "Products", callback_data: "products" }],
              ],
            }),
          }
        );
      })
      .catch((err) => {
        console.log(err);
        bot.sendMessage(msg.chat.id, "Invalid credentials");
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
      .delete(`${baseURL}/admin/auth`, axiosCfg)
      .then((res) => {
        bot.sendMessage(msg.chat.id, `You have been logged out!`);
      })
      .catch((err) => {
        console.log(err);
        bot.sendMessage(msg.chat.id, "You are not logged in!");
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
      .get(`${baseURL}/admin/auth`, axiosCfg)
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

// options command
bot.onText(/\/options/, async (msg) => {
  bot.sendMessage(msg.chat.id, "Choose an option to manage: ", {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: "Customers", callback_data: "customers" }],
        [{ text: "Orders", callback_data: "orders" }],
        [{ text: "Products", callback_data: "products" }],
      ],
    }),
  });
});

// catch inline keyboard callbacks
bot.on("callback_query", function (msg) {
  switch (msg.data) {
    case "help":
      bot.sendMessage(msg.from.id, help_text, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
      bot.sendPhoto(
        msg.from.id,
        "https://i.ibb.co/MN52hqQ/Screenshot-20221017-185412.png",
        {
          caption: "Here is a reference to the available operations",
        }
      );
      break;
    case "products":
      bot.sendMessage(msg.from.id, "Managing Products: ", {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: "Get a Product", callback_data: "get_product" }],
            [{ text: "List Products", callback_data: "list_products" }],
          ],
        }),
      });
      break;
    case "orders":
      bot.sendMessage(msg.from.id, "Managing Orders: ", {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: "Get a Order", callback_data: "get_order" }],
            [{ text: "List Orders", callback_data: "list_orders" }],
          ],
        }),
      });
      break;
    case "customers":
      bot.sendMessage(msg.from.id, "Managing Customers: ", {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: "Get a Customer", callback_data: "get_customer" }],
            [{ text: "List Customers", callback_data: "list_customers" }],
          ],
        }),
      });
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
    case "list_orders":
      listOrders(msg);
      break;

    case "get_order":
      getOrder(msg);
      break;
    case "complete_order":
      completeOrder(msg);
      break;

    case "list_customers":
      listCustomers(msg);
      break;
    case "get_customer":
      getCustomer(msg);
      break;

    default:
      bot.sendMessage(msg.from.id, "Invalid option");
  }
});

// Customer Functions
// list customers
async function listCustomers(msg) {
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
      .get(`${baseURL}/admin/customers`, axiosCfg)
      .then((res) => {
        if (res.data.customers) {
          // count customers
          let customersText = "";
          const count = res.data.customers.length;
          if (count) {
            const customers = res.data.customers;
            customers.forEach((customer) => {
              customersText += `<b>Customer ID</b>: ${customer.id}\n<b>Customer Email</b>: ${customer.email}\n\n`;
            });
            bot.sendMessage(msg.from.id, customersText, {
              parse_mode: "HTML",
              disable_web_page_preview: true,
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [
                    {
                      text: "Get a Customer",
                      callback_data: "get_customer",
                    },
                  ],
                ],
              }),
            });
          } else {
            customersText = "No customers found!";
            bot.sendMessage(msg.from.id, customersText);
          }
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

// get customer
async function getCustomer(msg) {
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
    bot.removeTextListener(/^prod/);
    bot.removeTextListener(/^order/);
    bot.sendMessage(msg.from.id, "Please enter the customer ID");
    bot.onText(/^cus/, async (msg) => {
      axios
        .get(`${baseURL}/admin/customers/${msg.text}`, axiosCfg)
        .then((res) => {
          if (res.data.customer) {
            const customer = res.data.customer;
            curr_customer_id = customer.id;
            let customerText = `<b>Customer Email</b>: ${
              customer.email
            }\n<b>Customer Name</b>: ${customer.first_name} ${
              customer.last_name
            }\n<b>Customer Phone</b>: ${customer.phone}\n<b>Has Account</b>: ${
              customer.has_account ? "????" : "????"
            }\n`;
            let unixCreatedAt = Date.parse(customer.created_at);
            let createdAt = new Date(unixCreatedAt);
            customerText += `<b>Created At</b>: ${createdAt.getDate()}/${createdAt.getMonth()}/${createdAt.getFullYear()}`;
            let ordersString = "\n<b>Orders</b>:\n\n";
            if (customer.orders.length) {
              customer.orders.forEach((order) => {
                ordersString += `<b>Order ID</b>: ${order.id}\n<b>Order Status</b>: ${order.status}\n\n`;
              });
            } else {
              ordersString = "\nNo orders found for this customer!";
            }
            customerText += ordersString;

            bot.sendMessage(msg.from.id, customerText, {
              parse_mode: "HTML",
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [
                    {
                      text: "Get an Order",
                      callback_data: "get_order",
                    },
                  ],
                ],
              }),
            });
          }
        })
        .catch((err) => {
          console.log(err);
          bot.sendMessage(msg.from.id, "Invalid Customer Id!");
        });
    });
  } else {
    bot.sendMessage(msg.from.id, "You are not logged in!");
  }
}

// Product Functions
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
      .get(`${baseURL}/admin/products`, axiosCfg)
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
      .get(`${baseURL}/admin/products/${curr_prod_id}/variants`, axiosCfg)
      .then((res) => {
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
    bot.removeTextListener(/^cus/);
    bot.removeTextListener(/^order/);
    bot.sendMessage(msg.from.id, "Please enter the product ID");
    bot.onText(/^prod/, async (msg) => {
      axios
        .get(`${baseURL}/admin/products/${msg.text}`, axiosCfg)
        .then((res) => {
          if (res.data.product) {
            const product = res.data.product;
            curr_prod_id = product.id;
            let productText = `<b>Title</b>: ${product.title}\n<b>Product ID</b>: ${product.id}\n<b>Description</b>: ${product.description}\n<b>Thumbnail: </b> ${product.thumbnail} \n\n`;
            bot.sendMessage(msg.from.id, productText, {
              parse_mode: "HTML",
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [
                    {
                      text: "List Variants of this Product",
                      callback_data: "list_variants",
                    },
                  ],
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

// Order Functions
// list orders
async function listOrders(msg) {
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
      .get(`${baseURL}/admin/orders`, axiosCfg)
      .then((res) => {
        if (res.data.orders) {
          // count orders
          let ordersText = "";
          const count = res.data.orders.length;
          if (count) {
            const orders = res.data.orders;
            orders.forEach((order) => {
              ordersText += `<b>Order ID</b>: ${order.id}\n<b>Customer Email</b>: ${order.email}\n\n
              `;
            });
            bot.sendMessage(msg.from.id, ordersText, {
              parse_mode: "HTML",
              disable_web_page_preview: true,
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [
                    {
                      text: "Get an Order",
                      callback_data: "get_order",
                    },
                  ],
                ],
              }),
            });
          } else {
            ordersText = "No orders found!";
            bot.sendMessage(msg.from.id, ordersText);
          }
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

// get order
async function getOrder(msg) {
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
    bot.removeTextListener(/^prod/);
    bot.removeTextListener(/^cus/);
    bot.sendMessage(msg.from.id, "Please enter the order ID");
    bot.onText(/^order/, async (msg) => {
      axios
        .get(`${baseURL}/admin/orders/${msg.text}`, axiosCfg)
        .then((res) => {
          if (res.data.order) {
            const order = res.data.order;
            curr_order_id = order.id;
            let orderText = `<b>Customer Email</b>: ${
              order.email
            }\n<b>Shipping Address</b>: ${order.shipping_address.first_name} ${
              order.shipping_address.last_name
            }, ${order.shipping_address.address_1}, ${
              order.shipping_address.address_2
            }, ${
              order.shipping_address.city
            }, ${order.shipping_address.country_code.toUpperCase()}, ${
              order.shipping_address.postal_code
            }\n<b>Payment Status</b>: ${
              order.payment_status
            }\n<b>Shipping Status</b>: ${order.status}\n<b>Total</b>: ${
              order.total / 100
            } ${order.currency_code.toUpperCase()}\n<b>Items</b>: \n`;
            order.items.forEach((item) => {
              orderText += `${item.title} - ${item.variant.title} - ${
                item.quantity
              } - ${
                item.unit_price / 100
              } ${order.currency_code.toUpperCase()} - <em>${
                item.variant_id
              }</em>\n`;
            });
            let unixCreatedAt = Date.parse(order.created_at);
            let createdAt = new Date(unixCreatedAt);
            orderText += `<b>Created At</b>: ${createdAt.getDate()}/${createdAt.getMonth()}/${createdAt.getFullYear()}`;
            bot.sendMessage(msg.from.id, orderText, {
              parse_mode: "HTML",
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [
                    {
                      text: "Complete this Order",
                      callback_data: "complete_order",
                    },
                  ],
                ],
              }),
            });
          }
        })
        .catch((err) => {
          console.log(err);
          bot.sendMessage(msg.from.id, "Invalid Order Id!");
        });
    });
  } else {
    bot.sendMessage(msg.from.id, "You are not logged in!");
  }
}

// complete order
async function completeOrder(msg) {
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
      .post(`${baseURL}/admin/orders/${curr_order_id}/complete`, {}, axiosCfg)
      .then((res) => {
        const order = res;
        let orderText = `<b>Customer Email</b>: ${
          order.email
        }\n<b>Payment Status</b>: ${
          order.payment_status
        }\n<b>Shipping Status</b>: ${order.status}\n<b>Total</b>: ${
          order.total / 100
        } ${order.currency_code.toUpperCase()}\n<b>Items</b>: \n`;
        order.items.forEach((item) => {
          orderText += `${item.title} - ${item.variant.title} - ${
            item.quantity
          } - ${
            item.unit_price / 100
          } ${order.currency_code.toUpperCase()} - <em>${
            item.variant_id
          }</em>\n`;
        });
        bot.sendMessage(msg.from.id, orderText, {
          parse_mode: "HTML",
        });
      })
      .catch((err) => {
        console.log(err);
        bot.sendMessage(
          msg.from.id,
          "There was an error completing the order!"
        );
      });
  } else {
    bot.sendMessage(msg.from.id, "You are not logged in!");
  }
}
