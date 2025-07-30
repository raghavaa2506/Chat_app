let xp=0;
let health=100;
let gold=500;
let currentWeapon=0;
let fighting;
let monsterHealth;
let inventory=["stick"];
const button1=document.querySelector("#button1");
const button2=document.querySelector("#button2");
const button3=document.querySelector("#button3");
const text=document.querySelector("#text");
const xpText=document.querySelector("#xpText");
const healthText=document.querySelector("#healthText");
const goldText=document.querySelector("#goldText");
const monsterStats=document.querySelector("#monsterStats");
const monsterNameText=document.querySelector("#monsterName");
const monsterHealthText=document.querySelector("#monsterHealth");

const weapons=[
    {
        name:"stick",
        power:5,
    },
    {
        name:"dagger",
        power:30,
    },
    {
        name:"claw hammer",
        power:50,
    },
    {
        name:"sword",
        power:100,
    }
];
const monsters=[
    {
        name:"slime",
        level:2,
        health:15,
    },
    {
        name:"fanged beast",
        level:8,
        health:60,
        
    },
    {
        name:"dragon",
        level:20,
        health:300,
    }
];
const locations=[{
    name:"town square",
    "button text":["Go to store", "Go to cave", "Fight dragon"],
    "button functions":[goStore, goCave, fightDragon],
    text:"You are in the town square. You see a sign that says \"store\".",
},
{
    name:"store",
    "button text":["Buy 10 health(10 gold)", "Buy weapon(30 gold)", "Go to town square"],
    "button functions":[buyHealth, buyWeapon, goTown],
    text:"You enter the store.",
}, 
{
    name:"cave",
    "button text":["Fight slime", "Fight fanged beast", "Go to town square"],
    "button functions":[fightSlime, fightBeast, goTown],
    text:"You enter the cave. You see some monsters.",
},
{
    name:"fight",
    "button text":["Attack", "Dodge", "Run"],
    "button functions":[attack, dodge, goTown],
    text:"You are fighting a monster!"
}

]

button1.onclick=goStore;
button2.onclick=goCave;
button3.onclick=fightDragon;

function update(location){
   button1.innerText=location["button text"][0];
  button2.innerText=location["button text"][1];
    button3.innerText=location["button text"][2];
  button1.onclick=location["button functions"][0];
  button2.onclick=location["button functions"][1];
  button3.onclick=location["button functions"][2];
  text.innerText=location.text;
}
function goTown(){
 update(locations[0]);
}
function goStore(){
 update(locations[1]);
}
function goCave(){
    console.log("Going to cave");
    update(locations[2]);

}
function fightSlime(){
  fighting=0;
  goFight();
}
function fightBeast(){
  fighting=1;
  goFight();
}
function fightDragon(){
  fighting=2;
  goFight();

}
function buyHealth(){
if(gold>=10){
    gold=gold-10;
   health=health+10;
   goldText.innerText= gold;
   healthText.innerText= health;
}
else{
    text.innerText="You don't have enough gold to buy health.";
}
}
function sellWeapon(){
if(currentWeapon>0){
    gold=gold+15;
    currentWeapon--;
    inventory.pop();
    goldText.innerText=gold;
    text.innerText="You sold the weapon " + weapons[currentWeapon+1].name + " for 15 gold.";
}
else{
    text.innerText="Don't sell your only one left over weapon!!!.";
}
}
function buyWeapon(){
  if(currentWeapon<3){
    if(gold>=30){
    gold=gold-30;
    currentWeapon++;
    inventory.push(weapons[currentWeapon].name);
    text.innerText="You bought a " + weapons[currentWeapon].name + ".";
    goldText.innerText=gold;
    text.innerText="In your inventory you have: " + inventory;
  }
  else{
    text.innerText="You don't have enough gold to buy a weapon.";
  }
  }
  else{
    text.innerText="You already have the best weapon.";
     button2.innerText="Sell weapon for 15 gold";
    button2.onclick=sellWeapon;
  }
}
function goFight(){
   update(locations[3]);
   monsterHealth=monsters[fighting].health;
   monsterStats.style.display="block";
   monsterNameText.innerText=monsters[fighting].name;
    monsterHealthText.innerText=monsterHealth;
}
function attack(){
   text.innerText="You attack the " + monsters[fighting].name + "!";
   monsterHealth-=weapons[currentWeapon].power+Math.floor(Math.random()*xp)+1;
   health=health- monsters[fighting].level;
    healthText.innerText=health;
   monsterHealthText.innerText=monsterHealth;
   if(health<=0){
    lose();
   }
   else if(monsterHealth<=0){
    win();
   }
   else{
    text.innerText+="\nThe " + monsters[fighting].name + " attacks you back!";
   }
   
}
function dodge(){
  text.innerText="You dodge the attack from the " + monsters[fighting].name + "!";
}
function win(){
  text.innerText="You defeated the " + monsters[fighting].name + "!";
  gold+=monsters[fighting].level*10;
  goldText.innerText=gold;
  goTown();
}
function lose(){
  text.innerText="You were defeated by the " + monsters[fighting].name + "!";
  health=100;
  healthText.innerText=health;
  xp=0;
  xpText.innerText=xp;
  goTown();
}

