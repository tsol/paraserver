class SettingsManager {

    constructor(paramsSchema) {
        this.paramsSchema = paramsSchema;
        this.reset(null);
    }

    getParams() {
        return this.params;
    }

    reset(params) {
        
        this.params = {};

        // firstly set initial values from schema
        for (var p in this.paramsSchema) {
            this.params[p] = this.paramsSchema[p].def;
        }

        if (params) { 
            this.update(params);
        }
    }


    update(params)  {
        for (var p in params) {
            if ( this.paramsSchema.hasOwnProperty(p) ) {
                this.params[p] = params[p];
            }
        }
    }


}

module.exports = SettingsManager;
