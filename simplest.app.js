var gameport = process.env.PORT || 4004,
	sys = require('sys'),
	http = require('http'),
	io = require('socket.io'),
	express = require('express'),
	UUID = require('node-uuid'),
	verbose = false;
	
var app = express();
var server = http.createServer(app);
//server.listen(gameport);
var sio = io.listen(server);

var players = [];
var games = [];

server.listen(gameport);

//app.listen(gameport);

console.log('\t :: Express :: Listening on port '+gameport);

app.get('/',function(req,res){
	res.sendfile(__dirname + '/handshake.html');
});

app.get('/*',function(req,res,next){
	var file = req.params[0];

	if(verbose) console.log('\t :: Express :: file requested : '+file);
	res.sendfile(__dirname + '/' + file);
});

//var sio = io.listen(app);

sio.configure(function(){
	sio.set('log level', 0);

	sio.set('authorization', function(handshakeData,callback){
		callback(null,true);
	});
});

sio.sockets.on('connection',function(client){
	client.userid = UUID();
	client.gameid = -1;
	client.emit('onconnected',{ id: client.userid });
	
	players.push(client);
	
	console.log('\t socket.io:: player ' + client.userid + ' connected');
	
	console.log('\t '+players.length+' players online');
	
	client.on('disconnect', function(){
		console.log('\t socket.io:: client disconnected ' + client.userid);
		if (client.gameid > -1){
			// shut down game match
			games[client.gameid].player0.emit('game_interrupted',{error:'your opponent left the game'});
			games[client.gameid].player1.emit('game_interrupted',{error:'your opponent left the game'});
		}
		
		if (players.indexOf(client) >= 0){
			players.splice(players.indexOf(client), 1);
		}
		
	});
	
	if (players.length%2 == 0 && players.length > 0){
		//in pair
		console.log('\t '+players.length+' players are in pair');
		client.gameid = games.length;
		players[players.indexOf(client)-1].gameid = client.gameid;
		client.emit("gameStart",{ gid: client.gameid, player:1, opponent:players[players.indexOf(client)-1].userid });
		players[players.indexOf(client)-1].emit("gameStart",{ gid: client.gameid, player:0, opponent:client.userid });
		games.push({id:client.gameid,
					player0:players[players.indexOf(client)-1],
					player1:client});
		client.on('ball_update',function(data){
			//console.log('\t socket.io:: ball x: '+data.ball.x+' y: '+data.ball.y);
			//player1 is owning rightOfServe. passing to player0 (with ball_updated event)
			players[players.indexOf(client)-1].emit('ball_updated',data);
		});
		
		players[players.indexOf(client)-1].on('ball_update',function(data){
			//console.log('\t socket.io:: ball x: '+data.ball.x+' y: '+data.ball.y);
			//player1 is owning rightOfServe. passing to player0 (with ball_updated event)
			client.emit('ball_updated',data);
		});
	}
	
});

