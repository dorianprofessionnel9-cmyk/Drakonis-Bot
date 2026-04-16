const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const commands = [
  new SlashCommandBuilder().setName('dragon').setDescription('Annonce un dragon'),
  new SlashCommandBuilder().setName('event').setDescription('Annonce un event'),
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("Commandes enregistrées !");
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'dragon') {
    const embed = new EmbedBuilder()
      .setTitle("🐉 Dragon apparu !")
      .setDescription("Un dragon vient d'apparaître dans le monde !")
      .setColor(0xff0000);

    await interaction.reply({ content: "@everyone", embeds: [embed] });
  }

  if (interaction.commandName === 'event') {
    const embed = new EmbedBuilder()
      .setTitle("🎉 Event en cours !")
      .setDescription("Un événement est disponible ! Rejoignez vite !")
      .setColor(0x00ffcc);

    await interaction.reply({ embeds: [embed] });
  }
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content.includes("[DRAGON]")) {
    const channel = client.channels.cache.get("1494336961601863831");

    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle("🐉 Dragon détecté")
        .setDescription(message.content)
        .setColor(0x8B0000);

      channel.send({ content: "@everyone", embeds: [embed] });
    }
  }
});

client.login(process.env.TOKEN);
