const dotenv = require("dotenv");
const {Telegraf} = require("telegraf");
const LocalSession = require('telegraf-session-local')
const {message} = require("telegraf/filters");
dotenv.config()

const isAdmin = (userChatId) => userChatId === +process.env.ADMIN_CHAT_ID

const bot = new Telegraf(process.env.API_KEY_BOT)

const localSession = new LocalSession({
    database: 'sessions.json',
    state: {
        topics: []
    }
})

bot.use(localSession.middleware())


// create topic when user start bot
bot.start(async ctx => {
    if (isAdmin(ctx.update.message.chat.id)) await ctx.reply('Hi, admin')
    else {
        const userTopic = ctx.sessionDB
            .get('topics')
            .value()
            .find((tp) => tp.chatId === ctx.update.message.chat.id)

        if (!!userTopic) return;

        const newTopic = await ctx.createForumTopic(ctx.update.message.from.username, {chat_id: process.env.ADMIN_CHAT_ID})
        ctx.sessionDB.get('topics').push({
            ...newTopic,
            chatId: ctx.update.message.chat.id
        }).write()
    }
})

bot.on(message('text'), async (ctx) => {
    if (isAdmin(ctx.update.message.chat.id)) {
        const topic = ctx.sessionDB
            .get('topics')
            .value()
            .find((tp) => tp.message_thread_id === ctx.update.message.message_thread_id)

        if (!topic) return;

        await ctx.copyMessage(topic.chatId)
    } else {
        const userTopic = ctx.sessionDB
            .get('topics')
            .value()
            .find((tp) => tp.chatId === ctx.update.message.chat.id)

        if (!userTopic) return;

        await ctx.copyMessage(process.env.ADMIN_CHAT_ID, {message_thread_id: userTopic.message_thread_id})
    }
})

bot.launch()
console.log("Bot launched")
