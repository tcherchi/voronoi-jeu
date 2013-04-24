"use strict";

var VGame = {
	//Constant
	width: 600,
	height: 500,
	fillColor: ["#FF0000", "#00FF00", "#0000FF", "#00FFFF", "#FF00FF", "#FFFF00", "#DDDDDD", "#333333", "#FFFFFF"],
	
	init: function(){
		this.centers = [];
		this.playerList = d3.select("voronoi-players");
		
		//Initialize templates
		jsviews.templates({
			playerListChoose: this.byId("player-list-choose-template").innerHTML,
			playerListScore: this.byId("player-list-score-template").innerHTML,
			statusStartGame: this.byId("status-start-game-template").innerHTML,
			statusInGame: this.byId("status-in-game-template").innerHTML,
			statusEndGame: this.byId("status-end-game-template").innerHTML
		});

		this.prepareForNewGame();
		
		this.rulesButton = d3.select("#voronoi-show-rules");
		this.rules = d3.select("#voronoi-rules");
	},
	
	showRules: function(){
		this.rulesButton.style("display", "none");
		this.rules.style("display", "block");
	},
	
	hideRules: function(){
		this.rulesButton.style("display", "block");
		this.rules.style("display", "none");
	},

	/*****************************************************************************\
									UTILS
	\*****************************************************************************/

	byId: function(id){
		return document.getElementById(id);
	},
	
	/*****************************************************************************\
									VORONOI VIEW
	\*****************************************************************************/
	
	resetSVGElement: function(){
		this.byId("voronoi-canvas").innerHTML = "";
	
		//Creates the SVG element (cannot put it in the HTML for IE8)
		this.svg = d3.select("#voronoi-canvas")
			.append("svg")
			.attr("width", this.width)
			.attr("height", this.height);

		//Add events to the SVG element (need it separated from the creation because of r2d3)
		d3.select("#voronoi-canvas").on("mousemove", function(){VGame.mouseMoved(d3.mouse(this))})
			.on("click", function(){VGame.mouseClicked(d3.mouse(this))});
			
		//Fake a mouse pos to put some color at the start
		this.updateFakeCell([1.0, 1.0]);
	},
	
	getFakeCell: function(pos){
		//Allocate a fake cell if there is none
		if(this.centers.length == 0 || !this.centers[this.centers.length -1].fake){
			this.centers.push({
				player: 8,
				fake: true
			});
		}
		
		var center = this.centers[this.centers.length -1];
		center.pos = pos;
		
		return center;
	},
	
	updateFakeCell: function(pos){
		this.getFakeCell(pos);

		//Updates the cells and draw everything
		this.doVoronoi(this.centers, true);
		this.updateView(this.centers);
	},
	
	addCenter: function(pos, player){
		//Updates the preview cell so that it becomes a real cell
		var center = this.getFakeCell(pos);
		center.fake = false;
		center.player = player;

		//Add some jitter to the center so that we never have to cells with the exact same center
		center.pos[0] += Math.random() * 0.1 - 0.05;
		center.pos[1] += Math.random() * 0.1 - 0.05;
		
		//Updates the cells and draw everything
		this.doVoronoi(this.centers, true);
		this.updateView(this.centers);
	},

	voronoi2Points: function(points){
		var p1 = points[0];
		var p2 = points[1];
		var middle = [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2];
		var diff = [points[0][0] - points[1][0], points[0][1] - points[1][1]];
		var reverse = false;
		var cells = [];
		
		//Try to put ourselves in the same direction as diff
		if(Math.abs(diff[0]) > Math.abs(diff[1])){
			//We do the computations for diff[0] > 0, if it is not > 0 reverse everything
			if(diff[0] < 0){
				reverse = true;
				var temp = p1;
				p1 = p2;
				p2 = temp;
				diff[0] = - diff[0];
				diff[1] = - diff[1];
			}
			var normal = [diff[1], -diff[0]];
			var cella = [];
			var cellb = [];

			//Do not try to make a cell that is convex or that fits the borders of the canvas
			//the clipping will correct this afterwards
			cella.push([middle[0] + normal[0] * 100000, middle[1] + normal[1] * 100000]);
			cella.push([middle[0] - normal[0] * 100000, middle[1] - normal[1] * 100000]);
			cella.push([this.width + 100000, this.height + 100000]);
			cella.push([this.width + 100000, -100000]);

			cellb.push([middle[0] + normal[0] * 100000, middle[1] + normal[1] * 100000]);
			cellb.push([middle[0] - normal[0] * 100000, middle[1] - normal[1] * 100000]);
			cellb.push([-100000, this.height + 100000]);
			cellb.push([-100000, -100000]);
						
			cells = [cella, cellb];
		}else{
			//Same case along the y axis
			if(diff[1] < 0){
				reverse = true;
				var temp = p1;
				p1 = p2;
				p2 = temp;
				diff[0] = - diff[0];
				diff[1] = - diff[1];
			}
			var normal = [diff[1], -diff[0]];
			var cella = [];
			var cellb = [];
			
			cella.push([middle[0] + normal[0] * 100000, middle[1] + normal[1] * 100000]);
			cella.push([middle[0] - normal[0] * 100000, middle[1] - normal[1] * 100000]);
			cella.push([-100000, this.height + 100000]);
			cella.push([this.width + 100000, this.height + 100000]);

			cellb.push([middle[0] + normal[0] * 100000, middle[1] + normal[1] * 100000]);
			cellb.push([middle[0] - normal[0] * 100000, middle[1] - normal[1] * 100000]);
			cellb.push([-100000, -100000]);
			cellb.push([this.width + 100000, -100000]);
			
			cells = [cella, cellb];
		}
		
		if(reverse){
			var temp = cells[0];
			cells[0] = cells[1];
			cells[1] = temp;
		}
		return cells;
	},
	
	doVoronoi: function(data, forView){
		var epsilon = forView ? 0.001: 0.0;
	
		//Used to clip cells for the computation of the area
		//Do not put it exactly at 0 not to have bugs in IE8:
		//Raphael distords paths when path.d has numbers in exponent notation in it
		var clipper = d3.geom.polygon([
			[-epsilon, -epsilon],
			[-epsilon, this.height + epsilon],
			[this.width + epsilon, this.height + epsilon],
			[this.width + epsilon, -epsilon]
		]);

		//Does the voronoi
		var input = data.map(function(datum){return datum.pos;});

		//Fugly fix for a bug of d3.geom.voronoi on IE8
		var output = null
		if(input.length == 1){
			output = [[[-10000, -10000], [-10000, 10000], [10000, 10000], [10000, -10000]]];
		}else if(input.length == 2){
			output = this.voronoi2Points(input);
		}else{
			var output = d3.geom.voronoi(input);
		}
		
		//Once we have the cells, update the data
		for(var i = 0; i < output.length; i++){
			data[i].polygon = clipper.clip(d3.geom.polygon(output[i]));
			if(forView){
				data[i].attrD = "M" + output[i].join("L") + "Z";
			}
		}
	},

	updateView: function(data){
		//Updates the data with the current cells
		var voronoi = this.svg.selectAll("path")
			.data(data);
		
		//Updates the path only if it changed
		voronoi.filter(function(datum){return this.getAttribute("d") != datum.attrD;})
			.attr("d", function(datum){return datum.attrD;});

		//Update the fill color only if it changed
		voronoi.filter(function(datum){return this.getAttribute("fill") !=  VGame.fillColor[datum.player];})
			.style("fill", function(datum){return VGame.fillColor[datum.player];});
		
		//Create the new paths
		voronoi.enter().append("path")
			.style("fill", function(datum){return VGame.fillColor[datum.player];})
			.attr("d", function(datum){return datum.attrD;});
			
		//Updates the circles but take care not to put one for the fake cell
		var circles = this.svg.selectAll("circle")
			.data(data.filter(function(datum){return !datum.fake}));
		
		//Create the new circles
		circles.enter().append("circle")
			.attr("transform", function(datum){return "translate(" + datum.pos + ")";})
			.attr("r", 2);

		//Remove objects that are no longer used
		//Actually does nothing as we reset the whole SVG when we need to remove some nodes (r2d3 bug, .remove() does not work)
		voronoi.exit().remove();
		circles.exit().remove();
	},
	
	/*****************************************************************************\
									EVENTS HANDLING
	\*****************************************************************************/
	
	mouseMoved: function(pos){
		//Make sure the player can do this move (playing + in zone)
		if(pos[0] < 0 || pos[1] < 0 || pos[0] > this.width || pos[1] > this.height){
			return;
		}
		if(!this.playing || !this.players[this.currentPlayer].human){
			return;
		}
		
		this.updateFakeCell(pos);
	},

	mouseClicked: function(pos){
		//Make sure the player can do this move (playing + in zone)
		if(pos[0] < 0 || pos[1] < 0 || pos[0] > this.width || pos[1] > this.height){
			return;
		}
		if(!this.playing || !this.players[this.currentPlayer].human){
			return;
		}
		this.addCenter(pos, this.currentPlayer);
		this.endTurn();
	},
	
	startNewGameClicked: function(){		
		this.players = {}
		this.currentPlayer = 0;
		this.currentRound = 0;		

		//Get the chosen options
		this.roundLimit = this.byId("nbrounds-select").value;
		for(var i = 0; i < 8; i++){
			this.players[i] = this.ai[this.byId("player-select-" + i).value];
		}
		
		this.playing = true;
		
		//Render the scoreboard
		this.updateGameStatus();
		
		this.nextPlayer();
	},
	
	/*****************************************************************************\
									GAME STUFF
	\*****************************************************************************/

	computeScores: function(centers){
		//Computes the score of each player given the list of centers
		var scores = [];
		for(var i = 0; i < 8; i++){
			scores.push(0.0);
		}
		
		if(centers.length > 0){
			this.doVoronoi(centers);
			centers.forEach(function(center){
				scores[center.player] += Math.abs(center.polygon.area());
			});
		}
		
		return scores;
	},
	
	getCurrentCenters: function(){
		//returns a copy of the list of non-fake centers
		var res = [];
		for(var i = 0; i < this.centers.length; i++){
			if(this.centers[i].player < 8){
				res.push({player: this.centers[i].player, pos: this.centers[i].pos})
			}
		}
		return res;
	},
	
	bestPosAround: function(target, player){
		//Chooses the best positions possible in a circle around the target pos
		var bestScore = 0.0;
		var bestPos = null;
		
		//Discreet angles but it should be ok
		for(var angle = 0; angle < 2*Math.PI; angle += Math.PI / 8){
			var pos = [target[0] + Math.cos(angle) * 8, target[1] + Math.sin(angle) * 8];

			//Do no put it outside the zone
			if(pos[0] < 0 || pos[1] < 0 || pos[0] > this.width || pos[1] > this.height){
				continue;
			}
			
			var centers = this.getCurrentCenters();
			centers.push({
				player: player,
				pos: pos
			});

			var scores = this.computeScores(centers);
			if(scores[player] > bestScore){
				bestScore = scores[player];
				bestPos = pos;
			}
		}
		
		return bestPos;
	},
	
	updateGameStatus: function(){
		//Compute the score for only the real centers
		var centers = this.getCurrentCenters();
		var scores = this.computeScores(centers);
		
		//Update the scoreboard
		this.byId("voronoi-players").innerHTML = jsviews.render.playerListScore({
			range: d3.range(8),
			scores: scores.map(function(s){return Math.floor(s);}),
			players: this.players,
			colors: this.fillColor
		});
		
		//Tell whose turn it is
		this.byId("voronoi-status").innerHTML = jsviews.render.statusInGame({
			player: this.currentPlayer,
			round: this.currentRound,
			maxRound: this.roundLimit
		});
	},
	
	endTurn: function(){
		//Some bookkeeping after the end of the turn
		this.currentPlayer ++;
		if(this.currentPlayer >= 8){
			this.currentPlayer = 0;
			this.currentRound ++;
		}

		this.updateGameStatus();

		if(this.currentRound == this.roundLimit){
			this.endGame();
			return;
		}
		
		//But do not do the actual move of players
		this.nextPlayer();
	},
	
	nextPlayer: function(){
		var player = this.players[this.currentPlayer];
		
		//Unused player slots
		if(!player.plays){
			this.endTurn();
			return;
		}
		
		//The human player will trigger the end of turn by clicking
		if(player.human){
			return;
		}
		
		//Do the AI move after some time to act as if it was thinking
		var self = this;
		this.AITimeout = setTimeout(function(){
			var pos = player.play(self, self.currentPlayer);
			self.addCenter(pos, self.currentPlayer);
			self.endTurn();
		}, Math.random() * 400 + 500);
	},
	
	endGame: function(){
		//Shows the congratz view/status and waits for the player to press "Restart"
		this.playing = false;
		var scores = this.computeScores(this.centers);
		
		var winner = 0;
		for(var i = 1; i < scores.length; i++){
			if(scores[i] > scores[winner]){
				winner = i;
			}
		}
		
		this.byId("voronoi-status").innerHTML = jsviews.render.statusEndGame({
			winner: winner
		});
	},
	
	prepareForNewGame: function(){
		//Renders the "lobby" and reset some things
		clearTimeout(this.AITimeout);
	
		this.playing = false;
		this.centers = [];
		this.resetSVGElement();
	
		this.byId("voronoi-players").innerHTML = jsviews.render.playerListChoose({
			players: d3.range(8),
			ai: this.ai,
			defaults: this.defaultAi,
			colors: this.fillColor
		});

		this.byId("voronoi-status").innerHTML = jsviews.render.statusStartGame({
			range: d3.range(2, 16)
		});
	},
	
	/*****************************************************************************\
									AI OPPONENTS
	\*****************************************************************************/

	defaultAi: [0, 4, 5, 5, 5, 5, 5, 5],
	ai: [
		{
			name: "Humain",
			play: function(){
			},
			human: true,
			plays: true
		},
		{
			name: "Grosse Tête",
			play: function(game, player){
				//Chooses a random point
				return [Math.random() * game.width, Math.random() * game.height];
			},
			human: false,
			plays: true
		},
		{
			name: "Anti-gagnant",
			play: function(game, player){
				var centers = game.getCurrentCenters();
				var scores = game.computeScores(centers);
				
				//Make sure we always return without errors
				if(centers.length == 0){
					return [game.width / 2, game.height / 2];
				}
				
				//Choose the winning player
				var biggestScore = 0.0;
				var targetPlayer = this.player ? 0 : 1;
				for(var i = 0; i < 8; i++){
					if(i != player && scores[i] > biggestScore){
						targetPlayer = i;
						biggestScore = scores[i];
					}
				}
				
				//Choose his biggest zone
				var targetPos = null;
				var bestArea = 0.0;
				for(var i = 0; i < centers.length; i++){
					if(centers[i].player == targetPlayer && Math.abs(centers[i].polygon.area()) > bestArea){
						targetPos = centers[i].pos;
						bestArea = Math.abs(centers[i].polygon.area());
					}
				}
				
				//Make sure we always return without errors
				if(targetPos == null){
					return [Math.random() * game.width, Math.random() * game.height];
				}
				
				//Try to claim the biggest part of this zone
				return game.bestPosAround(targetPos, player);
			},
			human: false,
			plays: true
		},
		{
			name: "Poly Majeur",
			play: function(game, player){
				var centers = game.getCurrentCenters();
				var scores = game.computeScores(centers);

				//Make sure we always return without errors
				if(centers.length == 0){
					return [game.width / 2, game.height / 2];
				}
				
				//Choose the biggest zone
				var targetPos = null;
				var bestArea = 0.0;
				for(var i = 0; i < centers.length; i++){
					if(centers[i].player != player && Math.abs(centers[i].polygon.area()) > bestArea){
						targetPos = centers[i].pos;
						bestArea = Math.abs(centers[i].polygon.area());
					}
				}
				
				//Make sure we always return without errors
				if(targetPos == null){
					return [Math.random() * game.width, Math.random() * game.height];
				}

				//Try to claim the biggest part of this zone
				return game.bestPosAround(targetPos, player);
			},
			human: false,
			plays: true
		},
		{
			name: "Bonne Pioche",
			play: function(game, player){
				var bestScore = 0.0;
				var bestPos = null;
				
				//Draw random pos and take the best one
				for(var i = 0; i < 10; i++){
					var centers = game.getCurrentCenters();
					var pos = [Math.random() * game.width, Math.random() * game.height];
					centers.push({
						player: player,
						pos: pos
					});
					
					var scores = game.computeScores(centers);
					if(scores[player] > bestScore){
						bestScore = scores[player];
						bestPos = pos;
					}
				}
				
				return bestPos;
			},
			human: false,
			plays: true
		},
		{
			name: "Inactif",
			play: function(){
			},
			human: false,
			plays: false
		}
	]
}
if(window.addEventListener){
    window.addEventListener('load',function(){VGame.init();});
}
else{
    window.attachEvent('onload',function(){VGame.init();});
}
