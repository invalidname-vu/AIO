const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionsBitField, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const checkPermissions = require('../../utils/checkPermissions');
const { 
    createOrUpdateCommand, 
    deleteCommand, 
    getUserCommands
} = require('../../models/customCommands');
const { customCommandsCollection } = require('../../mongodb');
const cmdIcons = require('../../UI/icons/commandicons');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('customcommands')
        .setDescription('📜 Manage custom commands.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a new custom command.')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The command name (no spaces, max 20 chars).')
                        .setRequired(true)
                        .setMaxLength(20))
                .addStringOption(option =>
                    option.setName('response')
                        .setDescription('The response text (max 200 chars).')
                        .setRequired(true)
                        .setMaxLength(200)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a custom command.')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The command name.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Show all custom commands you created.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('audit')
                .setDescription('List all custom commands (Admin only).')),

    async execute(interaction) {
        
     if (interaction.isCommand && interaction.isCommand()) {
        const guild = interaction.guild;
            const serverId = interaction.guild.id;
            if (!await checkPermissions(interaction)) return;
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        if (subcommand === 'set') {
            const name = interaction.options.getString('name').toLowerCase();
            const response = interaction.options.getString('response');

            // **Restricted words**
            const restrictedNames = ['nuke', 'raid', 'hack', 'shutdown', 'ban', 'delete', 'hentai', 'love'];
            if (restrictedNames.includes(name)) {
                return interaction.editReply(`❌ The command name \`${name}\` is restricted.`);
            }

            // **Forbid code injections or malicious content**
            const forbiddenPatterns = [
                /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                /drop\s+table\s+/gi,
                /select\s+\*\s+from\s+/gi,
                /[`$|{}<>;]/g
            ];
            if (forbiddenPatterns.some(pattern => pattern.test(response))) {
                return interaction.editReply(`❌ Your response contains forbidden content.`);
            }

            // **Allow only plain text or URLs**
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const isUrl = urlRegex.test(response);
            const isText = /^[a-zA-Z0-9\s.,!?'"-]+$/.test(response);
            if (!isUrl && !isText) {
                return interaction.editReply(`❌ Only plain text and URLs are allowed.`);
            }

            await createOrUpdateCommand(userId, name, response);
            return interaction.editReply(`✅ Custom command **/${name}** has been set.`);

        } else if (subcommand === 'delete') {
            const name = interaction.options.getString('name').toLowerCase();
            const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            const wasDeleted = await deleteCommand(userId, name, isAdmin);

            if (!wasDeleted) {
                return interaction.editReply(`❌ You don't have permission to delete \`${name}\`, or it does not exist.`);
            }
            return interaction.editReply(`🗑️ Custom command **/${name}** has been deleted.`);

        } else if (subcommand === 'show') {
            const commands = await getUserCommands(userId);

            if (commands.length === 0) {
                return interaction.editReply(`❌ You have no custom commands.`);
            }

            const commandList = commands.map(cmd => `\`/${cmd.commandName}\` → ${cmd.response}`).join('\n');
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('📜 Your Custom Commands')
                .setDescription(commandList)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'audit') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.editReply(`❌ You do not have permission to audit commands.`);
            }

            const allCommands = await customCommandsCollection.find({}).toArray();
            if (allCommands.length === 0) {
                return interaction.editReply(`❌ No custom commands have been set.`);
            }

            const commandChunks = [];
            let currentChunk = '';

            for (const cmd of allCommands) {
                const entry = `👤 <@${cmd.userId}> | \`/${cmd.commandName}\` → ${cmd.response}\n`;
                if ((currentChunk + entry).length > 1024) {
                    commandChunks.push(currentChunk);
                    currentChunk = entry;
                } else {
                    currentChunk += entry;
                }
            }
            if (currentChunk) commandChunks.push(currentChunk);

            let page = 0;
            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('📋 Custom Commands Audit')
                .setDescription(commandChunks[page])
                .setFooter({ text: `Page ${page + 1} of ${commandChunks.length}` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('⬅️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('➡️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(commandChunks.length === 1)
            );

            const reply = await interaction.editReply({ embeds: [embed], components: [row] });

            const filter = i => (i.customId === 'previous' || i.customId === 'next') && i.user.id === interaction.user.id;
            const collector = reply.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'previous') page--;
                if (i.customId === 'next') page++;

                embed.setDescription(commandChunks[page]);
                embed.setFooter({ text: `Page ${page + 1} of ${commandChunks.length}` });

                row.components[0].setDisabled(page === 0);
                row.components[1].setDisabled(page === commandChunks.length - 1);

                await i.update({ embeds: [embed], components: [row] });
            });

            collector.on('end', () => interaction.editReply({ components: [] }));
        }
    } else {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ 
                name: "Alert!", 
                iconURL: cmdIcons.dotIcon,
                url: "https://discord.gg/k8FkPyA3ST"
            })
            .setDescription('- This command can only be used through slash commands!\n- Please use `/customcommands`')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
    }
};