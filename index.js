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

// ===== SAVE =====
function save(){
fs.writeFileSync('money.json',JSON.stringify(money,null,2));
fs.writeFileSync('bank.json',JSON.stringify(bank,null,2));
fs.writeFileSync('shop.json',JSON.stringify(shop,null,2));
fs.writeFileSync('vip.json',JSON.stringify(vip,null,2));
}

function safe(u){
if(!money[u]) money[u]=0;
if(!bank[u]) bank[u]=0;
}

// ===== LOG =====
function log(title,desc){
const ch=client.channels.cache.get(LOG_CHANNEL_ID);
if(!ch) return;
ch.send({embeds:[new EmbedBuilder().setTitle(title).setDescription(desc).setColor(0x00ffcc)]});
}

// ===== SHOP FUNCTIONS =====
function shopCategories(){
const row = new ActionRowBuilder();
for(let cat in shop){
row.addComponents(
new ButtonBuilder()
.setCustomId(`cat_${cat}`)
.setLabel(cat)
.setStyle(ButtonStyle.Secondary)
);
}
return {content:"📦 Catégories",components:[row]};
}

function shopPage(cat,page){
const items = Object.entries(shop[cat]);
const perPage = 5;

const row = new ActionRowBuilder();
const nav = new ActionRowBuilder();

const start = page * perPage;
const current = items.slice(start,start+perPage);

current.forEach(([name,price])=>{
row.addComponents(
new ButtonBuilder()
.setCustomId(`buy_${cat}_${name}`)
.setLabel(`${name} (${price})`)
.setStyle(ButtonStyle.Primary)
);
});

nav.addComponents(
new ButtonBuilder().setCustomId(`prev_${cat}_${page}`).setLabel("◀️").setStyle(ButtonStyle.Secondary).setDisabled(page===0),
new ButtonBuilder().setCustomId(`next_${cat}_${page}`).setLabel("▶️").setStyle(ButtonStyle.Secondary).setDisabled(start+perPage>=items.length),
new ButtonBuilder().setCustomId("back_cat").setLabel("⬅️").setStyle(ButtonStyle.Danger)
);

return {content:`🛒 ${cat} (page ${page+1})`,components:[row,nav]};
}

// ===== COMMANDES =====
const commands=[

new SlashCommandBuilder().setName('money').setDescription('Voir argent'),

new SlashCommandBuilder().setName('shop').setDescription('Shop'),

new SlashCommandBuilder().setName('additem')
.setDescription('Ajouter item')
.addStringOption(o=>o.setName('categorie').setDescription('Catégorie').setRequired(true))
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true)),

new SlashCommandBuilder().setName('vip')
.setDescription('Donner VIP')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))

];

// ===== INTERACTION =====
client.on('interactionCreate',async interaction=>{

const user=interaction.user.id;
safe(user);

// ===== COMMANDES =====
if(interaction.isChatInputCommand()){

// MONEY
if(interaction.commandName==="money")
return interaction.reply(`💰 ${money[user]}`);

// SHOP
if(interaction.commandName==="shop")
return interaction.reply(shopCategories());

// ADD ITEM
if(interaction.commandName==="additem"){

const cat = interaction.options.getString('categorie');
const name = interaction.options.getString('nom');
const price = interaction.options.getInteger('prix');

if(price <= 0)
return interaction.reply("❌ prix invalide");

if(!shop[cat]) shop[cat] = {};

shop[cat][name] = price;

save();

return interaction.reply(`✅ ${name} ajouté dans ${cat}`);
}

// VIP
if(interaction.commandName==="vip"){

const target = interaction.options.getUser('user');

vip[target.id] = true;

const member = await interaction.guild.members.fetch(target.id);
await member.roles.add(VIP_ROLE_ID);

save();

return interaction.reply(`👑 ${target.username} est VIP`);
}
}

// ===== BUTTONS =====
if(interaction.isButton()){

// CAT
if(interaction.customId.startsWith("cat_")){
const cat = interaction.customId.replace("cat_","");
return interaction.update(shopPage(cat,0));
}

// NAV
if(interaction.customId.startsWith("next_")){
const [_,cat,page]=interaction.customId.split("_");
return interaction.update(shopPage(cat,parseInt(page)+1));
}

if(interaction.customId.startsWith("prev_")){
const [_,cat,page]=interaction.customId.split("_");
return interaction.update(shopPage(cat,parseInt(page)-1));
}

if(interaction.customId==="back_cat"){
return interaction.update(shopCategories());
}

// BUY → CONFIRM
if(interaction.customId.startsWith("buy_")){

const [_,cat,name] = interaction.customId.split("_");
const price = shop[cat][name];

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId(`confirm_${cat}_${name}`).setLabel("✅ Confirmer").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("cancel_buy").setLabel("❌ Annuler").setStyle(ButtonStyle.Danger)
);

return interaction.reply({
content:`⚠️ Acheter ${name} pour ${price} ?`,
components:[row],
ephemeral:true
});
}

// CONFIRM
if(interaction.customId.startsWith("confirm_")){

const [_,cat,name] = interaction.customId.split("_");
const price = shop[cat][name];

if(money[user] < price)
return interaction.update({content:"❌ pas assez",components:[]});

money[user] -= price;
save();

log("🧾 Achat",`${interaction.user.username} ${name}`);

return interaction.update({content:`✅ acheté ${name}`,components:[]});
}

// CANCEL
if(interaction.customId==="cancel_buy"){
return interaction.update({content:"❌ annulé",components:[]});
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
console.log("BOT READY");
});

client.login(process.env.TOKEN);
