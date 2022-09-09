/*
** This can wrap db access functions of an entity to perform
** cached store to DB. If close time of an entity is behind current
** stored data - then immediate DB update is performed, instead of caching.
**
** In normal operation all items in cache[] are stored using INSERT at
** specific time periods. If entity close time is behind - then UPDATE 
**
*/

class StoreCache {

    constructor( { update, save, reset, load } ) {
        this.saveFn = save;
        this.updateFn = update;
        this.resetFn = reset;
        this.loadFn = load;

        this.cache = [];
        this.updateCache = [];
        this.storedEndTime = 0;
    }

    save(params) { return this.saveFn(params); }
    update(params) { return this.updateFn(params); }
    load(params) { return this.loadFn(params); }

    reset() {
        this.storedEndTime = 0;
        return this.resetFn();
    }

    itemChanged(endTime, obj) {

        if ([ ... this.cache, ... this.updateCache ].includes(obj)) { return }

        if (endTime < this.storedEndTime) {
            return this.updateCache.push(obj);
        }

        return this.itemNew(obj);
    }

    itemNew(obj) {
        this.cache.push(obj);
    }

    storePhase(phaseEndTime) {
        this.cache.forEach( o => this.save(o.toSTORE()) );
        this.updateCache.forEach( o => this.update( obj.toSTORE() ) );

        this.cache = [];
        this.updateCache = [];

        this.storedEndTime = phaseEndTime;
    }

}

module.exports = StoreCache;