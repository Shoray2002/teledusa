# Teledusa 
<img width="1600" alt="grid-cover-template" src="https://user-images.githubusercontent.com/76423272/196161256-57eec3f0-5985-47da-ace7-6d1a31f56fea.png">

## About

### Participants
Shoray Singhal - [@ShoraySinghal](https://twitter.com/ShoraySinghal)

### Description
Teledusa is a Telegram Bot that allows owners and admins to manage their Medusa Stores using an intuitive interface made by integrating Medusa.js with Node-telegram-bot-api.

### Preview
https://user-images.githubusercontent.com/76423272/196190369-c3ae7b74-1b4f-40e8-bfb0-8885c81f5d58.mp4


### Operation Reference
![Operation Reference](/reference.svg)


## Set up Project

### Prerequisites
Before you start with the tutorial make sure you have

- [Node.js](https://nodejs.org/en/) v14 or greater installed on your machine
- [Medusa Storefront](https://docs.medusajs.com/starters/gatsby-medusa-starter)
- [Medusa server](https://docs.medusajs.com/quickstart/quick-start/) v14 or greater installed on your machine

### Install Project

1. Clone the repository:

```bash
git clone https://github.com/Shoray2002/teledusa.git
```

2. Change directory and install dependencies:

```bash
cd teledusa
npm install
```
3. Setup .env file:
 ```bash
cp .env.template .env
```

4. Configure the .env: 
* A new Telegram Bot TOKEN using [BotFather](https://core.telegram.org/bots/features#botfather)
* Configure a new Supabase Project to manage Cookies using [New Project on Supabase](https://egghead.io/lessons/supabase-create-a-new-supabase-project).
  Create a new table called **users** with the following schema
  ![image](https://user-images.githubusercontent.com/76423272/196204425-709c2e4a-8d8c-473f-b97a-2695439b6cca.png)

* New Medusa server configurations [Install a medusa server](https://docs.medusajs.com/quickstart/quick-start#create-a-medusa-server)

5.  Start the server
```
npm index.js
```

## Resources
- [Medusa’s GitHub repository](https://github.com/medusajs/medusa)
- [Medusa Admin Panel](https://github.com/medusajs/admin)
- [Medusa Documentation](https://docs.medusajs.com/)
- [Medusa Admin API Reference](https://docs.medusajs.com/api/admin/)
- [Node-telegram-bot-api’s GitHub repository](https://github.com/yagop/node-telegram-bot-api)
- [Telegram Bot API reference](https://core.telegram.org/bots/api)
