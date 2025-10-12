
//Weapons.wrench.players[0] = POSSIBLE
//weapons.get("wrench").players[1] = 2;
const weapons = new Map([['wrench', {players: [0,0,0]}], ['dagger', {players: [1,0,0]}]]);

//output map
for (let [key, value] of  weapons.entries()) {
    console.log(`${key}: ${value.players}`);
}

//add dynamic players property to each map key
 myMap.forEach((value, key) => { 
  value["players"] = [0,0,0,0,0,0]; 
  // If the value is a complex object and you want a dynamic value per key:
  // value[dynamicPropertyName] = calculateAgeBasedOnKey(key); 
});