

class Test {

    constructor() {
        this.a = 10;
        this.b = 11;    
    }
    
    printA() {
        console.log('A = '+this.a);
    }

}


module.exports = {
    "a": 11,
    "b": 11,
    

    hlInit: function()
    {
        console.log("Module has been loaded/reloaded");
    },

    hlUnload: function()
    {
        console.log("Module is being unloaded, better take down all event listeners so they don't overlap with new ones!");
    }
};

