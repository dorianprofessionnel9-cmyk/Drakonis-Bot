const fs = require('fs');
const {
  Client, GatewayIntentBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  SlashCommandBuilder, REST, Routes,
  PermissionFlagsBits,
  ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ===== CONFIG =====
const SHOP_CHANNEL_ID = "1494360495577108600";
const DRAGON_CHANNEL_ID = "1494336961601863831";
const LOG_CHANNEL_ID = "1494371990113353978";
const LINK_ROLE_ID = "1494385453145788476";
const GUILD_ID = "1480204997613457541";
const INTEREST_RATE = 0.05;
// ==================

// ===== DATA =====
let money = {}, shopItems = [], links = {}, kills = {}, bank = {}, linkCodes = {};

try { shopItems = JSON.parse(fs.readFileSync('shop.json')); } catch { shopItems = []; }
try { money = JSON.parse(fs.readFileSync('money.json')); } catch { money = {}; }
try { links = JSON.parse(fs.readFileSync('links.json')); } catch { links = {}; }
try { kills = JSON.parse(fs.readFileSync('kills.json')); } catch { kills = {}; }
try { bank = JSON.parse(fs.readFileSync('bank.json')); } catch { bank = {}; }

function saveAll() {
  fs.writeFileSync('shop.json', JSON.stringify(shopItems, null, 2));
  fs.writeFileSync('money.json', JSON.stringify(money, null, 2));
  fs.writeFileSync('links.json', JSON.stringify(links, null, 2));
  fs.writeFileSync('kills.json', JSON.stringify(kills, null, 2));
  fs.writeFileSync('bank.json', JSON.stringify(bank, null, 2));
}

// ===== UTIL =====
function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ===== INTÉRÊTS =====
function applyInterest() {
  for (const user in bank) {
    const gain = Math.floor(bank[user] * INTEREST_RATE);
    if (gain > 0) bank[user] += gain;
  }
  saveAll();

  const log = client.channels.cache.get(LOG_CHANNEL_ID);
  if (log) log.send("💎 Intérêts distribués !");
}

// ===== COMMANDES =====
const commands = [

  new SlashCommandBuilder().setName('shop').setDescription('Ouvrir le shop'),
  new SlashCommandBuilder().setName('profil').setDescription('Voir ton profil'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Classement argent'),
  new SlashCommandBuilder().setName('pvptop').setDescription('Classement PvP'),
  new SlashCommandBuilder().setName('link').setDescription('Lier Minecraft'),
  new SlashCommandBuilder().setName('bank').setDescription('Ouvrir la banque'),

  new SlashCommandBuilder()
    .setName('setuplinkpanel')
    .setDescription('Créer panel de liaison')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Ajouter un item')
    .addStringOption(o => o.setName('nom').setDescription('Nom de l’item').setRequired(true))
    .addIntegerOption(o => o.setName('prix').setDescription('Prix').setRequired(true))
    .addStringOption(o => o.setName('give').setDescription('Commande give').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction => {
  try {

    // ===== PANEL =====
    if (interaction.isChatInputCommand() && interaction.commandName === "setuplinkpanel") {

      const embed = new EmbedBuilder()
        .setTitle("🔗 Liaison Minecraft")
        .setDescription("Clique pour lier ton compte")
        .setColor(0x00ffcc);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("link_account")
          .setLabel("🔗 Lier mon compte")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: "✅ Panel créé", ephemeral: true });
    }

    // ===== LINK BUTTON =====
    if (interaction.isButton() && interaction.customId === "link_account") {

      const code = generateCode();
      linkCodes[code] = interaction.user.id;

      return interaction.reply({
        content: `🔗 Code : \`${code}\`\nTape : !link ${code}`,
        ephemeral: true
      });
    }

    // ===== BANK MENU =====
    if (interaction.isChatInputCommand() && interaction.commandName === "bank") {

      const embed = new EmbedBuilder()
        .setTitle("🏦 Banque")
        .setDescription("Choisis une action");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("deposit_modal").setLabel("📥 Déposer").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("withdraw_modal").setLabel("📤 Retirer").setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // ===== MODAL OPEN =====
    if (interaction.isButton() && (interaction.customId === "deposit_modal" || interaction.customId === "withdraw_modal")) {

      const modal = new ModalBuilder()
        .setCustomId(interaction.customId === "deposit_modal" ? "deposit_submit" : "withdraw_submit")
        .setTitle("Banque");

      const input = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("Montant")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      return interaction.showModal(modal);
    }

    // ===== MODAL SUBMIT =====
    if (interaction.isModalSubmit()) {

      const user = interaction.user.id;
      const amount = parseInt(interaction.fields.getTextInputValue("amount"));

      if (!money[user]) money[user] = 0;
      if (!bank[user]) bank[user] = 0;

      if (isNaN(amount) || amount <= 0) {
        return interaction.reply({ content: "❌ Montant invalide", ephemeral: true });
      }

      if (interaction.customId === "deposit_submit") {

        if (money[user] < amount) {
          return interaction.reply({ content: "❌ Pas assez", ephemeral: true });
        }

        money[user] -= amount;
        bank[user] += amount;

      } else {

        if (bank[user] < amount) {
          return interaction.reply({ content: "❌ Pas assez en banque", ephemeral: true });
        }

        bank[user] -= amount;
        money[user] += amount;
      }

      saveAll();

      return interaction.reply({
        content: `💰 Cash: ${money[user]}\n🏦 Banque: ${bank[user]}`,
        ephemeral: true
      });
    }

    // ===== PROFIL =====
    if (interaction.isChatInputCommand() && interaction.commandName === "profil") {

      const u = interaction.user.id;

      if (!money[u]) money[u] = 0;
      if (!bank[u]) bank[u] = 0;

      return interaction.reply({
        content: `💰 Cash: ${money[u]}\n🏦 Banque: ${bank[u]}`,
        ephemeral: true
      });
    }

  } catch (err) {
    console.error(err);
  }
});

// ===== MESSAGE =====
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content.startsWith("!link")) {

    const code = message.content.split(" ")[1];

    if (linkCodes[code]) {

      const id = linkCodes[code];
      links[id] = message.author.username;
      delete linkCodes[code];

      saveAll();

      const member = await message.guild.members.fetch(id);
      if (member) member.roles.add(LINK_ROLE_ID);

      message.channel.send("✅ Compte lié !");
    }
  }

  if (message.content.includes("[KILL]")) {

    const killer = message.content.split(" ")[1];

    if (!kills[killer]) kills[killer] = 0;
    kills[killer]++;

    saveAll();
  }
});

// ===== INTEREST AUTO =====
setInterval(() => applyInterest(), 3600000);

// ===== REGISTER =====
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('clientReady', async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(client.user.id, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Bot prêt");
});

client.login(process.env.TOKEN);
