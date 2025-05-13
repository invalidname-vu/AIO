const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const cmdIcons = require('../../UI/icons/commandicons');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Manage channels in the server.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get detailed information about a channel.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the channel.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slowmode')
                .setDescription('Set slowmode duration for a channel.')
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in seconds (0-21600).')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('removeslowmode')
                .setDescription('Remove slowmode from the channel.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lock')
                .setDescription('Lock the channel to prevent messages.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlock')
                .setDescription('Unlock the channel to allow messages again.')),

    async execute(interaction) {
        
     if (interaction.isCommand && interaction.isCommand()) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: '❌ You do not have permission to manage channels.',  flags: 64 });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'info') {
            // Get channel info
            const channel = interaction.options.getChannel('channel');

            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`Channel Information: ${channel.name}`)
                .setDescription(`
                    **Channel Name:** ${channel.name}
                    **Channel ID:** ${channel.id}
                    **Channel Type:** ${ChannelType[channel.type]}
                    **Created At:** <t:${Math.floor(channel.createdTimestamp / 1000)}:F>
                    **Topic:** ${channel.topic || 'None'}
                    **NSFW:** ${channel.nsfw ? 'Yes' : 'No'}
                    **Position:** ${channel.position}
                    **Category:** ${channel.parent ? channel.parent.name : 'None'}
                `)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'slowmode') {
            // Set slowmode
            const duration = interaction.options.getInteger('duration');

            if (duration < 0 || duration > 21600) {
                return interaction.reply({ content: '❌ Slowmode duration must be between 0 and 21600 seconds.',  flags: 64 });
            }

            await interaction.channel.setRateLimitPerUser(duration);
            return interaction.reply({ content: `✅ Slowmode set to **${duration} seconds**.` });

        } else if (subcommand === 'removeslowmode') {
            // Remove slowmode
            await interaction.channel.setRateLimitPerUser(0);
            return interaction.reply({ content: '✅ Slowmode has been removed from this channel.' });

        } else if (subcommand === 'lock') {
            // Lock channel
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false
            });

            return interaction.reply({ content: '🔒 This channel has been **locked**.' });

        } else if (subcommand === 'unlock') {
            // Unlock channel
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: true
            });

            return interaction.reply({ content: '🔓 This channel has been **unlocked**.' });
        }
    } else {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ 
                name: "Alert!", 
                iconURL: cmdIcons.dotIcon,
                url: "https://discord.gg/k8FkPyA3ST"
            })
            .setDescription('- This command can only be used through slash commands!\n- Please use `/channel`')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
    }
};