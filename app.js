require("dotenv").config();
const { App } = require("@slack/bolt");

// ボットトークンとソケットモードハンドラーを使ってアプリを初期化します
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

let dataStore = {};
let increment = 4;

// sample task
dataStore["1"] = { id: 1, title: "test 1", completed: false };
dataStore["2"] = { id: 2, title: "test 2", completed: false };
dataStore["3"] = { id: 3, title: "test 3", completed: false };

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

app.command("/echo", async ({ command, ack, respond }) => {
  // Acknowledge command request
  await ack();

  await respond(`${command.text}`);
});

app.command("/create", async ({ command, ack, respond, client }) => {
  console.log("create task");

  await ack();

  // // タスク作成のコード
  const modalView = {
    type: "modal",
    callback_id: "create_task_modal",
    title: {
      type: "plain_text",
      text: "タスクの作成",
    },
    blocks: [
      {
        type: "input",
        block_id: "task_title_input",
        label: {
          type: "plain_text",
          text: "タスク名",
        },
        element: {
          type: "plain_text_input",
          action_id: "task_title",
        },
      },
      // 他の入力要素を追加（担当者、期限など）
    ],
    submit: {
      type: "plain_text",
      text: "作成",
    },
  };
  try {
    await client.views.open({
      token: process.env.SLACK_BOT_TOKEN,
      trigger_id: command.trigger_id,
      view: modalView,
    });
  } catch (error) {
    console.error(error);
  }
});

app.view("create_task_modal", async ({ ack, body, view, client }) => {
  // モーダルの送信を確認
  await ack();

  // 入力されたタスク情報を取得
  const taskTitle = view.state.values.task_title_input.task_title.value;
  // 他の入力要素も同様に取得（担当者、期限など）
  console.log("%o", view);

  try {
    // タスクをデータベースに保存
    const newTask = await saveTaskToDatabase(taskTitle);

    // タスクが追加された旨のメッセージを表示
    await client.chat.postMessage({
      channel: body.user.id,
      text: `タスクが追加されました: No: ${newTask.no} Title: *${newTask.title}*`,
    });
  } catch (error) {
    console.error("Error saving task:", error);
  }
});

app.command("/list_tasks", async ({ command, ack, say }) => {
  // コマンドの受信確認
  await ack();
  await say("タスク一覧を表示します。");

  try {
    // データベースからタスクを取得
    const tasks = await getTasksFromDatabase();
    console.log("tasks", tasks);

    // タスクを整形して表示
    const taskBlocks = tasks.map((task) => {
      const block = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${task.title}*`,
        },
        accessory: {
          type: "checkboxes",
          options: [
            {
              text: {
                type: "plain_text",
                text: "完了",
              },
              value: task.id.toString(),
            },
          ],
          action_id: "toggle_task_completion",
        },
      };

      if (task.completed) {
        block.accessory.initial_options = [
          {
            text: {
              type: "plain_text",
              text: "完了",
            },
            value: task.id.toString(),
          },
        ];
      }
      return block;
    });

    console.log(taskBlocks);

    // タスク一覧を表示
    await say({
      blocks: taskBlocks,
      text: "タスク一覧",
    });
  } catch (error) {
    console.error("Error listing tasks: %o", error);
    await say("タスク一覧の取得に失敗しました。");
  }
});

app.action("toggle_task_completion", async ({ ack, body, action }) => {
  // アクションの受信確認
  await ack();

  const taskId = action.selected_options[0].value;
  const completed = action.selected_options.length > 0;

  await updateTaskCompletion(taskId, completed);
});

async function getTasksFromDatabase() {
  // ここでデータベースからタスクを取得する処理を実装します
  // 今回はデータベースを使わずにメモリ上に保存したデータを返すようにします
  const tasks = [];
  for (const key in dataStore) {
    console.log(key);
    tasks.push(dataStore[key]);
  }
  return tasks;
}

async function saveTaskToDatabase(title) {
  // ここでデータベースにタスクを保存する処理を実装します
  // 今回はデータベースを使わずにメモリ上に保存するようにします
  dataStore[increment] = { id: increment, title: title, completed: false };
  const data = Object.assign(dataStore[increment]);
  increment++;
  return data;
}

async function updateTaskCompletion(taskId, completed) {
  console.log("update task completion", taskId, completed);
  // ここでデータベースのタスクを更新する処理を実装します
  // 今回はデータベースを使わずにメモリ上に保存したデータを更新するようにします
  dataStore[taskId].completed = completed;
}

(async () => {
  // アプリを起動します
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();
