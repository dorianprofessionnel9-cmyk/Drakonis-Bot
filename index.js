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
let money={}, shopItems=[], links={}, bank={}, daily={}, mailbox={}, vipData={}, reputation={}, bans={}, spam={};

try { shopItems = JSON.parse(fs.readFileSync('shop.json')); } catch {}
try { money = JSON.parse(fs.readFileSync('money.json')); } catch {}
try { links = JSON.parse(fs.readFileSync('links.json')); } catch {}
try { bank = JSON.parse(fs.readFileSync('bank.json')); } catch {}
try { daily = JSON.parse(fs.readFileSync('daily.json')); } catch {}
try { mailbox = JSON.parse(fs.readFileSync('mailbox.json')); } catch {}
try { vipData = JSON.parse(fs.readFileSync('vip.json')); } catch {}
try { reputation = JSON.parse(fs.readFileSync('rep.json')); } catch {}
try { bans = JSON.parse(fs.readFileSync('bans.json')); } catch {}

function saveAll(){
  fs.writeFileSync('shop.json', JSON.stringify(shopItems,null,2));
  fs.writeFileSync('money.json', JSON.stringify(money,null,2));
  fs.writeFileSync('links.json', JSON.stringify(links,null,2));
  fs.writeFileSync('bank.json', JSON.stringify(bank,null,2));
  fs.writeFileSync('daily.json', JSON.stringify(daily,null,2));
  fs.writeFileSync('mailbox.json', JSON.stringify(mailbox,null,2));
  fs.writeFileSync('vip.json', JSON.stringify(vipData,null,2));
  fs.writeFileSync('rep.json', JSON.stringify(reputation,null,2));
  fs.writeFileSync('bans.json', JSON.stringify(bans,null,2));
}

// ===== LOG =====
function sendLog(title, desc, color=0x00ffcc){
  const ch = client.channels.cache.get(LOG_CHANNEL_ID);
  if(!ch) return;
  ch.send({
    embeds:[new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color).setTimestamp()]
  });
}

// ===== UTILS =====
function isVIP(member){
  return member.roles.cache.has(VIP_ROLE_ID);
}

function safeMoney(user){
  if(!money[user]) money[user]=0;
  if(money[user]<0) money[user]=0;
  if(money[user]>100000000) money[user]=100000000;
}

function addRep(user, amount){
  if(!reputation[user]) reputation[user]=0;
  reputation[user]+=amount;
  if(reputation[user]>1000) reputation[user]=1000;
  if(reputation[user]<-1000) reputation[user]=-1000;
}

// ===== BAN =====
async function tempBan(userId, duration, reason){
  const guild = client.guilds.cache.get(GUILD_ID);
  const member = guild?.members.cache.get(userId);
  if(!member) return;

  bans[userId]=Date.now()+duration;
  await member.timeout(duration, reason);

  sendLog("🚫 AntiCheat",`${member.user.username}\n${reason}`,0xff0000);
  saveAll();
}

function checkBans(){
  const now=Date.now();
  for(const u in bans){
    if(now>bans[u]){
      const member=client.guilds.cache.get(GUILD_ID)?.members.cache.get(u);
      if(member) member.timeout(null);
      delete bans[u];
    }
  }
}

// ===== VIP CHECK =====
function checkVIP(){
  const now=Date.now();
  for(const u in vipData){
    if(now>vipData[u]){
      const member=client.guilds.cache.get(GUILD_ID)?.members.cache.get(u);
      if(member) member.roles.remove(VIP_ROLE_ID);
      delete vipData[u];
    }
  }
}

// ===== COMMANDES =====
const commands=[
new SlashCommandBuilder().setName('shop').setDescription('Shop'),
new SlashCommandBuilder().setName('bank').setDescription('Banque'),
new SlashCommandBuilder().setName('daily').setDescription('Daily'),
new SlashCommandBuilder().setName('mailbox').setDescription('Mailbox'),
new SlashCommandBuilder().setName('rep').setDescription('Réputation'),

new SlashCommandBuilder()
.setName('givevip')
.addUserOption(o=>o.setName('joueur').setRequired(true))
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction=>{
try{

const user = interaction.user.id;

// ANTI SPAM
if(!spam[user]) spam[user]={count:0,time:Date.now()};
spam[user].count++;
if(spam[user].count>10){
  return tempBan(user,2*60000,"Spam");
}
setTimeout(()=>{if(spam[user]) spam[user].count=0},10000);

// DAILY
if(interaction.commandName==="daily"){
const now=Date.now();
if(!daily[user]) daily[user]={last:0,streak:0};

if(now-daily[user].last<86400000)
return interaction.reply({content:"⏳",ephemeral:true});

daily[user].streak++;
let reward=(isVIP(interaction.member)?300:200)+(daily[user].streak*50);

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
const row=new ActionRowBuilder();
shopItems.forEach((item,i)=>{
row.addComponents(new ButtonBuilder().setCustomId("buy_"+i).setLabel(item.nom+" "+item.prix).setStyle(ButtonStyle.Primary));
});
return interaction.reply({content:"Shop",components:[row]});
}

// BUY
if(interaction.isButton() && interaction.customId.startsWith("buy_")){
const item=shopItems[interaction.customId.split("_")[1]];
if(!item) return;

let price=item.prix;
if(isVIP(interaction.member)) price=Math.floor(price*0.9);

if((money[user]||0)<price) return interaction.reply({content:"❌",ephemeral:true});

money[user]-=price;
safeMoney(user);
saveAll();

sendLog("🛒 Achat",interaction.user.username);
return interaction.reply({content:"OK",ephemeral:true});
}

// BANK
if(interaction.commandName==="bank"){
const row=new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("dep").setLabel("Déposer").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("with").setLabel("Retirer").setStyle(ButtonStyle.Danger)
);
return interaction.reply({content:"Banque",components:[row],ephemeral:true});
}

if(interaction.isButton() && (interaction.customId==="dep"||interaction.customId==="with")){
const modal=new ModalBuilder().setCustomId(interaction.customId==="dep"?"dep_m":"with_m").setTitle("Banque");
const input=new TextInputBuilder().setCustomId("amount").setLabel("Montant").setStyle(TextInputStyle.Short);
modal.addComponents(new ActionRowBuilder().addComponents(input));
return interaction.showModal(modal);
}

if(interaction.isModalSubmit()){
const amount=parseInt(interaction.fields.getTextInputValue("amount"));
if(isNaN(amount)||amount<=0||amount>1000000) return;

money[user]=money[user]||0;
bank[user]=bank[user]||0;

if(interaction.customId==="dep_m"){
money[user]-=amount;
bank[user]+=amount;
}else{
bank[user]-=amount;
money[user]+=amount;
}

safeMoney(user);
saveAll();

return interaction.reply({content:"OK",ephemeral:true});
}

// REP
if(interaction.commandName==="rep"){
return interaction.reply({content:"⭐ "+(reputation[user]||0),ephemeral:true});
}

// VIP
if(interaction.commandName==="givevip"){
const target=interaction.options.getUser('joueur');
const member=await interaction.guild.members.fetch(target.id);

vipData[target.id]=Date.now()+7*24*60*60*1000;
await member.roles.add(VIP_ROLE_ID);

sendLog("👑 VIP",target.username);
saveAll();

return interaction.reply("OK");
}

}catch(e){console.error(e);}
});

// ===== MESSAGE =====
client.on('messageCreate',(m)=>{
if(m.author.bot) return;

const msg=m.content;

// DRAGON
if(msg.includes("[DRAGON]"))
return client.channels.cache.get(DRAGON_CHANNEL_ID)?.send(msg);

// STATUS
if(msg.includes("Server started"))
return client.channels.cache.get(STATUS_CHANNEL_ID)?.send("🟢 ON");

if(msg.includes("Server stopped"))
return client.channels.cache.get(STATUS_CHANNEL_ID)?.send("🔴 OFF");

// CHAT
client.channels.cache.get(CHAT_CHANNEL_ID)?.send(msg);

});

// ===== INTERVALS =====
setInterval(checkVIP,60000);
setInterval(checkBans,60000);
setInterval(()=>applyInterest(),3600000);

// ===== REGISTER =====
const rest=new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('clientReady', async()=>{
await rest.put(Routes.applicationGuildCommands(client.user.id,GUILD_ID),{body:commands});
console.log("READY");
});

client.login(process.env.TOKEN);
