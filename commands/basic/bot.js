const cmdIcons = require('../../UI/icons/commandicons');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const lang = require('../../events/loadLanguage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot')
    .setDescription('Bot related commands.')
    // Subcommand: ping
    .addSubcommand(subcommand =>
      subcommand
        .setName('ping')
        .setDescription(lang.pingDescription)
    )
    // Subcommand: invite
    .addSubcommand(subcommand =>
      subcommand
        .setName('invite')
        .setDescription(lang.inviteDescription)
    )
    // Subcommand: support
    .addSubcommand(subcommand =>
        subcommand
            .setName('support')
            .setDescription(lang.supportDescription)
    ),
  async execute(interaction) {
    if (interaction.isCommand && interaction.isCommand()) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'ping') {
      const botLatency = Date.now() - interaction.createdTimestamp;
      const apiLatency = interaction.client.ws.ping;
      
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(lang.pingTitle)
        .setDescription(`${lang.botLatency}: ${botLatency}ms\n${lang.apiLatency}: ${apiLatency}ms`)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    }
    else if (subcommand === 'support') {
        const supportServerLink = lang.supportServerLink;

        const embed = new EmbedBuilder()
            .setColor('#b300ff')
            .setAuthor({
                name: lang.supportTitle,
                iconURL: cmdIcons.rippleIcon,
                url: supportServerLink
            })
            .setDescription(`
                ➡️ **${lang.supportDescriptionTitle}:**
                - ${lang.discord} - ${supportServerLink}
            `)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
    else if (subcommand === 'invite') {
      const clientId = interaction.client.user.id;
      const adminPermissions = 8; 
      
     
      const inviteURL = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${adminPermissions}&integration_type=0&scope=bot`;
      
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setAuthor({ 
          name: lang.inviteTitle, 
          iconURL: cmdIcons.rippleIcon,
          url: "https://discord.gg/k8FkPyA3ST" 
        })
        .setDescription(lang.inviteDescription.replace('{inviteURL}', inviteURL))
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    }
} else {
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setAuthor({ 
            name: "Alert!", 
            iconURL: cmdIcons.dotIcon,
            url: "https://discord.gg/k8FkPyA3ST"
        })
        .setDescription('- This command can only be used through slash command!\n- Please use `/bot`')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 
  },
};