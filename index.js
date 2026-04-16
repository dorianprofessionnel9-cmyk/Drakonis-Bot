const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content.includes("[DRAGON]")) {
    const channel = client.channels.cache.get("1494336961601863831");

    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle("🐉 Alerte Dragon")
        .setDescription(message.content)
        .setColor(0x8B0000)
        .setFooter({ text: "Archipel de Berk" });

      channel.send({
        content: "@everyone",
        embeds: [embed]
      });
    }
  }
});

client.login(process.env.TOKEN);
