const fs = require('fs');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== CONFIG =====
const SHOP_CHANNEL_ID = "1494360495577108600";
const DRAGON_CHANNEL_ID = "1494336961601863831";
const GUILD_ID = "1480204997613457541";
// ==================

let money = {};
let shopItems = [];

// LOAD DATA
if (fs.existsSync('shop.json')) shopItems = JSON.parse(fs.readFileSync('shop.json'));
if (fs.existsSync('money.json')) money = JSON.parse(fs.readFileSync('money.json'));

function saveData() {
  fs.writeFileSync('shop.json', JSON.stringify(shopItems, null, 2));
  fs.writeFileSync('money.json', JSON.stringify(money, null, 2));
}

// COMMANDES
const commands = [
  new SlashCommandBuilder().setName('shop').setDescription('Ouvrir le shop'),

  new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Créer ton salon privé'),

  new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Ajouter un item')
    .addStringOption(o => o.setName('nom').setRequired(true))
    .addIntegerOption(o => o.setName('prix').setRequired(true))
    .addStringOption(o => o.setName('give').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('clearshop')
    .setDescription('Reset le shop')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(client.user.id, GUILD_ID),
    { body: commands }
  );
});

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction => {
  try {

    // ===== PROFIL =====
    if (interaction.isChatInputCommand() && interaction.commandName === "profil") {

      const guild = interaction.guild;
      const user = interaction.user;

      const existing = guild.channels.cache.find(c => c.name === `profil-${user.username}`);

      if (existing) {
        return interaction.reply({ content: "❌ Tu as déjà un salon profil !", ephemeral: true });
      }

      const channel = await guild.channels.create({
        name: `profil-${user.username}`,
        type: 0,
        permissionOverwrites: [
          { id: guild.id, deny: ['ViewChannel'] },
          { id: user.id, allow: ['ViewChannel', 'SendMessages'] }
        ]
      });

      if (!money[user.id]) money[user.id] = 200;

      await channel.send({
        content: `👋 Bienvenue ${user.username}\n💰 Argent : ${money[user.id]}`
      });

      await interaction.reply({ content: "✅ Salon créé !", ephemeral: true });
    }

    // ===== SHOP =====
    if (interaction.isChatInputCommand() && interaction.commandName === "shop") {

      if (interaction.channel.id !== SHOP_CHANNEL_ID) {
        return interaction.reply({ content: "❌ Va dans le salon shop !", ephemeral: true });
      }

      await interaction.deferReply();

      const embed = new EmbedBuilder()
        .setTitle("🛒 Shop")
        .setDescription("Choisis un item")
        .setColor(0x00ffcc);

      const row = new ActionRowBuilder();

      shopItems.forEach((item, index) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId("buy_" + index)
            .setLabel(`${item.nom} (${item.prix})`)
            .setStyle(ButtonStyle.Primary)
        );
      });

      await interaction.editReply({ embeds: [embed], components: [row] });
    }

    // ===== ADD ITEM ADMIN =====
    if (interaction.isChatInputCommand() && interaction.commandName === "additem") {

      const nom = interaction.options.getString('nom');
      const prix = interaction.options.getInteger('prix');
      const give = interaction.options.getString('give');

      shopItems.push({ nom, prix, give });
      saveData();

      await interaction.reply("✅ Item ajouté !");
    }

    // ===== CLEAR SHOP =====
    if (interaction.isChatInputCommand() && interaction.commandName === "clearshop") {
      shopItems = [];
      saveData();
      await interaction.reply("🧹 Shop vidé !");
    }

    // ===== ACHAT =====
    if (interaction.isButton()) {

      const user = interaction.user.id;
      const username = interaction.user.username;

      if (!money[user]) money[user] = 200;

      if (interaction.customId.startsWith("buy_")) {

        const index = interaction.customId.split("_")[1];
        const item = shopItems[index];

        if (money[user] >= item.prix) {

          money[user] -= item.prix;
          saveData();

          // 🔥 FUTUR MINECRAFT
          console.log(`/` + item.give.replace("@p", username));

          await interaction.reply({
            content: `✅ Achat ${item.nom} ! Argent restant: ${money[user]}`,
            ephemeral: true
          });

        } else {
          await interaction.reply({ content: "❌ Pas assez d'argent", ephemeral: true });
        }
      }
    }

  } catch (err) {
    console.error(err);
  }
});

// ===== DRAGON =====
client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content.includes("[DRAGON]")) {
    const channel = client.channels.cache.get(DRAGON_CHANNEL_ID);

    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle("🐉 Dragon")
        .setDescription(message.content)
        .setColor(0x8B0000);

      channel.send({ content: "@everyone", embeds: [embed] });
    }
  }
});

client.login(process.env.TOKEN);
