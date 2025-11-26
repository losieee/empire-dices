const {add} = require("./math.js");

let num = 42;             
var name = "TOM";         
let isStudent = true;     

console.log(add(num, num));

let color = ["red", "green", "blue"];

let person = { name : "Alice", age : 30 };

for(var i = 0; i < 5; i++)
{
    console.log(i);
}

function greet(name)
{
    console.log("Hello " + name + "!");
}

greet(person.name);

if (num > 30)
{
    console.log("Number is greater than 30");
}

setTimeout(() => {
    console.log("Delayed Message 1");
}, 1000); 

setTimeout(() => {
    console.log("Delayed Message 2");
}, 750); 

setTimeout(() => {
    console.log("Delayed Message 3");
}, 2000); 

setTimeout(() => {
    console.log("Delayed Message 4");
}, 500); 