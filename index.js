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
const LOG_CHANNEL_ID = "1494371990113353978";
const LINK_ROLE_ID = "1494385453145788476";
const VIP_ROLE_ID = "1494408592441475234";
const GUILD_ID = "1480204997613457541";
const DRAGON_CHANNEL_ID = "1494336961601863831";
const INTEREST_RATE = 0.05;

// ===== DATA =====
let money={}, shopItems=[], links={}, bank={}, daily={}, mailbox={}, linkCodes={};

try { shopItems = JSON.parse(fs.readFileSync('shop.json')); } catch { shopItems=[]; }
try { money = JSON.parse(fs.readFileSync('money.json')); } catch { money={}; }
try { links = JSON.parse(fs.readFileSync('links.json')); } catch { links={}; }
try { bank = JSON.parse(fs.readFileSync('bank.json')); } catch { bank={}; }
try { daily = JSON.parse(fs.readFileSync('daily.json')); } catch { daily={}; }
try { mailbox = JSON.parse(fs.readFileSync('mailbox.json')); } catch { mailbox={}; }

function saveAll(){
  fs.writeFileSync('shop.json', JSON.stringify(shopItems,null,2));
  fs.writeFileSync('money.json', JSON.stringify(money,null,2));
  fs.writeFileSync('links.json', JSON.stringify(links,null,2));
  fs.writeFileSync('bank.json', JSON.stringify(bank,null,2));
  fs.writeFileSync('daily.json', JSON.stringify(daily,null,2));
  fs.writeFileSync('mailbox.json', JSON.stringify(mailbox,null,2));
}

// ===== UTILS =====
function generateCode(){
  const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code="";
  for(let i=0;i<6;i++){
    code+=chars[Math.floor(Math.random()*chars.length)];
  }
  return code;
}

function isVIP(member){
  return member.roles.cache.has(VIP_ROLE_ID);
}

// ===== INTEREST =====
function applyInterest(){
  for(const user in bank){
    const member = client.guilds.cache.get(GUILD_ID)?.members.cache.get(user);
    let rate = INTEREST_RATE;

    if(member && member.roles.cache.has(VIP_ROLE_ID)){
      rate = 0.08;
    }

    const gain = Math.floor(bank[user]*rate);
    if(gain>0) bank[user]+=gain;
  }
  saveAll();
}

// ===== COMMANDES =====
const commands=[

  new SlashCommandBuilder().setName('shop').setDescription('Ouvrir le shop'),
  new SlashCommandBuilder().setName('profil').setDescription('Voir ton profil'),
  new SlashCommandBuilder().setName('bank').setDescription('Banque'),
  new SlashCommandBuilder().setName('daily').setDescription('Récompense quotidienne'),
  new SlashCommandBuilder().setName('mailbox').setDescription('Voir tes messages'),
  new SlashCommandBuilder().setName('link').setDescription('Lier ton compte'),

  new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Ajouter item')
    .addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
    .addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true))
    .addStringOption(o=>o.setName('give').setDescription('Commande').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('sendmail')
    .setDescription('Envoyer mail')
    .addUserOption(o=>o.setName('joueur').setDescription('Joueur').setRequired(true))
    .addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('givevip')
    .setDescription('Donner VIP')
    .addUserOption(o=>o.setName('joueur').setDescription('Joueur').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction=>{
try{

// ===== DAILY =====
if(interaction.isChatInputCommand() && interaction.commandName==="daily"){
  const user=interaction.user.id;
  const member=interaction.member;
  const now=Date.now();

  if(!daily[user]) daily[user]={last:0,streak:0};

  const diff=now-daily[user].last;

  if(diff<86400000){
    return interaction.reply({content:"⏳ Reviens plus tard",ephemeral:true});
  }

  if(diff>172800000) daily[user].streak=0;
  daily[user].streak++;

  let base=isVIP(member)?300:200;
  let reward=base+(daily[user].streak*50);
  if(reward>(isVIP(member)?500:400)) reward=isVIP(member)?500:400;

  if(!money[user]) money[user]=0;
  money[user]+=reward;

  const mc=links[user];
  if(mc){
    if(!mailbox[mc]) mailbox[mc]=[];
    mailbox[mc].push(`🎁 Daily: +${reward}`);
  }

  daily[user].last=now;
  saveAll();

  return interaction.reply({content:`💰 +${reward}`,ephemeral:true});
}

// ===== SHOP =====
if(interaction.isChatInputCommand() && interaction.commandName==="shop"){
  if(interaction.channel.id!==SHOP_CHANNEL_ID){
    return interaction.reply({content:"❌ Mauvais salon",ephemeral:true});
  }

  if(shopItems.length===0){
    return interaction.reply({content:"❌ Shop vide",ephemeral:true});
  }

  const row=new ActionRowBuilder();

  shopItems.forEach((item,i)=>{
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("buy_"+i)
        .setLabel(`${item.nom} (${item.prix})`)
        .setStyle(ButtonStyle.Primary)
    );
  });

  return interaction.reply({content:"🛒 Shop",components:[row]});
}

// ===== ACHAT =====
if(interaction.isButton() && interaction.customId.startsWith("buy_")){
  const user=interaction.user.id;
  const member=interaction.member;

  const item=shopItems[interaction.customId.split("_")[1]];
  let price=item.prix;

  if(isVIP(member)) price=Math.floor(price*0.9);

  if(!money[user]) money[user]=0;

  if(money[user]<price){
    return interaction.reply({content:"❌ Pas assez",ephemeral:true});
  }

  money[user]-=price;
  saveAll();

  return interaction.reply({content:`✅ Achat (${price})`,ephemeral:true});
}

// ===== BANK =====
if(interaction.isChatInputCommand() && interaction.commandName==="bank"){
  const row=new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("dep").setLabel("📥 Déposer").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("with").setLabel("📤 Retirer").setStyle(ButtonStyle.Danger)
  );
  return interaction.reply({content:"🏦 Banque",components:[row],ephemeral:true});
}

if(interaction.isButton() && (interaction.customId==="dep"||interaction.customId==="with")){
  const modal=new ModalBuilder()
    .setCustomId(interaction.customId==="dep"?"dep_m":"with_m")
    .setTitle("Banque");

  const input=new TextInputBuilder()
    .setCustomId("amount")
    .setLabel("Montant")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return interaction.showModal(modal);
}

if(interaction.isModalSubmit()){
  const user=interaction.user.id;
  const amount=parseInt(interaction.fields.getTextInputValue("amount"));

  if(!money[user]) money[user]=0;
  if(!bank[user]) bank[user]=0;

  if(isNaN(amount)||amount<=0){
    return interaction.reply({content:"❌ Montant invalide",ephemeral:true});
  }

  if(interaction.customId==="dep_m"){
    if(money[user]<amount) return interaction.reply({content:"❌ Pas assez",ephemeral:true});
    money[user]-=amount;
    bank[user]+=amount;
  }else{
    if(bank[user]<amount) return interaction.reply({content:"❌ Pas assez",ephemeral:true});
    bank[user]-=amount;
    money[user]+=amount;
  }

  saveAll();
  return interaction.reply({content:`💰 ${money[user]} / 🏦 ${bank[user]}`,ephemeral:true});
}

// ===== MAILBOX =====
if(interaction.isChatInputCommand() && interaction.commandName==="mailbox"){
  const user=interaction.user.id;
  const mc=links[user];

  if(!mc||!mailbox[mc]||mailbox[mc].length===0){
    return interaction.reply({content:"📭 Aucun message",ephemeral:true});
  }

  return interaction.reply({content:mailbox[mc].join("\n"),ephemeral:true});
}

// ===== SEND MAIL =====
if(interaction.commandName==="sendmail"){
  const user=interaction.options.getUser('joueur');
  const msg=interaction.options.getString('message');

  const mc=links[user.id];
  if(!mc) return interaction.reply({content:"❌ Joueur non lié",ephemeral:true});

  if(!mailbox[mc]) mailbox[mc]=[];
  mailbox[mc].push(`📩 ADMIN: ${msg}`);

  saveAll();

  return interaction.reply({content:"✅ Mail envoyé",ephemeral:true});
}

// ===== GIVE VIP =====
if(interaction.commandName==="givevip"){
  const user=interaction.options.getUser('joueur');
  const member=await interaction.guild.members.fetch(user.id);

  await member.roles.add(VIP_ROLE_ID);

  return interaction.reply(`👑 ${user.username} est VIP`);
}

// ===== ADD ITEM =====
if(interaction.commandName==="additem"){
  shopItems.push({
    nom:interaction.options.getString('nom'),
    prix:interaction.options.getInteger('prix'),
    give:interaction.options.getString('give')
  });
  saveAll();
  return interaction.reply("✅ Item ajouté");
}

}catch(e){console.error(e);}
});

// ===== LINK =====
client.on('messageCreate', async message=>{
if(message.author.bot) return;

if(message.content.startsWith("!link")){
  const code=message.content.split(" ")[1];

  if(linkCodes[code]){
    const id=linkCodes[code];
    links[id]=message.author.username;
    delete linkCodes[code];
    saveAll();

    const member=await message.guild.members.fetch(id);
    if(member) member.roles.add(LINK_ROLE_ID);

    message.channel.send("✅ Compte lié !");
  }
}
});

// ===== AUTO =====
setInterval(()=>applyInterest(),3600000);

// ===== REGISTER =====
const rest=new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('clientReady', async()=>{
  await rest.put(
    Routes.applicationGuildCommands(client.user.id,GUILD_ID),
    {body:commands}
  );
  console.log("✅ BOT PRÊT");
});
// ===== DRAGON ANNOUNCE =====
client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content.includes("[DRAGON]")) {

    const channel = client.channels.cache.get(DRAGON_CHANNEL_ID);

    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle("🐉 Dragon")
      .setDescription(message.content.replace("[DRAGON]", ""))
      .setColor(0x8B0000);

    channel.send({
      content: "@everyone",
      embeds: [embed]
    });
  }
});

client.login(process.env.TOKEN);
