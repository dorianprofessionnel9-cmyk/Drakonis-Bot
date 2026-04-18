const fs = require('fs');
const {
  Client, GatewayIntentBits,
  SlashCommandBuilder, REST, Routes,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ===== CONFIG =====
const GUILD_ID = "1480204997613457541";
const LOG_CHANNEL_ID = "1494371990113353978";
const ADMIN_ROLE_ID = "1480214844677554176";
const MOD_ROLE_ID = "1482081844466946160";
const VIP_ROLE_ID = "1494408592441475234";

// ===== LOAD / SAVE =====
function load(f){ try{return JSON.parse(fs.readFileSync(f));}catch{return {}} }

let money = load('money.json');
let bank = load('bank.json');
let shop = load('shop.json');
let vip = load('vip.json');
let mailbox = load('mailbox.json');
let teams = load('teams.json');
let wars = load('wars.json');
let link = load('link.json');
let linkCodes = load('linkcodes.json');
let carts = {};

function save(){
fs.writeFileSync('money.json',JSON.stringify(money,null,2));
fs.writeFileSync('bank.json',JSON.stringify(bank,null,2));
fs.writeFileSync('shop.json',JSON.stringify(shop,null,2));
fs.writeFileSync('vip.json',JSON.stringify(vip,null,2));
fs.writeFileSync('mailbox.json',JSON.stringify(mailbox,null,2));
fs.writeFileSync('teams.json',JSON.stringify(teams,null,2));
fs.writeFileSync('wars.json',JSON.stringify(wars,null,2));
fs.writeFileSync('link.json',JSON.stringify(link,null,2));
fs.writeFileSync('linkcodes.json',JSON.stringify(linkCodes,null,2));
}

function safe(u){
if(!money[u]) money[u]=0;
if(!bank[u]) bank[u]=0;
if(!mailbox[u]) mailbox[u]=[];
}

// ===== PERMS =====
function isStaff(m){
return m.roles.cache.has(ADMIN_ROLE_ID) || m.roles.cache.has(MOD_ROLE_ID);
}

// ===== RARITY =====
const rarity = {
common:0xaaaaaa,
rare:0x0099ff,
epic:0xaa00ff,
legendary:0xff9900
};

// ===== SHOP PAGE =====
function shopPage(cat,page){
const items = Object.entries(shop[cat]||{});
const perPage = 3;
const start = page*perPage;
const current = items.slice(start,start+perPage);

const embeds = current.map(([name,data])=>{
return new EmbedBuilder()
.setTitle(name)
.setDescription(`💰 ${data.price}\n📦 ${data.stock}`)
.setColor(rarity[data.rarity]||0xffffff)
.setImage(data.image||null);
});

const row = new ActionRowBuilder();

current.forEach(([name])=>{
row.addComponents(
new ButtonBuilder()
.setCustomId(`add_${cat}_${name}`)
.setLabel("🛒")
.setStyle(ButtonStyle.Primary)
);
});

const nav = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId(`prev_${cat}_${page}`).setLabel("◀️").setStyle(ButtonStyle.Secondary).setDisabled(page===0),
new ButtonBuilder().setCustomId(`next_${cat}_${page}`).setLabel("▶️").setStyle(ButtonStyle.Secondary).setDisabled(start+perPage>=items.length),
new ButtonBuilder().setCustomId("cart").setLabel("🧾").setStyle(ButtonStyle.Success)
);

return {embeds,components:[row,nav]};
}

// ===== COMMANDS =====
const commands = [

new SlashCommandBuilder().setName('money').setDescription('Voir argent'),
new SlashCommandBuilder().setName('daily').setDescription('Daily'),
new SlashCommandBuilder().setName('bank').setDescription('Banque'),

new SlashCommandBuilder()
.setName('pay')
.setDescription('Envoyer')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder()
.setName('addmoney')
.setDescription('Admin add')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder()
.setName('removemoney')
.setDescription('Admin remove')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder()
.setName('vip')
.setDescription('Donner VIP')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),

new SlashCommandBuilder().setName('shop').setDescription('Shop'),
new SlashCommandBuilder().setName('panier').setDescription('Panier'),

new SlashCommandBuilder().setName('mail').setDescription('Voir mail'),
new SlashCommandBuilder()
.setName('sendmail')
.setDescription('Envoyer mail')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addStringOption(o=>o.setName('msg').setDescription('Message').setRequired(true)),

new SlashCommandBuilder().setName('link').setDescription('Code link')

];

// ===== INTERACTION =====
client.on('interactionCreate', async interaction => {

const user = interaction.user.id;
safe(user);

// ===== COMMAND =====
if(interaction.isChatInputCommand()){

if(interaction.commandName==="money")
return interaction.reply(`💰 ${money[user]} ${vip[user]?"💎":""}`);

if(interaction.commandName==="daily"){
let gain = vip[user]?400:200;
money[user]+=gain; save();
return interaction.reply(`+${gain}`);
}

if(interaction.commandName==="bank")
return interaction.reply(`🏦 ${bank[user]}`);

if(interaction.commandName==="pay"){
let t=interaction.options.getUser('user');
let a=interaction.options.getInteger('montant');
if(money[user]<a) return interaction.reply("❌");
money[user]-=a;
money[t.id]=(money[t.id]||0)+a;
save();
return interaction.reply("envoyé");
}

if(interaction.commandName==="addmoney"){
if(!isStaff(interaction.member)) return;
let t=interaction.options.getUser('user');
money[t.id]=(money[t.id]||0)+interaction.options.getInteger('montant');
save();
return interaction.reply("OK");
}

if(interaction.commandName==="removemoney"){
if(!isStaff(interaction.member)) return;
let t=interaction.options.getUser('user');
money[t.id]-=interaction.options.getInteger('montant');
save();
return interaction.reply("OK");
}

if(interaction.commandName==="vip"){
if(!isStaff(interaction.member)) return;
let u=interaction.options.getUser('user');
vip[u.id]=true;
let m=await interaction.guild.members.fetch(u.id);
await m.roles.add(VIP_ROLE_ID);
save();
return interaction.reply("VIP OK");
}

// ===== SHOP =====
if(interaction.commandName==="shop"){
const row=new ActionRowBuilder();

for(let cat in shop){
row.addComponents(
new ButtonBuilder()
.setCustomId(`cat_${cat}`)
.setLabel(cat)
.setStyle(ButtonStyle.Secondary)
);
}

return interaction.reply({content:"📦 Shop",components:[row]});
}

// ===== PANIER =====
if(interaction.commandName==="panier"){

if(!carts[user]) return interaction.reply("vide");

let total=0;

let txt = Object.entries(carts[user]).map(([n,q])=>{
let item;
for(let c in shop){ if(shop[c][n]) item=shop[c][n]; }
total+=item.price*q;
return `${n} x${q}`;
}).join("\n");

return interaction.reply(`🧾\n${txt}\nTotal:${total}`);
}

}

// ===== BUTTONS =====
if(interaction.isButton()){

// catégorie
if(interaction.customId.startsWith("cat_")){
let cat=interaction.customId.replace("cat_","");

if(cat==="VIP" && !vip[user])
return interaction.reply({content:"❌ VIP only",ephemeral:true});

return interaction.update(shopPage(cat,0));
}

// add panier
if(interaction.customId.startsWith("add_")){
let [_,cat,name]=interaction.customId.split("_");

if(cat==="VIP" && !vip[user])
return interaction.reply({content:"❌ VIP",ephemeral:true});

if(!carts[user]) carts[user]={};
carts[user][name]=(carts[user][name]||0)+1;

return interaction.reply({content:`+1 ${name}`,ephemeral:true});
}

}

});

// ===== REGISTER =====
const rest=new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('clientReady',async()=>{
await rest.put(
Routes.applicationGuildCommands(client.user.id,GUILD_ID),
{body:commands.map(c=>c.toJSON())}
);
console.log("READY");
});

client.login(process.env.TOKEN);
