class WebClients {

    constructor() {
        this.sockets = [];
    }
 
    emit(command, data) {
        console.log('SC: emitting command '+command+' to '+this.sockets.length+' client sockets.');
        this.sockets.forEach( (s) => s.emit(command, data) );
    }

    connect(socket)
    {
        console.log('SC: client connected')
        this.sockets.push(socket);
    }

    disconnect(socket)
    {
        console.log('SC: client disconnected');
        this.sockets = this.sockets.filter( (s) => s !== socket );
    }

}

module.exports = WebClients;
