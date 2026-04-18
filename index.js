const fs = require('fs');
const {
Client, GatewayIntentBits,
SlashCommandBuilder, REST, Routes,
ActionRowBuilder, ButtonBuilder, ButtonStyle,
EmbedBuilder
} = require('discord.js');

const client = new Client({ intents:[GatewayIntentBits.Guilds] });

// ===== CONFIG =====
const GUILD_ID = "1480204997613457541";
const LOG_CHANNEL_ID = "1494371990113353978";
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
let teams=load('team.json');
let wars=load('wars.json');

let carts={};

// ===== SAVE =====
function save(){
fs.writeFileSync('money.json',JSON.stringify(money,null,2));
fs.writeFileSync('bank.json',JSON.stringify(bank,null,2));
fs.writeFileSync('shop.json',JSON.stringify(shop,null,2));
fs.writeFileSync('vip.json',JSON.stringify(vip,null,2));
fs.writeFileSync('mailbox.json',JSON.stringify(mailbox,null,2));
fs.writeFileSync('team.json',JSON.stringify(teams,null,2));
fs.writeFileSync('wars.json',JSON.stringify(wars,null,2));
}

// ===== UTILS =====
function safe(u){
if(!money[u]) money[u]=0;
if(!bank[u]) bank[u]=0;
if(!mailbox[u]) mailbox[u]=[];
}

function isStaff(m){
return m.roles.cache.has(ADMIN_ROLE_ID) || m.roles.cache.has(MOD_ROLE_ID);
}

function log(title,desc){
const ch=client.channels.cache.get(LOG_CHANNEL_ID);
if(!ch) return;
ch.send({embeds:[new EmbedBuilder().setTitle(title).setDescription(desc)]});
}

// ===== SHOP PAGE =====
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

return {content:`📦 ${cat} page ${page+1}`,components:[row,nav]};
}

// ===== COMMANDES =====
const commands=[

new SlashCommandBuilder().setName('shop').setDescription('Ouvrir le shop'),
new SlashCommandBuilder().setName('money').setDescription('Argent'),
new SlashCommandBuilder().setName('bank').setDescription('Banque'),
new SlashCommandBuilder().setName('daily').setDescription('Récompense'),

new SlashCommandBuilder().setName('pay').setDescription('Envoyer argent')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('addmoney').setDescription('Admin ajouter argent')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('removemoney').setDescription('Admin retirer argent')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('additem').setDescription('Ajouter item shop')
.addStringOption(o=>o.setName('categorie').setDescription('Catégorie').setRequired(true))
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true))
.addStringOption(o=>o.setName('image').setDescription('URL image')),

new SlashCommandBuilder().setName('vip').setDescription('Donner VIP')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),

new SlashCommandBuilder().setName('mail').setDescription('Voir mails'),
new SlashCommandBuilder().setName('sendmail').setDescription('Envoyer mail')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addStringOption(o=>o.setName('msg').setDescription('Message').setRequired(true)),

new SlashCommandBuilder().setName('createteam').setDescription('Créer team')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)),

new SlashCommandBuilder().setName('teaminfo').setDescription('Infos team'),
new SlashCommandBuilder().setName('deleteteam').setDescription('Supprimer team'),

new SlashCommandBuilder().setName('guerre').setDescription('Déclarer guerre')
.addStringOption(o=>o.setName('team').setDescription('Nom').setRequired(true)),

new SlashCommandBuilder().setName('acceptguerre').setDescription('Accepter guerre'),

new SlashCommandBuilder().setName('leaderboard').setDescription('Classement argent'),
new SlashCommandBuilder().setName('leaderboardguerre').setDescription('Classement guerre'),

new SlashCommandBuilder().setName('appeladmin').setDescription('Appel admin')
.addStringOption(o=>o.setName('msg').setDescription('Message').setRequired(true)),

new SlashCommandBuilder().setName('sanction').setDescription('Sanction')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addStringOption(o=>o.setName('raison').setDescription('Raison').setRequired(true))

];

// ===== INTERACTIONS =====
client.on('interactionCreate',async interaction=>{

const user=interaction.user.id;
safe(user);

if(interaction.isChatInputCommand()){

if(interaction.commandName==="money")
return interaction.reply(`💰 ${money[user]}`);

if(interaction.commandName==="bank")
return interaction.reply(`🏦 ${bank[user]}`);

if(interaction.commandName==="daily"){
let gain=vip[user]?400:200;
money[user]+=gain; save();
return interaction.reply(`+${gain}`);
}

if(interaction.commandName==="pay"){
let t=interaction.options.getUser('user');
let a=interaction.options.getInteger('montant');
if(money[user]<a) return interaction.reply("❌");
money[user]-=a;
money[t.id]=(money[t.id]||0)+a;
save();
return interaction.reply("envoyé");
}

if(["addmoney","removemoney"].includes(interaction.commandName)){
if(!isStaff(interaction.member)) return interaction.reply("❌");
let t=interaction.options.getUser('user');
let a=interaction.options.getInteger('montant');
if(interaction.commandName==="addmoney") money[t.id]+=a;
if(interaction.commandName==="removemoney") money[t.id]-=a;
save();
return interaction.reply("OK");
}

// ===== SHOP =====
if(interaction.commandName==="shop"){
const row=new ActionRowBuilder();
for(let cat in shop){
row.addComponents(new ButtonBuilder().setCustomId(`cat_${cat}`).setLabel(cat).setStyle(ButtonStyle.Secondary));
}
return interaction.reply({content:"📦 Catégories",components:[row]});
}

if(interaction.commandName==="additem"){
let c=interaction.options.getString('categorie');
let n=interaction.options.getString('nom');
let p=interaction.options.getInteger('prix');
let img=interaction.options.getString('image');

if(!shop[c]) shop[c]={};
shop[c][n]={price:p,image:img||null};

save();
log("🛒 Item ajouté",`${n} (${p})`);

return interaction.reply("ajouté");
}

// ===== SANCTION =====
if(interaction.commandName==="sanction"){
if(!isStaff(interaction.member)) return interaction.reply("❌");

let t=interaction.options.getUser('user');
let r=interaction.options.getString('raison');

let m=await interaction.guild.members.fetch(t.id);
await m.timeout(600000);

log("⚠️ Sanction",`${t.username} → ${r}`);

return interaction.reply("sanction appliquée");
}

}

// ===== BUTTONS =====
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

if(interaction.customId.startsWith("view_")){
let [_,cat,name]=interaction.customId.split("_");
let data=shop[cat][name];

const embed=new EmbedBuilder()
.setTitle(name)
.setDescription(`💰 ${data.price}`)
.setImage(data.image||null);

const row=new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId(`add_${cat}_${name}`).setLabel("Ajouter +1").setStyle(ButtonStyle.Success)
);

return interaction.reply({embeds:[embed],components:[row],ephemeral:true});
}

if(interaction.customId.startsWith("add_")){
let [_,cat,name]=interaction.customId.split("_");

if(!carts[user]) carts[user]={};
carts[user][name]=(carts[user][name]||0)+1;

return interaction.reply({content:`+1 ${name}`,ephemeral:true});
}

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

if(interaction.customId==="buy"){
let total=0;

for(let n in carts[user]){
for(let c in shop){
if(shop[c][n]){
total+=shop[c][n].price*carts[user][n];
}
}
}

if(money[user]<total)
return interaction.reply({content:"❌ pas assez",ephemeral:true});

money[user]-=total;
carts[user]={};
save();

log("💸 Achat",`${interaction.user.username} ${total}`);

return interaction.reply({content:"✅ achat",ephemeral:true});
}

if(interaction.customId==="cancel"){
carts[user]={};
return interaction.reply({content:"annulé",ephemeral:true});
}

}

});

// ===== REGISTER =====
const rest=new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('ready',async()=>{
await rest.put(
Routes.applicationGuildCommands(client.user.id,GUILD_ID),
{body:commands.map(c=>c.toJSON())}
);
console.log("READY");
});

client.login(process.env.TOKEN);
