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

const STATUS_CHANNEL_ID = "1482388693208793299";
const CHAT_CHANNEL_ID = "1480217361498771526";

const INTEREST_RATE = 0.05;

// ===== DATA =====
let money={}, shopItems=[], links={}, bank={}, daily={}, mailbox={};

try { shopItems = JSON.parse(fs.readFileSync('shop.json')); } catch {}
try { money = JSON.parse(fs.readFileSync('money.json')); } catch {}
try { links = JSON.parse(fs.readFileSync('links.json')); } catch {}
try { bank = JSON.parse(fs.readFileSync('bank.json')); } catch {}
try { daily = JSON.parse(fs.readFileSync('daily.json')); } catch {}
try { mailbox = JSON.parse(fs.readFileSync('mailbox.json')); } catch {}

function saveAll(){
  fs.writeFileSync('shop.json', JSON.stringify(shopItems,null,2));
  fs.writeFileSync('money.json', JSON.stringify(money,null,2));
  fs.writeFileSync('links.json', JSON.stringify(links,null,2));
  fs.writeFileSync('bank.json', JSON.stringify(bank,null,2));
  fs.writeFileSync('daily.json', JSON.stringify(daily,null,2));
  fs.writeFileSync('mailbox.json', JSON.stringify(mailbox,null,2));
}

// ===== LOG =====
function sendLog(title, desc){
  const ch = client.channels.cache.get(LOG_CHANNEL_ID);
  if(!ch) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(0x00ffcc)
    .setTimestamp();

  ch.send({embeds:[embed]});
}

// ===== VIP =====
function isVIP(member){
  return member.roles.cache.has(VIP_ROLE_ID);
}

// ===== INTEREST =====
function applyInterest(){
  for(const u in bank){
    const member = client.guilds.cache.get(GUILD_ID)?.members.cache.get(u);
    let rate = INTEREST_RATE;
    if(member && member.roles.cache.has(VIP_ROLE_ID)) rate = 0.08;

    const gain = Math.floor(bank[u]*rate);
    if(gain>0) bank[u]+=gain;
  }
  saveAll();
}

// ===== COMMANDES =====
const commands=[

new SlashCommandBuilder().setName('shop').setDescription('Shop'),
new SlashCommandBuilder().setName('bank').setDescription('Banque'),
new SlashCommandBuilder().setName('daily').setDescription('Daily'),
new SlashCommandBuilder().setName('mailbox').setDescription('Mailbox'),

new SlashCommandBuilder()
.setName('additem')
.addStringOption(o=>o.setName('nom').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setRequired(true))
.addStringOption(o=>o.setName('give').setRequired(true))
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

new SlashCommandBuilder()
.setName('sendmail')
.addUserOption(o=>o.setName('joueur').setRequired(true))
.addStringOption(o=>o.setName('message').setRequired(true))
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

new SlashCommandBuilder()
.setName('givevip')
.addUserOption(o=>o.setName('joueur').setRequired(true))
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction=>{
try{

// DAILY
if(interaction.isChatInputCommand() && interaction.commandName==="daily"){
const u=interaction.user.id;
const m=interaction.member;
const now=Date.now();

if(!daily[u]) daily[u]={last:0,streak:0};

if(now-daily[u].last<86400000)
return interaction.reply({content:"⏳",ephemeral:true});

daily[u].streak++;
let reward=(isVIP(m)?300:200)+(daily[u].streak*50);

if(!money[u]) money[u]=0;
money[u]+=reward;
daily[u].last=now;

saveAll();
sendLog("🎁 Daily",`${interaction.user.username} +${reward}`);

return interaction.reply({content:`💰 +${reward}`,ephemeral:true});
}

// SHOP
if(interaction.commandName==="shop"){
if(shopItems.length===0) return interaction.reply("❌ Vide");

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

// BUY
if(interaction.isButton() && interaction.customId.startsWith("buy_")){
const u=interaction.user.id;
const m=interaction.member;
const item=shopItems[interaction.customId.split("_")[1]];

let price=item.prix;
if(isVIP(m)) price=Math.floor(price*0.9);

if(!money[u]) money[u]=0;
if(money[u]<price) return interaction.reply({content:"❌",ephemeral:true});

money[u]-=price;
saveAll();

sendLog("🛒 Achat",`${interaction.user.username} ${item.nom} (${price})`);

return interaction.reply({content:"✅ Achat",ephemeral:true});
}

// BANK
if(interaction.commandName==="bank"){
const row=new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("dep").setLabel("Déposer").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("with").setLabel("Retirer").setStyle(ButtonStyle.Danger)
);
return interaction.reply({content:"🏦",components:[row],ephemeral:true});
}

if(interaction.isButton() && (interaction.customId==="dep"||interaction.customId==="with")){
const modal=new ModalBuilder()
.setCustomId(interaction.customId==="dep"?"dep_m":"with_m")
.setTitle("Banque");

const input=new TextInputBuilder()
.setCustomId("amount")
.setLabel("Montant")
.setStyle(TextInputStyle.Short);

modal.addComponents(new ActionRowBuilder().addComponents(input));
return interaction.showModal(modal);
}

if(interaction.isModalSubmit()){
const u=interaction.user.id;
const amount=parseInt(interaction.fields.getTextInputValue("amount"));

if(!money[u]) money[u]=0;
if(!bank[u]) bank[u]=0;

if(interaction.customId==="dep_m"){
money[u]-=amount;
bank[u]+=amount;
sendLog("🏦 Dépôt",`${interaction.user.username} ${amount}`);
}else{
bank[u]-=amount;
money[u]+=amount;
sendLog("🏦 Retrait",`${interaction.user.username} ${amount}`);
}

saveAll();
return interaction.reply({content:`💰 ${money[u]} | 🏦 ${bank[u]}`,ephemeral:true});
}

// MAIL
if(interaction.commandName==="mailbox"){
const u=interaction.user.id;
const mc=links[u];

if(!mc||!mailbox[mc]) return interaction.reply("📭");

return interaction.reply({content:mailbox[mc].join("\n"),ephemeral:true});
}

// SENDMAIL
if(interaction.commandName==="sendmail"){
const user=interaction.options.getUser('joueur');
const msg=interaction.options.getString('message');

const mc=links[user.id];
if(!mc) return interaction.reply("❌");

if(!mailbox[mc]) mailbox[mc]=[];
mailbox[mc].push(msg);

saveAll();
sendLog("📩 Mail",`→ ${user.username}`);

return interaction.reply("✅");
}

// VIP
if(interaction.commandName==="givevip"){
const user=interaction.options.getUser('joueur');
const member=await interaction.guild.members.fetch(user.id);

await member.roles.add(VIP_ROLE_ID);
sendLog("👑 VIP",`${user.username}`);

return interaction.reply("OK");
}

// ADDITEM
if(interaction.commandName==="additem"){
shopItems.push({
nom:interaction.options.getString('nom'),
prix:interaction.options.getInteger('prix'),
give:interaction.options.getString('give')
});
saveAll();
return interaction.reply("OK");
}

}catch(e){console.error(e);}
});

// ===== MESSAGE CREATE UNIQUE =====
client.on('messageCreate', (message)=>{
if(message.author.bot) return;

const msg = message.content;

// DRAGON
if(msg.includes("[DRAGON]")){
return client.channels.cache.get(DRAGON_CHANNEL_ID)?.send(`🐉 ${msg}`);
}

// SERVEUR ON
if(msg.includes("Done") || msg.includes("Server started")){
return client.channels.cache.get(STATUS_CHANNEL_ID)?.send("🟢 Serveur ON");
}

// SERVEUR OFF
if(msg.includes("Stopping") || msg.includes("Server stopped")){
return client.channels.cache.get(STATUS_CHANNEL_ID)?.send("🔴 Serveur OFF");
}

// JOIN / LEAVE
if(msg.includes("joined the game") || msg.includes("left the game")){
return client.channels.cache.get(STATUS_CHANNEL_ID)?.send(msg);
}

// CHAT
return client.channels.cache.get(CHAT_CHANNEL_ID)?.send(msg);

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

client.login(process.env.TOKEN);
