const dotenv = require("dotenv");
const {Telegraf, Telegram} = require("telegraf");
const LocalSession = require('telegraf-session-local')
const {message} = require("telegraf/filters");
dotenv.config()

const isAdmin = (userChatId) => userChatId === +process.env.ADMIN_CHAT_ID

const bot = new Telegraf(process.env.API_KEY_BOT)

const localSession = new LocalSession({
    database: 'sessions.json',
    state: {
        messages: []
    }
})

bot.use(localSession.middleware())

bot.start(async ctx => {
    if (isAdmin(ctx.update.message.chat.id)) await ctx.reply('Hi, admin')
    else await ctx.reply('Hi, mate. Please send me some messages and i will resend them to support')
})

bot.on(message('reply_to_message', 'text'), async (ctx) => {
    if (isAdmin(ctx.update.message.chat.id)) {
        const chatId = ctx.sessionDB
            .get('messages')
            .value()
            .find((message) => message.messageId === ctx.update.message.reply_to_message.message_id)
            .chatId

        console.log()
        await ctx.sendMessage(ctx.update.message.text, {chat_id: chatId})
    }
})

bot.on(message('text'), async (ctx) => {
    await ctx.reply(`Well, I\`ll send this to my admin)`)

    const isFirstMessage = !ctx.sessionDB
        .get('messages')
        .value()
        .find((message) => message.chatId === ctx.update.message.chat.id)

    let newMessageId

    if (isFirstMessage) {
        const newMessage = await ctx.forwardMessage(
            process.env.ADMIN_CHAT_ID,
        )
        newMessageId = newMessage.message_id
    } else {
        const newMessage = await ctx.reply(
            ctx.update.message.text,
            {
                chat_id: process.env.ADMIN_CHAT_ID,
                reply_parameters: {
                    message_id: ctx.session.lastMessageId
                }
            })
        newMessageId = newMessage.message_id
    }

    ctx.sessionDB.get('messages').push({chatId: ctx.update.message.chat.id, messageId: newMessageId}).write()
    ctx.session.lastMessageId = newMessageId
})

bot.launch()
console.log("Bot launched")