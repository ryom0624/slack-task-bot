require("dotenv").config();
const { App } = require("@slack/bolt");

// ボットトークンとソケットモードハンドラーを使ってアプリを初期化します
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// app.message("hello", async ({ message, say }) => {
//   await say(`Hey there <@${message.user}>!`);
// });

app.message("hello", async ({ message, say }) => {
  await say({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Hey there <@${message.user}>!`,
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "Click Me",
          },
          action_id: "button_click",
        },
      },
    ],
    text: `Hey there <@${message.user}>!`, // fallback
  });
});

app.action("button_click", async ({ body, ack, say }) => {
  await ack();
  await say(`<@${body.user.id}> clicked the button`);
});

(async () => {
  // アプリを起動します
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();
