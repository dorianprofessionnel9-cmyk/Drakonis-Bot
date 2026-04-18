const fs = require('fs');
const {
Client, GatewayIntentBits,
SlashCommandBuilder, REST, Routes,
ActionRowBuilder, ButtonBuilder, ButtonStyle,
EmbedBuilder
} = require('discord.js');

const client = new Client({ intents:[GatewayIntentBits.Guilds] });

// CONFIG
const GUILD_ID = "1480204997613457541";
const LOG_CHANNEL_ID = "1494371990113353978";
const ADMIN_ROLE_ID = "1480214844677554176";
const MOD_ROLE_ID = "1482081844466946160";
const VIP_ROLE_ID = "1494408592441475234";

// LOAD
function load(f){ try{return JSON.parse(fs.readFileSync(f));}catch{return {}} }

let money=load('money.json');
let shop=load('shop.json');
let carts={};

// SAVE
function save(){
fs.writeFileSync('money.json',JSON.stringify(money,null,2));
fs.writeFileSync('shop.json',JSON.stringify(shop,null,2));
}

// LOG
function log(title,desc){
const ch=client.channels.cache.get(LOG_CHANNEL_ID);
if(!ch) return;
ch.send({embeds:[new EmbedBuilder().setTitle(title).setDescription(desc)]});
}

function isStaff(m){
return m.roles.cache.has(ADMIN_ROLE_ID) || m.roles.cache.has(MOD_ROLE_ID);
}

// SHOP PAGE
function shopPage(cat,page){

const items = Object.entries(shop[cat]||{});
const perPage=5;
const start=page*perPage;
const current=items.slice(start,start+perPage);

const row=new ActionRowBuilder();
const nav=new ActionRowBuilder();

current.forEach(([name,data])=>{
row.addComponents(
new ButtonBuilder()
.setCustomId(`view_${cat}_${name}`)
.setLabel(name)
.setStyle(ButtonStyle.Primary)
);
});

nav.addComponents(
new ButtonBuilder().setCustomId(`prev_${cat}_${page}`).setLabel("◀️").setStyle(ButtonStyle.Secondary).setDisabled(page===0),
new ButtonBuilder().setCustomId(`next_${cat}_${page}`).setLabel("▶️").setStyle(ButtonStyle.Secondary).setDisabled(start+perPage>=items.length),
new ButtonBuilder().setCustomId("cart").setLabel("🧾 Panier").setStyle(ButtonStyle.Success)
);

return {content:`📦 ${cat}`,components:[row,nav]};
}

// COMMANDES
const commands=[

new SlashCommandBuilder().setName('shop').setDescription('Shop'),
new SlashCommandBuilder().setName('additem').setDescription('Ajouter item')
.addStringOption(o=>o.setName('categorie').setDescription('Cat').setRequired(true))
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true))
.addStringOption(o=>o.setName('image').setDescription('URL image')),

new SlashCommandBuilder().setName('money').setDescription('Argent'),

new SlashCommandBuilder().setName('sanction').setDescription('Sanction')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addStringOption(o=>o.setName('raison').setDescription('Raison').setRequired(true))

];

// INTERACTION
client.on('interactionCreate',async interaction=>{

const user=interaction.user.id;

// COMMANDES
if(interaction.isChatInputCommand()){

if(interaction.commandName==="money")
return interaction.reply(`💰 ${money[user]||0}`);

if(interaction.commandName==="shop"){
const row=new ActionRowBuilder();
for(let cat in shop){
row.addComponents(
new ButtonBuilder().setCustomId(`cat_${cat}`).setLabel(cat).setStyle(ButtonStyle.Secondary)
);
}
return interaction.reply({content:"📦 Catégories",components:[row]});
}

if(interaction.commandName==="additem"){
let c=interaction.options.getString('categorie');
let n=interaction.options.getString('nom');
let p=interaction.options.getInteger('prix');
let img=interaction.options.getString('image');

if(!shop[c]) shop[c]={};

shop[c][n]={
price:p,
image:img||null
};

save();
log("🛒 Item ajouté",`${n} (${p})`);

return interaction.reply("✅ ajouté");
}

// SANCTION
if(interaction.commandName==="sanction"){

if(!isStaff(interaction.member))
return interaction.reply("❌");

let t=interaction.options.getUser('user');
let r=interaction.options.getString('raison');

try{
let m=await interaction.guild.members.fetch(t.id);
await m.timeout(600000);
}catch(e){}

log("⚠️ Sanction",`${t.username} → ${r}`);

return interaction.reply(`⚠️ ${t.username} sanctionné`);
}

}

// BOUTONS
if(interaction.isButton()){

if(interaction.customId.startsWith("cat_")){
let cat=interaction.customId.replace("cat_","");
return interaction.update(shopPage(cat,0));
}

if(interaction.customId.startsWith("next_")){
let [_,cat,page]=interaction.customId.split("_");
return interaction.update(shopPage(cat,parseInt(page)+1));
}

if(interaction.customId.startsWith("prev_")){
let [_,cat,page]=interaction.customId.split("_");
return interaction.update(shopPage(cat,parseInt(page)-1));
}

// VIEW ITEM (IMAGE)
if(interaction.customId.startsWith("view_")){
let [_,cat,name]=interaction.customId.split("_");
let data=shop[cat][name];

const embed=new EmbedBuilder()
.setTitle(name)
.setDescription(`💰 ${data.price}`);

if(data.image) embed.setImage(data.image);

const row=new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId(`add_${cat}_${name}`).setLabel("🛒 Ajouter").setStyle(ButtonStyle.Success)
);

return interaction.reply({embeds:[embed],components:[row],ephemeral:true});
}

// ADD PANIER
if(interaction.customId.startsWith("add_")){
let [_,cat,name]=interaction.customId.split("_");

if(!carts[user]) carts[user]={};
carts[user][name]=(carts[user][name]||0)+1;

return interaction.reply({content:`Ajouté x${carts[user][name]}`,ephemeral:true});
}

// PANIER
if(interaction.customId==="cart"){

if(!carts[user]) return interaction.reply({content:"vide",ephemeral:true});

let total=0;

let txt=Object.entries(carts[user]).map(([n,q])=>{
let price=0;
for(let c in shop){
if(shop[c][n]) price=shop[c][n].price;
}
total+=price*q;
return `${n} x${q} = ${price*q}`;
}).join("\n");

const row=new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("buy").setLabel("Acheter").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("cancel").setLabel("Annuler").setStyle(ButtonStyle.Danger)
);

return interaction.reply({content:`🧾\n${txt}\nTotal:${total}`,components:[row],ephemeral:true});
}

// BUY
if(interaction.customId==="buy"){

let total=0;

for(let n in carts[user]){
for(let c in shop){
if(shop[c][n]){
total+=shop[c][n].price*carts[user][n];
}
}
}

if((money[user]||0)<total)
return interaction.reply({content:"❌ pas assez",ephemeral:true});

money[user]-=total;
carts[user]={};

save();
log("💸 Achat",`${interaction.user.username} ${total}`);

return interaction.reply({content:"✅ acheté",ephemeral:true});
}

// CANCEL
if(interaction.customId==="cancel"){
carts[user]={};
return interaction.reply({content:"annulé",ephemeral:true});
}

}

});

// REGISTER
const rest=new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('ready',async()=>{
await rest.put(
Routes.applicationGuildCommands(client.user.id,GUILD_ID),
{body:commands.map(c=>c.toJSON())}
);
console.log("READY");
});

client.login(process.env.TOKEN);
