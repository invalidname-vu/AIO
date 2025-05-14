const logHandlersIcons = require('../UI/icons/loghandlers');
const { logsCollection } = require('../mongodb');
const { EmbedBuilder } = require('discord.js');

module.exports = async function messageUpdateHandler(client) {
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        // Ignore partials or DMs
        if (!oldMessage.guild || oldMessage.partial || newMessage.partial) return;

        // Skip if both old & new content are the same (may happen with embeds, reactions, etc.)
        if (oldMessage.content === newMessage.content) return;

        const config = await logsCollection.findOne({ guildId: oldMessage.guild.id, eventType: 'messageUpdate' });
        if (!config || !config.channelId) return;

        const logChannel = client.channels.cache.get(config.channelId);
        if (!logChannel) return;

        const author = oldMessage.author;
        const createdAt = `<t:${Math.floor(oldMessage.createdTimestamp / 1000)}:R>`; // Discord timestamp

        const embed = new EmbedBuilder()
            .setTitle('📝 Message edited')
            .setColor('#FFCC00')
            .setThumbnail(author.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `> **Channel:** ${oldMessage.channel.name} (${oldMessage.channel})\n` +
                `> **Message ID:** [${oldMessage.id}](https://discord.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id})\n` +
                `> **Message author:** ${author.tag} (<@${author.id}>)\n` +
                `> **Message created:** <t:${Math.floor(oldMessage.createdTimestamp / 1000)}:R>`
            )
            .addFields(
                { name: 'Before', value: oldMessage.content?.slice(0, 1024) || '*No content*', inline: true },
                { name: 'After', value: newMessage.content?.slice(0, 1024) || '*No content*', inline: true }
            )
            .setFooter({ text: 'Logs System', iconURL: logHandlersIcons.footerIcon })
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    });
};
