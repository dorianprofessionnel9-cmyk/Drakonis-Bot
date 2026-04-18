const fs = require('fs');
const {
  Client, GatewayIntentBits,
  SlashCommandBuilder, REST, Routes,
  PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== CONFIG =====
const GUILD_ID = "1480204997613457541";

const LOG_CHANNEL_ID = "1494371990113353978";
const ADMIN_CHANNEL_ID = "1495023085366022245";

const ADMIN_ROLE_ID = "1480214844677554176";
const MOD_ROLE_ID = "1482081844466946160";
const VIP_ROLE_ID = "1494408592441475234";

// ===== LOAD =====
function load(f){ try{return JSON.parse(fs.readFileSync(f));}catch{return {}} }

let money=load('money.json');
let bank=load('bank.json');
let shop=load('shop.json');
let vip=load('vip.json');
let mailbox=load('mailbox.json');
let teams=load('teams.json');
let wars=load('wars.json');
let history=load('history.json');

// ===== SAVE =====
function save(){
fs.writeFileSync('money.json',JSON.stringify(money,null,2));
fs.writeFileSync('bank.json',JSON.stringify(bank,null,2));
fs.writeFileSync('shop.json',JSON.stringify(shop,null,2));
fs.writeFileSync('vip.json',JSON.stringify(vip,null,2));
fs.writeFileSync('mailbox.json',JSON.stringify(mailbox,null,2));
fs.writeFileSync('teams.json',JSON.stringify(teams,null,2));
fs.writeFileSync('wars.json',JSON.stringify(wars,null,2));
fs.writeFileSync('history.json',JSON.stringify(history,null,2));
}

function safe(u){
if(!money[u]) money[u]=0;
if(!bank[u]) bank[u]=0;
if(!mailbox[u]) mailbox[u]=[];
}

// ===== PERM =====
function isStaff(member){
return member.roles.cache.has(ADMIN_ROLE_ID) || member.roles.cache.has(MOD_ROLE_ID);
}

// ===== LOG =====
function log(title,desc){
const ch=client.channels.cache.get(LOG_CHANNEL_ID);
if(!ch) return;
ch.send({embeds:[new EmbedBuilder().setTitle(title).setDescription(desc).setColor(0x00ffcc).setTimestamp()]});
}

// ===== COMMANDES =====
const commands=[

// ECONOMIE
new SlashCommandBuilder().setName('money').setDescription('Voir argent'),
new SlashCommandBuilder().setName('daily').setDescription('Daily'),
new SlashCommandBuilder().setName('deposit').setDescription('Déposer').addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),
new SlashCommandBuilder().setName('withdraw').setDescription('Retirer').addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),
new SlashCommandBuilder().setName('pay').setDescription('Envoyer argent')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

// SHOP
new SlashCommandBuilder().setName('shop').setDescription('Shop'),
new SlashCommandBuilder().setName('additem').setDescription('Add item')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true)),

// ADMIN MONEY
new SlashCommandBuilder().setName('addmoney').setDescription('Admin add')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('removemoney').setDescription('Admin remove')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('setmoney').setDescription('Admin set')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('resetmoney').setDescription('Admin reset')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),

// ADMIN
new SlashCommandBuilder().setName('appeladmin').setDescription('Problème')
.addStringOption(o=>o.setName('msg').setDescription('Message').setRequired(true)),

new SlashCommandBuilder().setName('vip').setDescription('Donner VIP')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),

// MAIL
new SlashCommandBuilder().setName('mail').setDescription('Voir mail'),
new SlashCommandBuilder().setName('sendmail').setDescription('Envoyer mail')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addStringOption(o=>o.setName('msg').setDescription('Message').setRequired(true)),

// TEAMS
new SlashCommandBuilder().setName('createteam').setDescription('Créer')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)),
new SlashCommandBuilder().setName('jointeam').setDescription('Join')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)),
new SlashCommandBuilder().setName('teaminfo').setDescription('Info'),
new SlashCommandBuilder().setName('deleteteam').setDescription('Delete'),
new SlashCommandBuilder().setName('teamleaderboard').setDescription('Top'),
new SlashCommandBuilder().setName('guerre').setDescription('War')
.addStringOption(o=>o.setName('team').setDescription('Team').setRequired(true)),
new SlashCommandBuilder().setName('guerres').setDescription('Liste'),

];

// ===== INTERACTION =====
client.on('interactionCreate',async interaction=>{
if(!interaction.isChatInputCommand() && !interaction.isButton()) return;

const user=interaction.user.id;
safe(user);

// ECONOMIE
if(interaction.commandName==="money") return interaction.reply(`💰 ${money[user]}`);

if(interaction.commandName==="daily"){
let gain=vip[user]?400:200;
money[user]+=gain; save();
log("🎁 Daily",`${interaction.user.username} +${gain}`);
return interaction.reply(`+${gain}`);
}

if(interaction.commandName==="deposit"){
let a=interaction.options.getInteger('montant');
if(money[user]<a) return interaction.reply("❌");
money[user]-=a; bank[user]+=a; save();
return interaction.reply("🏦 OK");
}

if(interaction.commandName==="withdraw"){
let a=interaction.options.getInteger('montant');
if(bank[user]<a) return interaction.reply("❌");
bank[user]-=a; money[user]+=a; save();
return interaction.reply("💸 OK");
}

// PAY
if(interaction.commandName==="pay"){
let t=interaction.options.getUser('user');
let a=interaction.options.getInteger('montant');

if(t.id===user) return interaction.reply("❌");
if(money[user]<a) return interaction.reply("❌");

money[user]-=a;
if(!money[t.id]) money[t.id]=0;
money[t.id]+=a;

save();
log("💸 Transfert",`${interaction.user.username} → ${t.username} ${a}`);
return interaction.reply("✅");
}

// SHOP BUTTON
if(interaction.commandName==="shop"){
const row=new ActionRowBuilder();
for(let item in shop){
row.addComponents(new ButtonBuilder().setCustomId(`buy_${item}`).setLabel(`${item} ${shop[item]}`).setStyle(ButtonStyle.Primary));
break;
}
return interaction.reply({content:"shop",components:[row]});
}

if(interaction.isButton()){
let item=interaction.customId.replace("buy_","");
let price=shop[item];
if(money[user]<price) return interaction.reply({content:"❌",ephemeral:true});
money[user]-=price; save();
log("🧾 Achat",`${interaction.user.username} ${item}`);
return interaction.reply({content:"✅",ephemeral:true});
}

// ADMIN SYSTEM
if(["addmoney","removemoney","setmoney","resetmoney"].includes(interaction.commandName)){

if(!isStaff(interaction.member)) return interaction.reply("❌");

let t=interaction.options.getUser('user');
let a=interaction.options.getInteger('montant')||0;

if(!money[t.id]) money[t.id]=0;

if(interaction.commandName==="addmoney") money[t.id]+=a;
if(interaction.commandName==="removemoney") money[t.id]-=a;
if(interaction.commandName==="setmoney") money[t.id]=a;
if(interaction.commandName==="resetmoney") money[t.id]=0;

if(money[t.id]<0) money[t.id]=0;

if(!history[t.id]) history[t.id]=[];
history[t.id].push({action:interaction.commandName,by:interaction.user.username,amount:a,date:new Date()});

save();
log("ADMIN",`${interaction.commandName} ${t.username} ${a}`);
return interaction.reply("OK");
}

// ADMIN CALL
if(interaction.commandName==="appeladmin"){
client.channels.cache.get(ADMIN_CHANNEL_ID)?.send(`🚨 ${interaction.user.username}\n${interaction.options.getString('msg')}\n<@&${ADMIN_ROLE_ID}> <@&${MOD_ROLE_ID}>`);
return interaction.reply({content:"envoyé",ephemeral:true});
}

// VIP
if(interaction.commandName==="vip"){
let u=interaction.options.getUser('user');
vip[u.id]=true;
let m=await interaction.guild.members.fetch(u.id);
await m.roles.add(VIP_ROLE_ID);
save();
return interaction.reply("VIP OK");
}

// MAIL
if(interaction.commandName==="mail") return interaction.reply(mailbox[user].join("\n")||"vide");

if(interaction.commandName==="sendmail"){
let t=interaction.options.getUser('user').id;
mailbox[t].push(interaction.options.getString('msg'));
save();
return interaction.reply("envoyé");
}

// TEAM
if(interaction.commandName==="createteam"){
let n=interaction.options.getString('nom');
teams[n]={chef:user,membres:[user]};
save();
return interaction.reply("créée");
}

if(interaction.commandName==="jointeam"){
let n=interaction.options.getString('nom');
teams[n].membres.push(user);
save();
return interaction.reply("rejoint");
}

if(interaction.commandName==="deleteteam"){
for(let t in teams){
if(teams[t].chef===user){ delete teams[t]; save(); return interaction.reply("delete");}
}
return interaction.reply("❌");
}

});

// REGISTER
const rest=new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('clientReady',async()=>{
await rest.put(
Routes.applicationGuildCommands(client.user.id,GUILD_ID),
{body:commands.map(c=>c.toJSON())}
);
console.log("BOT READY");
});

client.login(process.env.TOKEN);
