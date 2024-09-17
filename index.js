const dotenv = require("dotenv");
const {Telegraf} = require("telegraf");
const LocalSession = require('telegraf-session-local')
const {message} = require("telegraf/filters");
dotenv.config()

const isAdmin = (userChatId) => userChatId === +process.env.ADMIN_CHAT_ID

const resendToAdmin = async (ctx) => {
    const userTopic = ctx.sessionDB
        .get('topics')
        .value()
        .find((tp) => tp.chatId === ctx.update.message.chat.id)

    if (!userTopic) return;

    await ctx.copyMessage(process.env.ADMIN_CHAT_ID, {message_thread_id: userTopic.message_thread_id})
}

const resendToUser = async (ctx) => {
    const topic = ctx.sessionDB
        .get('topics')
        .value()
        .find((tp) => tp.message_thread_id === ctx.update.message.message_thread_id)

    if (!topic) return;

    await ctx.copyMessage(topic.chatId)
}

const resendPromoMessage = async (ctx) => {
    if (!isAdmin(ctx.update.message.chat.id)) return;

    ctx.sessionDB
        .get('topics')
        .value()
        .forEach(topic => {
            ctx.copyMessage(topic.chatId)
        })
}

const bot = new Telegraf(process.env.API_KEY_BOT)

const localSession = new LocalSession({
    database: 'sessions.json',
    state: {
        topics: []
    }
})

bot.use(localSession.middleware())

bot.start(async ctx => {
    try {
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
            await ctx.sendMessage('User started chat', {chat_id: process.env.ADMIN_CHAT_ID, message_thread_id: newTopic.message_thread_id})
        }
    } catch (error) {
        await ctx.reply('Sorry! I have some troubles :-(')
    }
})

bot.on(message(), async (ctx) => {
    try {
        if (ctx.update.message.from.is_bot) return;

        // ctx.update.message.from?.language_code

        if (ctx.update.message?.message_thread_id === +process.env.PROMO_MESSAGE_THREAD) await resendPromoMessage(ctx)
        else if (isAdmin(ctx.update.message.chat.id)) await resendToUser(ctx)
        else await resendToAdmin(ctx)
    } catch (_) {
        await ctx.reply('Sorry! I have some troubles :-(')
    }
})

bot.launch()
console.log("Bot launched")
