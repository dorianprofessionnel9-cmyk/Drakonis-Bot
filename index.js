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
const CHAT_CHANNEL_ID = "1494431096631332944";
const INTEREST_RATE = 0.05;

// ===== DATA =====
let money={}, shopItems=[], bank={}, daily={}, reputation={};

try { shopItems = JSON.parse(fs.readFileSync('shop.json')); } catch {}
try { money = JSON.parse(fs.readFileSync('money.json')); } catch {}
try { bank = JSON.parse(fs.readFileSync('bank.json')); } catch {}
try { daily = JSON.parse(fs.readFileSync('daily.json')); } catch {}
try { reputation = JSON.parse(fs.readFileSync('rep.json')); } catch {}

function saveAll(){
  fs.writeFileSync('shop.json', JSON.stringify(shopItems,null,2));
  fs.writeFileSync('money.json', JSON.stringify(money,null,2));
  fs.writeFileSync('bank.json', JSON.stringify(bank,null,2));
  fs.writeFileSync('daily.json', JSON.stringify(daily,null,2));
  fs.writeFileSync('rep.json', JSON.stringify(reputation,null,2));
}

// ===== LOG =====
function sendLog(title, desc){
  const ch = client.channels.cache.get(LOG_CHANNEL_ID);
  if(!ch) return;

  ch.send({
    embeds:[
      new EmbedBuilder()
      .setTitle(title)
      .setDescription(desc)
      .setColor(0x00ffcc)
      .setTimestamp()
    ]
  });
}

// ===== UTILS =====
function safeMoney(u){
  if(!money[u]) money[u]=0;
  if(money[u]<0) money[u]=0;
}

function addRep(u, val){
  if(!reputation[u]) reputation[u]=0;
  reputation[u]+=val;
}

// ===== COMMANDES =====
const commands = [

new SlashCommandBuilder()
.setName('shop')
.setDescription('Ouvrir le shop'),

new SlashCommandBuilder()
.setName('bank')
.setDescription('Ouvrir la banque'),

new SlashCommandBuilder()
.setName('daily')
.setDescription('Récompense quotidienne'),

new SlashCommandBuilder()
.setName('rep')
.setDescription('Voir ta réputation'),

new SlashCommandBuilder()
.setName('additem')
.setDescription('Ajouter un item')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true))
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

];

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction=>{
try{

const user = interaction.user.id;

// DAILY
if(interaction.commandName==="daily"){
const now=Date.now();

if(!daily[user]) daily[user]={last:0};

if(now-daily[user].last<86400000)
return interaction.reply({content:"⏳ Reviens demain",ephemeral:true});

const reward=200;

money[user]=(money[user]||0)+reward;
safeMoney(user);
addRep(user,5);

daily[user].last=now;
saveAll();

sendLog("🎁 Daily",`${interaction.user.username} +${reward}`);

return interaction.reply({content:`+${reward}`,ephemeral:true});
}

// SHOP
if(interaction.commandName==="shop"){
if(shopItems.length===0) return interaction.reply("❌ Shop vide");

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
const item=shopItems[interaction.customId.split("_")[1]];
if(!item) return;

if((money[user]||0)<item.prix)
return interaction.reply({content:"❌ Pas assez",ephemeral:true});

money[user]-=item.prix;
safeMoney(user);
saveAll();

sendLog("🛒 Achat",interaction.user.username);

return interaction.reply({content:"✅ Achat",ephemeral:true});
}

// BANK
if(interaction.commandName==="bank"){
return interaction.reply({
content:`💰 ${money[user]||0} | 🏦 ${bank[user]||0}`,
ephemeral:true
});
}

// REP
if(interaction.commandName==="rep"){
return interaction.reply({
content:`⭐ ${reputation[user]||0}`,
ephemeral:true
});
}

// ADD ITEM
if(interaction.commandName==="additem"){
shopItems.push({
nom:interaction.options.getString('nom'),
prix:interaction.options.getInteger('prix')
});
saveAll();
return interaction.reply("✅ ajouté");
}

}catch(e){console.error(e);}
});

// ===== MESSAGE CREATE =====
client.on('messageCreate',(m)=>{
if(m.author.bot) return;

const msg=m.content;

// DRAGON
if(msg.includes("[DRAGON]"))
return client.channels.cache.get(DRAGON_CHANNEL_ID)?.send(`🐉 ${msg}`);

// STATUS
if(msg.includes("Server started"))
return client.channels.cache.get(STATUS_CHANNEL_ID)?.send("🟢 ON");

if(msg.includes("Server stopped"))
return client.channels.cache.get(STATUS_CHANNEL_ID)?.send("🔴 OFF");

// CHAT
client.channels.cache.get(CHAT_CHANNEL_ID)?.send(msg);

});

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
