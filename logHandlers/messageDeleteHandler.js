const { logsCollection } = require('../mongodb');
const { EmbedBuilder } = require('discord.js');
const logHandlersIcons = require('../UI/icons/loghandlers');

module.exports = async function messageDeleteHandler(client) {
    client.on('messageDelete', async (message) => {
        if (!message.guild || message.partial) return;

        const config = await logsCollection.findOne({ guildId: message.guild.id, eventType: 'messageDelete' });
        if (!config || !config.channelId) return;

        const logChannel = client.channels.cache.get(config.channelId);
        if (!logChannel) return;

        const author = message.author;
        const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Message deleted')
            .setColor('#FF0000')
            .setThumbnail(author?.displayAvatarURL({ dynamic: true }) || logHandlersIcons.msgIcon)
            .setDescription(
                `> **Channel:** ${message.channel.name} (${message.channel})\n` +
                `> **Message ID:** [${message.id}](${messageLink})\n` +
                `> **Message author:** ${author?.tag || 'Unknown'} (<@${author?.id || '0'}>)\n` +
                `> **Message created:** <t:${Math.floor(message.createdTimestamp / 1000)}:R>`
            )
            .addFields(
                { name: 'Content', value: message.content?.slice(0, 1024) || '*No content*' }
            )
            .setFooter({ text: 'Logs System', iconURL: logHandlersIcons.footerIcon })
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    });
};
