// index.js
hotload = require("hotload");
 
// First argument is the same as for `require`. Second argument (callback) is optional.
// Callback's first argument is the module object, which is exactly the same object
// as returned by `hotload`.

let instance = null;

let obj = hotload("./classlib.js", function(obj2){

    console.log("lib has loaded/reloaded!");
    
    console.log(obj2);
    
    let instance = new obj2.Test();    
    instance.printA();
    
});


setInterval(function()
{
    if (instance) {
        instance.printA();
    }
    
}, 1000);

