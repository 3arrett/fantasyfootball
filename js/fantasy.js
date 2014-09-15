(function($){
	// TODO : Head-to-Head Records against other owners.

	var teams, schedule, leagues, conferences, trophies, standings, history, projections, playoffs, playoffSchedule, playoffScores;
	var currentWeek;
	var FFsession = false;
	var currentSeason = "2014";
	
	function getData(table){
	    return $.get('http://' + window.location.host + '/page_element/ajax/'+ table +'.json');
	}
	
	if (sessionStorage.leagues) {
		FFsession = true;
	} else {
		$.when(getData(34165705),
			   getData(43822945),
			   getData(34165706),
			   getData(34165707),
			   getData(34203274),
			   getData(34206192),
			   getData(34248833),
			   getData(34580984),
			   getData(35226600),
			   getData(35625525),
			   getData(43822793),
			   getData(43838538),
			   getData(43838543)
		).done(function(leaguesData, conferencesData, teamsData, scheduleData, trophyWinnersData, scoresData, standingsData, historyData, projectionsData, trophyData, playoffData, playoffScheduleData, playoffScoresData){
			leagues = leaguesData[0];
			conferences = conferencesData[0];
			teams = teamsData[0];
			scores = scoresData[0];
			schedule = scheduleData[0];
			trophies = trophyWinnersData[0];
			trophyDetails = trophyData[0];
			standings = standingsData[0];
			history = historyData[0];
			projections = projectionsData[0];
			playoffs = playoffData[0];
			playoffSchedule = playoffScheduleData[0];
			playoffScores = playoffScoresData[0];
			sessionStorage.setItem('currentSeason', JSON.stringify(currentSeason));
		
			$('body').trigger('dataReady');
		}).fail(function() {
			$('body').prepend('<div class="failure">Shit, that wasn\'t supposed to happen. REFRESH!</div>');
			$('.failure').slideDown();
		});
	}
    
    $(document).on('dataReady','body',function() {	
    	if (!FFsession && !sessionStorage.leagues) {
    		// Set up Team Data
    		for (var t = 0; t < teams.length; t++) {
    			var team = teams[t];
    			team.seasons = team.seasons.split(', ');
    			team.conferenceID = team.conferenceID.split(',');
    			team.teamName = (team.teamName != null) ? team.teamName.split(',') : [team.teamOwner]; 
    			// Create an array of teamName's per season. If there's more Seasons than Names, duplicate the name for the empty seasons.
    			if (team.teamName.length !== team.seasons.length) {
    				for (var s = team.teamName.length; s < team.seasons.length; s++) {
    					team.teamName[s] = team.teamName[s-1];
    				}
    			}
	
    			team["trophies"] = getTeamTrophies(team.teamID);
	
    			var historicalRecords = getTeamHistory(team.teamID);
    			team["historicalRecords"] = {
    				"wins" : 0,
    				"losses" : 0,
    				"ties" : 0,
    				"madePlayoffs" : 0,
    				"playoffWins" : 0,
    				"playoffLosses" : 0,
    				"seasons" : historicalRecords
    			};
    			var records = team["historicalRecords"];
    			for (var h = 0; h < historicalRecords.length; h++) {
    				var record = historicalRecords[h];
    				records.wins += parseInt(record.wins) || 0;
    				records.losses += parseInt(record.losses) || 0;
    				records.madePlayoffs += parseInt(record.playoffs) || 0;
    				records.playoffWins += parseInt(record.playoffWins) || 0;
    				records.playoffLosses += parseInt(record.playoffLosses) || 0;
    			}
	
    			var teamNames = {}
    			var conferenceIDs = {}
    			for (var s = 0; s < team.seasons.length; s++) {
    				var season = team.seasons[s];
    				teamNames[season] = team.teamName[s];
    				conferenceIDs[season] = team.conferenceID[s];
    			}
	
    			team.teamName = teamNames;
    			team.conferenceID = conferenceIDs;

    			team["head2head"] = [];

    			for (var tms = 0; tms < teams.length; tms++) {
    				var tm = teams[tms];
    				team.head2head.push({
    					"teamID" : tm.teamID,
    					"wins" : 0,
    					"losses" : 0,
    					"ties" : 0,
    					"winPct" : 0,
    					"pointsScored" : 0,
    					"pointsAgainst" : 0,
    					"playoffWins" : 0,
    					"playoffLosses" : 0,
    					"playoffPointsScored" : 0,
    					"playoffPointsAgainst" : 0
    				});
    			}
    			
    		}
	
    		// let's use for loops = http://jsperf.com/jquery-each-vs-underscore-each-vs-for-loops/4
    		for (var l = 0; l < leagues.length; l++) {
    			var league = leagues[l];
    			league.season = league.season.split(', '); // Stupid Google Spreadsheet wants to turn 2013,2014 into 20132014…
    			var seasons = league.season;
    			league["seasons"] = {};
				var leagueID = league.leagueID;
	
				// Set up data into Seasons
    			for (var s = 0; s < seasons.length; s++) {
    				var season = seasons[s];
	
    				var seasonScores = getLeagueScores(leagueID, season);
    				var seasonStandings = getLeagueStandings(leagueID, season);
    				var seasonSchedule = getLeagueSchedule(leagueID, season);

	    			var latestWeek = getLastWeek(seasonScores)
	
    				// Load Scores into Standings data
    				for (var sc = 0; sc < seasonScores.length; sc++) {
	    				var teamScores = seasonScores[sc];
	    				var teamID = teamScores.teamID;
	    				var totalScore = 0;
	    				
	    				for(var score in teamScores) {
	    					if (score !== 'teamID' && score !== 'leagueID' && score !== 'season') {
	    						var week = parseInt(score.slice(4))
	    						if (week < latestWeek) {
					    			totalScore += parseFloat(teamScores[score]);
					    		}
	    					}
	    				}
	    				
	    				for (var ss = 0; ss < seasonStandings.length; ss++) {
	    					if (seasonStandings[ss].teamID == teamID) {
	    						seasonStandings[ss].pointsScored = totalScore;
	    						break;
	    					}
	    				}
						
    				}
    				
    				// Load Scores into Schedule Data
    				for (var sch = 0; sch < seasonSchedule.length; sch++) {
	    				var game = seasonSchedule[sch];
	    				
	    				game.awayTeamScore = parseFloat(getTeamScore(seasonScores, game.awayTeam, game.week));
	    				game.homeTeamScore = parseFloat(getTeamScore(seasonScores, game.homeTeam, game.week));
	    				
	    				var awayTeam = game.awayTeam;
	    				var homeTeam = game.homeTeam;
	    				var conference = parseInt(game.conferenceID);

	    				if (parseInt(game.week) < latestWeek) {
	    					if (game.homeTeamScore > game.awayTeamScore) {
					    		addHistoricalLoss(awayTeam);
					    		addHistoricalWin(homeTeam);
					    		addHead2Head(homeTeam, awayTeam, false, game.homeTeamScore, game.awayTeamScore);
	    					} else if (game.homeTeamScore < game.awayTeamScore) {
					    		addHistoricalLoss(homeTeam);
					    		addHistoricalWin(awayTeam);
					    		addHead2Head(awayTeam, homeTeam, false, game.awayTeamScore, game.homeTeamScore);
	    					}
	    				}

	    				// Create Records and add Points against to Standings
	    				for (var ss = 0; ss < seasonStandings.length; ss++) {
	    					teamStandings = seasonStandings[ss];
	    					if (parseInt(game.week) < latestWeek) {
	    						if (teamStandings.teamID == awayTeam) {
	    							if (isNaN(parseFloat(teamStandings.pointsAgainst))) { teamStandings.pointsAgainst = 0 }
	    							teamStandings.pointsAgainst += game.homeTeamScore;
	
	    							if (game.homeTeamScore > game.awayTeamScore) {
					    				teamStandings.losses += 1;
					    				if (conference > 0) {
					    					teamStandings.leagueLosses += 1;
										}
									} else if (game.homeTeamScore < game.awayTeamScore) {
					    				teamStandings.wins += 1;
					    				if (conference > 0) {
					    					teamStandings.leagueWins += 1;
										}
									}
	    						} else if (teamStandings.teamID == homeTeam) {
	    							if (isNaN(parseFloat(teamStandings.pointsAgainst))) { teamStandings.pointsAgainst = 0 }
	    							teamStandings.pointsAgainst += game.awayTeamScore;
	
	    							if (game.homeTeamScore > game.awayTeamScore) {
					    				teamStandings.wins += 1;
					    				if (conference > 0) {
					    					teamStandings.leagueWins += 1;
										}
									} else if (game.homeTeamScore < game.awayTeamScore) {
					    				teamStandings.losses += 1;
					    				if (conference > 0) {
					    					teamStandings.leagueLosses += 1;
										}
									}
	    						}
	    					}
	    				}
    				}
    				
    				
    				// Load Winning Pct into Standings
    				for (var st = 0; st < seasonStandings.length; st++) {
	    				var team = seasonStandings[st];
	    				var wins = team.wins;
	    				var losses = team.losses;
	    				var leagueWins = team.leagueWins;
	    				var leagueLosses = team.leagueLosses;
	    				team['allPlayWins'] = 0;
	    				team['allPlayLosses'] = 0;
	    				team['allPlayWinPct'] = '';
	    				
	    				if (!wins)
	    					team.wins = 0;
	    				if (!losses)
	    					team.losses = 0;
	    				
	    				if (!leagueWins)
	    					team.leagueWins = 0;
	    				if (!leagueLosses)
	    					team.leagueLosses = 0;
	
	    				if (!team.pointsScored)
	    					team.pointsScored = 0
	
	    				if (!team.pointsAgainst)
	    					team.pointsAgainst = 0
	    				
	    				team.winPct = getTeamWinningPercentage(team.teamID, season);
	    				team.leagueWinPct = getLeagueWinningPercentage(team.teamID, season);
    				}
    				
    				// Load Wins and Losses against league into Standings
    				for (var i = 1; i < latestWeek; i++) {
	    				var everyRecord = seasonScores;
	    				everyRecord.sort(function(a,b) {
							return sorting(a['week'+i],b['week'+i]);
						});
						
						for (var j = 0; j < everyRecord.length; j++) {
							var team = everyRecord[j];
							var teamID = team.teamID;
							for (var k = 0; k < seasonStandings.length; k++) {
								teamStandings = seasonStandings[k];
								if (teamStandings.teamID == teamID) {
									teamStandings.allPlayWins += 28-(j+1);
									teamStandings.allPlayLosses += j;
									teamStandings.allPlayWinPct = (teamStandings.allPlayWins / (teamStandings.allPlayLosses + teamStandings.allPlayWins)).toFixed(3);
									break;
								}
							}
						}
    				}
    				
    				// Sort Standings based on Winning Percentage, then sorted by Points Scored		
					seasonStandings.sort(function(a,b) {
						return sorting(a.winPct,b.winPct) || sorting(a.pointsScored,b.pointsScored)
					});
    				
    				// Load Overall Ranks into Standings Data
    				for (var i = 0; i < seasonStandings.length; i++) {
    					var team = seasonStandings[i];
    					team.overallRank = i+1;
    				}
    				
    				// Load Conference Ranks into Standings Data
    				for (var i = 0; i < conferences.length; i++) {
    					var conference = conferences[i];
    					var conferenceStandings = getConferenceStandings(seasonStandings, conference.conferenceID);
    					
	    				for (var j = 0; j < conferenceStandings.length; j++) {
						    var team = conferenceStandings[j];
						    team.leagueRank = j+1;
	    				}
    				}
	
    				var seasonPlayoffTeams = getLeaguePlayoffTeams(leagueID, season);
    				var seasonPlayoffScores = getLeaguePlayoffScores(leagueID, season);
    				var seasonPlayoffSchedule = getLeaguePlayoffSchedule(leagueID, season);
    				var seasonPlayoffs = {
    					"teams" : seasonPlayoffTeams,
    					"rounds" : [
    						// {
    						// 	"round" : 1,
    						// 	"conferenceSchedule" : {
    						// 		"1" : [], // ConferenceID
    						// 		"2" : []
    						// 	}
    						// }, { "round" : 2, …}
    					]
    				}

    				// Add playoff appearances
    				for (var t = 0; t < seasonPlayoffs.teams.length; t++) {
    					var team = seasonPlayoffs.teams[t];
    					addPlayoffAppearance(team.teamID);
    				}
	
    				// Load Scores into Playoff Schedule
    				for (var g = 0; g < seasonPlayoffSchedule.length; g++) {
    					var game = seasonPlayoffSchedule[g];
    					var conferenceID = game.conferenceID;
    					var round = game.round;

    					var homeTeam, awayTeam;
	
    					var homeSeed = game.homeSeed;
    					if (homeSeed) {
	    					game.homeSeedScore = getPlayoffScore(homeSeed, conferenceID, round, seasonPlayoffScores);
	    					homeTeam = getPlayoffTeam(conferenceID, homeSeed, leagueID, season);
    					}
    					
    					var awaySeed = game.awaySeed;
    					if (awaySeed) {
    						game.awaySeedScore = getPlayoffScore(awaySeed, conferenceID, round, seasonPlayoffScores);
    						awayTeam = getPlayoffTeam(conferenceID, awaySeed, leagueID, season)
    					}

    					if (parseFloat(game.homeSeedScore) > parseFloat(game.awaySeedScore) && !game.thirdPlace) {
    						addPlayoffWin(homeTeam.teamID);
    						addPlayoffLoss(awayTeam.teamID);
					    	addHead2Head(homeTeam.teamID, awayTeam.teamID, true, game.homeSeedScore, game.awaySeedScore);
    					} else if (parseFloat(game.homeSeedScore) < parseFloat(game.awaySeedScore) && !game.thirdPlace) {
    						addPlayoffWin(awayTeam.teamID);
    						addPlayoffLoss(homeTeam.teamID);
					    	addHead2Head(awayTeam.teamID, homeTeam.teamID, true, game.awaySeedScore, game.homeSeedScore);
    					}
    				}
	
    				var playoffRoundCount = 0;
    				for (var round in seasonPlayoffScores[0]) {
    					if (round !== 'leagueID' && round !== 'conferenceID' && round !== 'seedID' && round !== 'season')
    						playoffRoundCount++;
    				}
	
    				for (var r = 1; r <= playoffRoundCount; r++) {
    					var round = {
    						"round" : r,
    						"conferenceSchedule" : {}
    					}
    					var games = getPlayoffRoundSchedule(seasonPlayoffSchedule, r);
	
    					for (var g = 0; g < games.length; g++) {
    						var game = games[g];
    						var conferenceID = game.conferenceID;
	
    						if (game.championship || game.thirdPlace) {
    							round.roundType = "finals";
    						} else {
    							round.roundType = "conference";
    						}
	
    						if (game.championship || game.thirdPlace) {
    							var finals = (game.championship) ? "championshipGame" : "thirdPlaceGame";
    							if (!round[finals]) {
    								round[finals] = game;
    							} else {
    								if (round[finals].awaySeed) {
    									round[finals].homeSeed = game.homeSeed || game.awaySeed;
    									round[finals].homeSeedScore = game.homeSeedScore || game.awaySeedScore;
    									round[finals].homeSeedConference = game.conferenceID;
    								} else {
    									round[finals].awaySeed = game.awaySeed || game.homeSeed;
    									round[finals].awaySeedScore = game.awaySeedScore || game.homeSeedScore;
    									round[finals].awaySeedConference = game.conferenceID;
    								}

    								var homeConference = round[finals].homeSeedConference || round[finals].conferenceID;
    								var awayConference = round[finals].awaySeedConference || round[finals].conferenceID;
    								var homeTeam = getPlayoffTeam(homeConference, round[finals].homeSeed, leagueID, season);
    								var awayTeam = getPlayoffTeam(awayConference, round[finals].awaySeed, leagueID, season)

    								if (parseFloat(round[finals].homeSeedScore) > parseFloat(round[finals].awaySeedScore) && !game.thirdPlace) {
    									addPlayoffWin(homeTeam.teamID);
    									addPlayoffLoss(awayTeam.teamID);
					    				addHead2Head(homeTeam.teamID, awayTeam.teamID, true, round[finals].homeSeedScore, round[finals].awaySeedScore);
    								} else if (parseFloat(round[finals].homeSeedScore) < parseFloat(round[finals].awaySeedScore) && !game.thirdPlace) {
    									addPlayoffWin(awayTeam.teamID);
    									addPlayoffLoss(homeTeam.teamID);
					    				addHead2Head(awayTeam.teamID, homeTeam.teamID, true, round[finals].homeSeedScore, round[finals].awaySeedScore);
    								}
    							}
    						}
	
    						if (!round.conferenceSchedule[conferenceID]) {
    							round.conferenceSchedule[conferenceID] = []
    						}
	
    						round.conferenceSchedule[conferenceID].push(game)
    					}
	
    					seasonPlayoffs.rounds.push(round);
    				}
	
    				league.seasons[season] = {}
    				league.seasons[season].latestWeek = latestWeek;
    				league.seasons[season]["standings"] = seasonStandings;
    				league.seasons[season]["schedule"] = seasonSchedule;
    				league.seasons[season]["scores"] = seasonScores;
    				league.seasons[season]["projections"] = getLeagueProjections(leagueID, season);
    				league.seasons[season]["teams"] = getLeagueSeasonTeams(leagueID, season);
    				league.seasons[season]["conferences"] = getLeagueConferences(leagueID, season); // Future work of multiple conferences.
    				league.seasons[season]["playoffs"] = seasonPlayoffs;

    				// Load Playoff data and Historical Data into Individual Team info.
	    			// var seasonSet = {
	    			// 	"teamID": team.teamID,
	    			// 	"leagueID": leagueID,
	    			// 	"wins": getLeagueRecord(team.teamID, leagueID, season).split("-")[0],
	    			// 	"losses": getLeagueRecord(team.teamID, leagueID, season).split("-")[0],
	    			// 	"finish": getOverallRank(team.teamID, leagueID, season),
	    			// 	"season": season
	    			// }

	    			for (var t = 0; t < teams.length; t++) {
	    				var team = teams[t];
	    				if (team.leagueID !== leagueID) break;
	    				if (team.seasons.indexOf(season) < 0) continue;

	    				var ranking;
	    				
	    				if (season === currentSeason) {
	    					ranking = "*"
	    				} else {
	    					ranking = getOverallRank(team.teamID, leagueID, season)
	    				}
	    				
	    				var seasonSet = {
		    				"teamID": team.teamID,
		    				"leagueID": leagueID,
		    				"wins": getSeasonRecord(team.teamID, leagueID, season).split("-")[0],
		    				"losses": getSeasonRecord(team.teamID, leagueID, season).split("-")[1],
		    				"finish": ranking,
		    				"season": season,
		    				"playoffs": getPlayoffAppearance(team.teamID, leagueID, season)
		    			}
		    			team.historicalRecords.seasons.push(seasonSet);
	    			}
    			}

				sessionStorage.setItem('leagues', JSON.stringify(leagues));
				sessionStorage.setItem('teams', JSON.stringify(teams));
				sessionStorage.setItem('trophyWinners', JSON.stringify(trophies));
				sessionStorage.setItem('trophies', JSON.stringify(trophyDetails));
			}
		} else {// Using sessionStorage to make it faster. Must JSON.parse twice because browsers only store locally as Strings
			leagues = JSON.parse(JSON.parse(sessionStorage.leagues));
			teams = JSON.parse(JSON.parse(sessionStorage.teams));
			trophies = JSON.parse(JSON.parse(sessionStorage.trophyWinners));
			trophyDetails = JSON.parse(JSON.parse(sessionStorage.trophies));
			currentSeason = JSON.parse(sessionStorage.currentSeason) || currentSeason;
		}

		$('.season-switcher').each(function () {
			$('div[data-season]').attr('data-season', currentSeason);
			if ($(this).children().length > 0) return;
			var league = $(this).attr('data-league');
			var seasons;
			if ($(this).attr('data-team')) {
				seasons = getTeam($(this).attr('data-team')).seasons;
			} else {
				seasons = findLeagueSeasons(league);
			}

			$(this).append('<span>Season: </span><select class="switch" />');

			for (var s = 0; s < seasons.length; s++) {
				var season = seasons[s];
				var selected = (parseInt(season) === parseInt(currentSeason)) ? ' selected="selected"' : "";
				$(this).find('.switch').append('<option value="'+ season +'"'+ selected +'>'+ season +'</option>');
			}

			if (seasons.length === 1) {
				$('div[data-season]').attr('data-season', seasons[0]);
				$(this).find('.switch').prop('disabled', 'disabled');
				return;
			}

			$(this).find('.switch').change(function(e) {
				$('div[data-season]').attr('data-season', $(this).val());

				$('div[data-season]').each(function() {
					if ($(this).children()) {
						$(this).children().fadeOut(200).remove();
					}
				});

				currentSeason = $(this).val();
				sessionStorage.setItem('currentSeason', currentSeason);
				currentWeek = getCurrentWeek(league, currentSeason);
				$('body').trigger('dataReady');
			});
		});

		currentWeek = getCurrentWeek("1", currentSeason);
    	
    	$('.standings').each(function() {
			var season = $(this).attr('data-season');
			var leagueID;
			if ($(this).attr('data-team')) {
				var team = getTeam($(this).attr('data-team'));
				leagueID = team.leagueID;
			} else {
				leagueID = $(this).attr('data-league');
			}
	    	var stands = findLeagueStandings(leagueID, season);

	    	if ($(this).attr('data-type') === "h2h") {
	    		stands = findTeamHeadToHeadStandings(team.teamID)
	    	}
				
			$(this).append('<table class="dataTable" />');
			var table = $(this).find('table');
			table.append('<thead /><tbody />');
			if ($(this).attr('data-type') === "h2h") {
				table.find('tbody').append('<tr><th class="team">Team</th><th class="wins">W</th><th class="losses">L</th><th class="wPct">Pct</th><th class="points">Points</th><th class="pointsAgainst">Pts. Against</th><th class="playoffWins">Playoff Wins</th><th class="playoffLosses">Playoff Losses</th></tr>');
			} else {
				table.find('thead').append('<tr class="super"><th colspan="3"></th><th colspan="3">Overall</th><th></th><th colspan="3">League</th></tr>');
				table.find('thead').append('<tr><th class="rank">Rank</th><th class="team">Team</th><th class="league">Conference</th><th class="oWins">W</th><th class="oLosses">L</th><th class="oWPct">Pct</th><th class="points">Points</th><th class="lWins">W</th><th class="lLosses">L</th><th class="lWPct">Pct</th><th class="draft">Drafted</th></tr>');
			}

			for (var i = 0; i < stands.length; i++) {
				var rank = stands[i];
				var team = getTeam(rank.teamID);
				var conference = findLeagueConference(rank.conferenceID, leagueID, season);
				var teamPhoto = getTeamPhoto(rank.teamID);
				var teamLink = getTeamLink(rank.teamID, season);

				if ($(this).attr('data-type') === "h2h") {
					table.find('tbody').append('<tr class="team'+team.teamID+'"><td class="team">'+teamPhoto + getTeamLink(rank.teamID, null)+'</td><td class="wins">'+rank.wins+'</td><td class="losses">'+rank.losses+'</td><td class="wPct">'+rank.winPct+'</td><td class="points">'+rank.pointsScored.toFixed(2)+'</td><td class="pointsAgainst">'+rank.pointsAgainst.toFixed(2)+'</td><td class="playoffWins">'+rank.playoffWins+'</td><td class="playoffLosses">'+rank.playoffLosses+'</td></tr>');
				} else {
					table.find('tbody').append('<tr class="team'+team.teamID+' '+conference.conferenceName+'"><td class="rank">'+rank.overallRank+'</td><td class="team">'+teamPhoto + teamLink+'</td><td class="league">'+conference.conferenceName+'</td><td class="oWins">'+rank.wins+'</td><td class="oLosses">'+rank.losses+'</td><td class="oWPct">'+rank.winPct+'</td><td class="points">'+rank.pointsScored.toFixed(2)+'</td><td class="lWins">'+rank.leagueWins+'</td><td class="lLosses">'+rank.leagueLosses+'</td><td class="lWPct">'+rank.leagueWinPct+'</td><td class="draft">'+ rank.draftPosition +'</td></tr>');
				}
			}
			
			if ($(this).attr('data-team')) {
				var team = $(this).attr('data-team');
				$(this).find('.team'+team).addClass('highlight');
			}
			
			$(this).fadeTo(500,1.0);
    	});
    	
    	
    	$('.power').each(function() {
			var season = $(this).attr('data-season');
			var leagueID = $(this).attr('data-league')
	    	var stands = findLeagueStandings(leagueID, season).slice(0);
				
			stands.sort(function(a,b) {
				return sorting(a.allPlayWinPct,b.allPlayWinPct) || sorting(a.pointsScored,b.pointsScored);
			});
			
			$(this).append('<table class="dataTable" />');
			var table = $(this).find('table');
			table.append('<thead /><tbody />');
			table.find('thead').append('<tr><th class="rank">Rank</th><th class="team">Team</th><th class="league">Conference</th><th class="leagueWinPct">All Play Pct</th><th class="points">Points Average</th><th class="pointsAgainst">Points Against Average</th>');
			
			for (var i = 0; i < stands.length; i++) {
				var rank = stands[i];
				var team = getTeam(rank.teamID);
				var conference = findLeagueConference(rank.conferenceID, leagueID, season);
				var teamPhoto = getTeamPhoto(rank.teamID);
				var teamLink = getTeamLink(rank.teamID, season);
				var powerRank = i+1;
				rank["powerRank"] = powerRank;
				
				table.find('tbody').append('<tr class="team'+team.teamID+' '+conference.conferenceName+'"><td class="rank">'+powerRank+'</td><td class="team">'+teamPhoto + teamLink+'</td><td class="league">'+conference.conferenceName+'</td><td class="leagueWinPct">'+rank.allPlayWinPct+'</td><td class="points">'+ getTeamPointsAverage(rank.teamID, leagueID, season) +'</td><td class="pointsAgainst">'+ getTeamPointsAgainstAverage(rank.teamID, leagueID, season) +'</td></tr>');
				
				$(this).find('.team'+team.teamID+' .teamLink').append(' <span class="record">('+rank.wins+'-'+rank.losses+')</span>');
			}
			
			if ($(this).attr('data-team')) {
				var team = $(this).attr('data-team');
				$(this).find('.team'+team).addClass('highlight');
			}
			
			$(this).fadeTo(500,1.0);
    	});
		    	
		$('.schedule').each(function() {
			// Note: using sched var so we can filter off of data-*
			var sched = [];
			var fullSchedule = false;
			var individualSchedule = false;
			var nextWeeksSchedule = false;
			var season = $(this).attr('data-season');
			var leagueID = $(this).attr('data-league') || "1";
			
			if ($(this).attr('data-team') && $(this).attr('data-type') === 'next') {
				var team = $(this).attr('data-team');
				sched = getTeamsWeeklyMatchup(team, "next", leagueID, season);
				$(this).addClass('individual next');
				var individualSchedule = true;
				var nextWeeksSchedule = true;
			} else if ($(this).attr('data-team')) {
				var team = $(this).attr('data-team');
				var leagueID = getTeam(team).leagueID
				sched = findTeamSchedule(team, leagueID, season);
				$(this).addClass('individual');
				var individualSchedule = true;
			} else if ($(this).attr('data-type') === 'next') {
				var sched = getWeekSchedule(currentWeek, leagueID, season);
			} else if ($(this).attr('data-type') === 'matchup') {
				var week = $(this).attr('data-week');
				var team1 = $(this).attr('data-team1');
				var team2 = $(this).attr('data-team2');
				var sched = getMatchup(team1, team2, week, leagueID, season);
			}  else if ($(this).attr('data-type') === 'full') {
				// Full Schedule
				var sched = findLeagueSchedule(leagueID, season);	
				fullSchedule = true;
				$(this).prepend('<div class="weeklyFilter"><ul /></div>');
			}

			if (!sched) return;
			
			for (var i = 0; i < sched.length; i++) {
				var game = sched[i];
				var week = game.week;
				var leagueID = game.leagueID;
				var conference = findLeagueConference(game.conferenceID, leagueID, season);
				var awayTeam = getTeam(game.awayTeam);
				var awayTeamScore = parseFloat(game.awayTeamScore);
				var awayTeamProjection = parseFloat(getTeamProjection(awayTeam.teamID, week, leagueID, season));
			    var awayTeamRecord = getTeamRecord(game.awayTeam, leagueID, season);
				var homeTeam = getTeam(game.homeTeam);
				var homeTeamScore = parseFloat(game.homeTeamScore);
				var homeTeamProjection = parseFloat(getTeamProjection(homeTeam.teamID, week, leagueID, season));
			    var homeTeamRecord = getTeamRecord(game.homeTeam, leagueID, season);

			    var conferenceStyle = (conference) ? " conferenceGame" : " nonConferenceGame";
			    
			    var weekLength = $(this).find('#week'+ week).length;
			    if (weekLength > 0) {
			        $(this).find('#week'+ week).append('<div class="game game'+i+conferenceStyle+'" />');
			    } else {
			    	if (individualSchedule && nextWeeksSchedule) {
			        	$(this).append('<div id="week'+ week +'" class="week"><h2>Next Matchup <span>Week ' + week + '</span></h2></div>');
			    	} else {
				    	$(this).append('<div id="week'+ week +'" class="week"><h2>Week ' + week + '</h2></div>');
			    	}
			        if (fullSchedule) {
				        $(this).find('.weeklyFilter ul').append('<li><a href="#week'+ week +'" class="weekLink">Week '+ week +'</a></li>');
					}
			        $(this).find('#week'+ week).append('<div class="game game'+i+conferenceStyle+'" />');
			    }
			    
			    var gameDiv = $(this).find('.game'+i);
			    
			    gameDiv.append('<div class="awayTeam" /><div class="homeTeam" />');
			    gameDiv.find('.awayTeam').append(getTeamPhoto(awayTeam.teamID));
			    gameDiv.find('.awayTeam').append('<a href="'+awayTeam.link+'" class="teamName" title="'+awayTeam.teamName[season]+' ('+awayTeamRecord+')">'+awayTeam.teamName[season]+' <span class="record">( '+awayTeamRecord+' )</span></a>');
			    
			    if (isNaN(awayTeamScore)) {
			    	awayTeamScoreText = '-';
			    } else {
			    	awayTeamScoreText = awayTeamScore.toFixed(2);
			    }
			    
			    gameDiv.find('.awayTeam').append('<span class="score">'+awayTeamScoreText+'</span>');
			    
			    if (!isNaN(awayTeamProjection)) {
			    	gameDiv.find('.awayTeam .score').append('<span class="projected">( '+awayTeamProjection+' )</span>');   
			    }
			    
			    gameDiv.find('.homeTeam').append(getTeamPhoto(homeTeam.teamID));
			    gameDiv.find('.homeTeam').append('<a href="'+homeTeam.link+'" class="teamName" title="'+homeTeam.teamName[season]+' ('+homeTeamRecord+')">'+homeTeam.teamName[season]+' <span class="record">( '+homeTeamRecord+' )</span></a>');
			    
			    if (isNaN(homeTeamScore)) {
			    	homeTeamScoreText = '-';
			    } else {
			    	homeTeamScoreText = homeTeamScore.toFixed(2);
			    }
			    gameDiv.find('.homeTeam').append('<span class="score">'+homeTeamScoreText+'</span>');
			    
			    if (!isNaN(homeTeamProjection)) {
			    	gameDiv.find('.homeTeam .score').append('<span class="projected">( '+homeTeamProjection+' )</span>');   
			    }
			    
			    if (homeTeamScore > awayTeamScore) {
				    gameDiv.find('.homeTeam').addClass('boom');
				    gameDiv.find('.awayTeam').addClass('loser');
			    } else if (homeTeamScore < awayTeamScore) {
				    gameDiv.find('.awayTeam').addClass('boom');
				    gameDiv.find('.homeTeam').addClass('loser');
			    }
			    
			    // List Style Matchup Stats
				var awayTeamLeague = findLeagueConference(awayTeam.conferenceID[season], leagueID, season);
				var awayTeamRank = getOverallRank(game.awayTeam, leagueID, season);
				var awayTeamLeagueRank = getLeagueRank(game.awayTeam, leagueID, season);
				var awayTeamPoints = getTeamPoints(game.awayTeam, leagueID, season);
				var awayTeamAverage = getTeamPointsAverage(game.awayTeam, leagueID, season);
				var awayTeamPerformance = getTeamPerformance(game.awayTeam, leagueID, season);
				var awayTeamTrophies = getTeamTrophies(game.awayTeam);
				
				var homeTeamLeague = findLeagueConference(homeTeam.conferenceID[season], leagueID, season);
				var homeTeamRank = getOverallRank(game.homeTeam, leagueID, season);
				var homeTeamLeagueRank = getLeagueRank(game.homeTeam, leagueID, season);
				var homeTeamPoints = getTeamPoints(game.homeTeam, leagueID, season);
				var homeTeamAverage = getTeamPointsAverage(game.homeTeam, leagueID, season);
				var homeTeamPerformance = getTeamPerformance(game.homeTeam, leagueID, season);
				var homeTeamTrophies = getTeamTrophies(game.homeTeam);
				
				gameDiv.append('<ul class="compare key"><li>League</li><li>Overall Rank</li><li>League Rank</li><li>Total Points</li><li>Weekly Average</li><li>Performance</li><li>Trophies</li></ul>')
				
				gameDiv.find('.awayTeam').append('<ul class="compare"><li>'+awayTeamLeague.conferenceName+'</li><li>'+awayTeamRank+'</li><li>'+awayTeamLeagueRank+'</li><li>'+awayTeamPoints+'</li><li>'+awayTeamAverage+'</li><li>'+awayTeamPerformance+'</li><li>'+awayTeamTrophies.length+'</li></ul>');
				
				gameDiv.find('.homeTeam').append('<ul class="compare"><li>'+homeTeamLeague.conferenceName+'</li><li>'+homeTeamRank+'</li><li>'+homeTeamLeagueRank+'</li><li>'+homeTeamPoints+'</li><li>'+homeTeamAverage+'</li><li>'+homeTeamPerformance+'</li><li>'+homeTeamTrophies.length+'</li></ul>');
			}
			
			if ($(this).attr('data-style')) {
				var scheduleStyle = $(this).attr('data-style');
				$(this).addClass(scheduleStyle);
				if (fullSchedule) {
					$(this).find('.weeklyFilter ul').append('<li><a href="#" class="scheduleLink" data-style="block">Block</a></li><li><a href="#" class="scheduleLink" data-style="list">List</a></li>');
					$('.scheduleLink[data-style="'+scheduleStyle+'"]').addClass('selected');
				}
				
				$('.list .game').click(function() {
				    $(this).find('.compare').slideToggle(400);
				});

				if ($(this).attr('data-type') === 'matchup') {
					$(this).find('.compare').show();
				}
			}
			
			var $top = 0;
	 		var filterTop = 272;
			
			$(window).scroll(function() {
	 		    $top = $(window).scrollTop();
	 		 
	 		    if($top <= filterTop) {
	 		     	$(".weeklyFilter").removeClass('fixed');
	 		    }
	 		    if($top >= filterTop) {
	 		     	$(".weeklyFilter").addClass('fixed');
	 		    }
	 		    
	 		});
			
			$('.weeklyFilter .scheduleLink').click(function(e) {
					$('.weeklyFilter .scheduleLink').removeClass('selected');
					$(this).addClass('selected');
					var linkType = $(this).attr('data-style');
					$(this).parents('.schedule').removeClass('block list').addClass(linkType);
			
					if (linkType === "list") {
						$('.list .game').click(function() {
						    $(this).find('.compare').slideToggle(400);
						});
					} else {
						$('.game .compare').slideUp(100);
						$('.game').off();
					}
					
					e.preventDefault();
			});
			
			$('.weeklyFilter .weekLink').click(function() {
					$('.weeklyFilter .weekLink').removeClass('selected');
					$(this).addClass('selected');
			});
			
			$.localScroll({
			    lazy:true,
			    duration: 300
			 });
			
			$(this).fadeTo(500,1.0);
		});
    	
    	
    	$('.projections').each(function() {
			var week = $(this).attr('data-week');
			var season = $(this).attr('data-season');
			var leagueID = $(this).attr('data-league') || "1";
	    	var projected = findWeeklyProjections(leagueID, season, week);
				
			$(this).append('<table class="dataTable" />');
			var table = $(this).find('table');
			table.append('<thead /><tbody />');
			table.find('thead').append('<tr><th class="rank">Rank</th><th class="team">Team</th><th class="league">Conference</th><th class="points">Projected Points</th></tr>');
			
			for (var i = 0; i < projected.length; i++) {
				var rank = projected[i];
				var team = getTeam(rank.teamID);
				var conference = findLeagueConference(team.conferenceID[season], leagueID, season);
				var teamPhoto = getTeamPhoto(rank.teamID);
				var teamLink = getTeamLink(rank.teamID, season);
				
				table.find('tbody').append('<tr class="team'+team.teamID+' '+conference.conferenceName+'"><td class="rank">'+(i+1)+'.</td><td class="team">'+teamPhoto + teamLink+'</td><td class="league">'+conference.conferenceName+'</td><td class="points">'+rank["week"+week]+'</td></tr>');
			}
			
			$(this).fadeTo(500,1.0);
    	});
		
		$('.cards').each(function() {
			var cards = [];
			var individual = false;
			var season = $(this).attr('data-season');
			var leagueID = $(this).attr('data-league');
			
			if ($(this).attr('data-team')) {
				var teamID = $(this).attr('data-team');
				cards.push(getTeam(teamID));	
				$(this).addClass('single');
				var individual = true;
			} else {
				var cards = (season) ? findLeagueTeams(leagueID, season) : teams;
			}
		
			for (var t = 0; t < cards.length; t++) {
				var owner = cards[t];
				var teamID = owner.teamID;
				leagueID = owner.leagueID;
				var conferenceID = owner.conferenceID[season];
				var conference = findLeagueConference(conferenceID, leagueID, season);
				var teamName = owner.teamName[season];
				var teamOwner = owner.teamOwner;
				var teamPhoto = getTeamPhoto(teamID);
				var twitterID = owner.twitter;
				var espnLink = 'http://games.espn.go.com/ffl/clubhouse?leagueId='+owner.espnLeague+'&teamId='+owner.espnTeam+'&seasonId='+season;
				var teamStandings = findTeamStandings(teamID, leagueID, season);
				
				$(this).append('<div class="team'+(t+1)+' card '+ conference.conferenceName +'" />');
				var card = $(this).find('.team'+(t+1));
				card.append(teamPhoto);
				card.append('<h1><a href="'+owner.link+'">'+teamName+'</a></h1>');
				card.append('<h3>'+teamOwner+'</h3>');
				
				if (individual) {
					if (twitterID) {
						card.find('h3').append('<a href="http://twitter.com/'+twitterID+'" class="twitter">@'+twitterID+'</a>');
					}
					card.find('h3').append('<a href="'+espnLink+'" class="espn"></a>');
				}
				
				card.append('<h5 class="league">Sport Ngin '+conference.conferenceName+'</h5>');
				
				if (teamStandings.overallRank) {
					card.append('<ul class="ranks"><li>'+teamStandings.overallRank+'<span>Overall Rank</span></li><li>'+teamStandings.leagueRank+'<span>League Rank</span></li></ul>');
				}

				card.append('<ul class="stats" />');
				var stats = card.find('.stats');
				var record = getTeamRecord(teamStandings);
				stats.append('<li class="record">'+record+'<span class="cat">' + season + ' Record</span></li>');
				
				var pointsScored = teamStandings.pointsScored.toFixed(1);
				stats.append('<li class="points">'+pointsScored+'<span class="cat">Points</span></li>');
				
				if (individual) {
					stats.append('<li class="weeklyAverage">'+getTeamPointsAverage(teamID, leagueID, season)+'<span class="cat">Weekly Avg</span></li>');
					stats.append('<li class="performance">'+getTeamPerformance(teamID, leagueID, season)+'<span class="cat">Performance</span></li>');
				}
				
				var teamTrophies = getTeamTrophies(teamID);
				var trophyText = (teamTrophies.length === 1) ? 'Trophy' : 'Trophies';
				stats.append('<li class="trophies">'+teamTrophies.length+'<span class="cat">'+trophyText+'</span></li>');
				
				if (individual) {
					stats.append('<li class="overallRecord">'+getOverallRecord(teamID)+'<span class="cat">Career Record</span></li>');
					stats.append('<li class="playoffAppearances">'+owner.historicalRecords.madePlayoffs+'<span class="cat">Playoff Apperances</span></li>');
					stats.append('<li class="playoffRecord">'+getPlayoffRecord(teamID)+'<span class="cat">Playoff Record</span></li>');
					//stats.append('<li class="overallRank">'+overallRank+'<span class="cat">Overall Rank</span></li>');
					//stats.append('<li class="leagueRank">'+leagueRank+'<span class="cat">League Rank</span></li>');
				}
			}
			
			$('.cards .card').each(function() {
				var cardImage = $(this).find('img');
				var header = $(this).find('h1');
				cardImage.load(function() {
					if (header.height() > parseInt(header.css('line-height'), 10)) {
						header.addClass('wrapped');
					}
				});
			});
			    		
			$(this).fadeTo(500,1.0);
		});
		
    	$('.trophy').each(function() {
    		if ($(this).children().length > 0) return;
			var leagueID = $(this).attr('data-league') ? $(this).attr('data-league') : "1";
			var trophyList = [];
			
			if ($(this).attr('data-team')) {
				var teamID = $(this).attr('data-team');
				trophyList = getTeamTrophies(teamID);
			} else if ($(this).attr('data-week')) {
				var week = $(this).attr('data-week');
				var season = $(this).attr('data-season');
				trophyList = getWeeklyTrophies(week, season, leagueID)
			} else {
	    		trophyList = trophies;
	    	}
	    	
	    	$(this).append('<ul class="trophyList" />');
	    	var list = $(this).find('.trophyList');
	    	
	    	if (trophyList.length === 0) {
		    	list.append('<h3>No Trophies earned yet</h3>');
	    	} 
	    	
			for (var i = 0; i < trophyList.length; i++) {
				var trophy = trophyList[i];
				var team = getTeam(trophy.teamID);
				//var conference = (trophy.conferenceID) ? findLeagueConference(trophy.conferenceID, trophy.leagueID, trophy.season) : ;
				var league = getLeague(trophy.leagueID);
				var trophyDeets = getTrophyDetails(trophy.trophyID); 
				var trophyName = trophyDeets.trophyName;
				var trophyDescription = trophyDeets.description;
				var earned = trophy.earned;
				var trophyNameCC = trophyName.replace(/ /g, '');
				var trophyNameCC = trophyNameCC.replace(/\'/g, '');
				var trophyNameCC = trophyNameCC.charAt(0).toLowerCase() + trophyNameCC.slice(1);
				
				list.append('<li class="'+trophyNameCC+'"><span class="trophyWrap"><h2>'+trophyName+'</h2><h3>'+trophyDescription+'</h3><h4>Earned in '+earned+'</h4><h5 class="league">'+league.leagueName+'</h5></span></li>');
				
				if ($(this).attr('data-week')) {
					var teamPhoto = getTeamPhoto(trophy.teamID);
					list.find('.'+trophyNameCC).last().append(teamPhoto);
				}
			}
			
			$(this).fadeTo(500,1.0);
    	});
    	
    	$('.history').each(function() {
    		if ($(this).children().length > 0) return;
	    	var historyList = [];
			
			if ($(this).attr('data-team')) {
				var teamID = $(this).attr('data-team');
				historyList = findTeamHistory(teamID);
				
				historyList.sort(function(a,b) {
					return sorting(a.season,b.season);
				});
			} else {
	    		historyList = history;
	    	}
	    	
	    	if (historyList.length > 0) {
				$(this).append('<table class="dataTable" />');
				var table = $(this).find('table');
				table.append('<thead /><tbody />');
				table.find('thead').append('<tr><th>Year</th><th>League</th><th>Record (Finish)</th></tr>');
	    	} else {
		    	$(this).append('<h3>Rook Ass Noob</h3>');
	    	}
	    	
			for (var i = 0; i < historyList.length; i++) {
				var item = historyList[i];
				var team = getTeam(item.teamID);
				var league = getLeague(item.leagueID);
				var record = item.wins + '-' + item.losses;
				var rank = parseInt(item.finish);
				var madePlayoffs = (item.playoffs) ? '<sup class="madePlayoffs">$$</sup>' : '';
	    
				if (isNaN(rank)) {
					rank = "*"
				} else if (rank === 1 || rank === 21) {
				    rank += 'st'
				} else if (rank === 2 || rank === 22) {
				    rank += 'nd'
				} else if (rank === 3 || rank === 23) {
				    rank += 'rd'
				} else {
				    rank += 'th'
				}
				
				table.find('tbody').prepend('<tr><td>'+item.season+'</td><td>'+league.leagueName+'</td><td>'+record+' <span class="rank">('+rank+')</span>'+madePlayoffs+'</td></tr>');
			}
			
			$(this).find('table').after('<small>$$ - Made Playoffs</small>');

			$(this).fadeTo(500,1.0);
    	});
    	
    	$('.records').each(function() {
    		var record = $(this).attr('data-record');
    		var leagueID = $(this).attr('data-league');
    		var show = parseInt($(this).attr('data-show')) || 5;

    	    var records = []; // array used for table
    	    var categories = [];

    		var league = leagues[leagueID-1];
    		
    		$(this).append('<table class="dataTable" />');

    		for (var s = 0; s < league.season.length; s++) {
    			var season = league.season[s];
    			
    			if (record === "highest" || record === "lowest") {
    				var seasonScores = league.seasons[season].scores;
    				for (var i = 0; i < seasonScores.length; i++) {
    					var teamScore = seasonScores[i];
    					for(var score in teamScore) {
						    if (score !== 'teamID' && score !== 'leagueID' && score !== 'season' && !isNaN(parseFloat(teamScore[score])) ) {
						    	var weekName = score[0].toUpperCase() + score.slice(1,4) + ' ' + score.slice(4);
		    					records.push({'teamID': teamScore.teamID, 'score': teamScore[score], 'week': weekName, 'season': teamScore.season});
						    }
						}
    				}
    			} else if (record === "highestMargin" || record === "lowestMargin") {
                    var seasonSchedule = league.seasons[season].schedule;
                    records = records.concat(scoringMarginsForSchedule(seasonSchedule));
                }
    		}

    		if (record === "wins" || record === "winpct") {
				for (var t = 0; t < teams.length; t++) {
					var team = teams[t];
					var winpct = parseInt(team.historicalRecords.wins)/(parseInt(team.historicalRecords.wins)+parseInt(team.historicalRecords.losses))
					if (isNaN(winpct)) {
						winpct = 0;
					}	
					records.push({'teamID': team.teamID, 'wins': team.historicalRecords.wins, 'losses': team.historicalRecords.losses, 'winpct': winpct.toFixed(3), "seasons" : team.historicalRecords.seasons.length });
				}
    		}
    		
    		switch (record) {
    			case "highest" : {
					// Sort scores	
					records.sort(function(a,b) {
					    return sorting(a.score,b.score)
					});
					$(this).prepend('<h1>Highest Score</h1>');
					categories = ["teamID", "score", "week", "season"];
    			} 
    			break;
    			case "lowest" : {
					// Sort scores	
					records.sort(function(b,a) {
					    return sorting(a.score,b.score)
					});
					$(this).prepend('<h1>Lowest Score</h1>');
					categories = ["teamID", "score", "week", "season"];
    			}
    			break;
                case "highestMargin" : {
                    // Sort scores  
                    records.sort(function(a,b) {
                        return sorting(a.difference,b.difference)
                    });
                    $(this).prepend('<h1>Highest Winning Margin</h1>');
                    categories = ["winner", "loser", "score", "difference", "week", "season"];
                } 
                break;
                case "lowestMargin" : {
                    // Sort scores  
                    records.sort(function(b,a) {
                        return sorting(a.difference,b.difference)
                    });
                    $(this).prepend('<h1>Lowest Winning Margin</h1>');
                    categories = ["winner", "loser", "score", "difference", "week", "season"];
                } 
                break;
    			case "winpct" : {
					$(this).prepend('<h1>All-time Winning Percentage</h1>');
					// Sort scores	
					records.sort(function(a,b) {
					    return sorting(a.winpct,b.winpct)
					});
					categories = ["teamID", "winloss", "winpct", "seasons"];
    			}
    			break;
    			case "wins" : {
					$(this).prepend('<h1>All-time Wins</h1>');
					records.sort(function(a,b) {
					    return sorting(a.wins,b.wins)
					});
					categories = ["teamID", "wins", "seasons"];
    			}
    			break;
    			default: 
    		}
			recordsTable(records, record, categories);

    		function recordsTable(arraySet, record, categoriesArr) {
    			var recordsTable = $('[data-record='+ record +'] .dataTable');
    			recordsTable.append('<thead /><tbody />');
    			recordsTable.find('thead').append('<tr />');
    			for (var j = 0; j < categoriesArr.length; j++) {
    				var category = categoriesArr[j];
					recordsTable.find('thead tr').append('<th class="'+category+'">'+category[0].toUpperCase() + category.slice(1)+'</th>');
    			}
    			for (var i = 0; i < show; i++) {
    				var recordTeam = arraySet[i];
    				recordsTable.find('tbody').append('<tr class="record'+i+'" />');
    				for (var j = 0; j < categoriesArr.length; j++) {
						var category = categoriesArr[j];
						if (category === "teamID" || category === "winner" || category === "loser") {
							var seas = recordTeam.season ? recordTeam.season : null;
							recordsTable.find('.record'+i).append('<td class="team">'+getTeamPhoto(recordTeam[category])+getTeamLink(recordTeam[category], seas)+'</td>');
						} else if (category === "winloss") {
							recordsTable.find('.record'+i).append('<td class="'+category+'">'+recordTeam.wins+'-'+recordTeam.losses+'</td>');
						} else {
							recordsTable.find('.record'+i).append('<td class="'+category+'">'+recordTeam[category]+'</td>');
						}
					}
    			}
    		}
    	
    	});

        $('.margins').each(function() {
            var leagueID = $(this).attr('data-league');
            var season = $(this).attr('data-season');
            var week = $(this).attr('data-week');

            var weeklyScores = getWeekSchedule(week, leagueID, season);
            var margins = scoringMarginsForSchedule(weeklyScores);
            var sorting = $(this).attr('data-sort');
        });
    	
    	
    	$('.playoffs').each(function() {
    		var leagueID = $(this).attr('data-league');
    		var season = $(this).attr('data-season');
    		var playoffInfo = findLeaguePlayoffs(leagueID, season);
    		if (!playoffInfo.rounds.length) return;
    		var league = getLeague(leagueID);
    		var playoffConferences = league.seasons[season].conferences;
			
			// Rounds (weeks) of playoffs before Super Bowl. Either is 2 or 3.
			var rounds = playoffInfo.rounds.length;

			for (var c = 0; c < playoffConferences.length; c++) {
				var conference = playoffConferences[c];
				var side = (c === 0) ? "left" : "right";
				$(this).append('<div class="bracket '+side+'" data-conference="'+conference.conferenceID+'" data-rounds="'+(rounds-1)+'" />');
			}
			
    		$('.bracket.left').after('<div class="championship"></div>');
			
			$('.bracket').each(function(i) {
				var conferenceID = $(this).attr('data-conference');
				var conferenceInfo = playoffConferences[i];
				$(this).append('<h1>'+ conferenceInfo.conferenceName +'</h1>');
				
				for (var j = 0; j < rounds; j++) {
					var round = playoffInfo.rounds[j];
					if (round.roundType === "finals") break;

					$(this).append('<div class="round round'+j+'" />');
					var roundDiv = $(this).find('.round'+j);
					roundDiv.append('<h1>Round '+round.round+'</h1>');
					var roundSchedule = round.conferenceSchedule[conferenceID];
					
					for (var k = 0; k < roundSchedule.length; k++) {
						var game = roundSchedule[k]
						roundDiv.append('<div class="game game'+(k+1)+'"></div>');
						var aGame = roundDiv.find('.game'+(k+1));
						
						var homeSeed = game.homeSeed;
						if (homeSeed) {
							var homeSeedScore = parseFloat(game.homeSeedScore);
							var homeTeam = findPlayoffTeam(conferenceID, homeSeed, leagueID, season);
							var homeTeamRecord = getTeamRecord(homeTeam.teamID, leagueID, season);
						
							aGame.append('<div class="homeTeam" />');
							aGame.find('.homeTeam').append('<span class="seed">'+homeSeed+'</span>');
							aGame.find('.homeTeam').append(getTeamPhoto(homeTeam.teamID));
							aGame.find('.homeTeam').append('<a href="'+homeTeam.link+'" class="teamName" title="'+homeTeam.teamName[season]+' ('+homeTeamRecord+')">'+homeTeam.teamName[season]+' <span class="record">( '+homeTeamRecord+' )</span></a>');
							
							if (isNaN(homeSeedScore)) {
							    homeSeedScore = '-';
							} else {
							    homeSeedScore = homeSeedScore.toFixed(1);
							}
							
							aGame.find('.homeTeam').append('<span class="score">'+homeSeedScore+'</span>');
						}
						
						var awaySeed = game.awaySeed;
						if (awaySeed) {
							var awaySeedScore = parseFloat(game.awaySeedScore);
							var awayTeam = findPlayoffTeam(conferenceID, awaySeed, leagueID, season);
							var awayTeamRecord = getTeamRecord(awayTeam.teamID, leagueID, season);
						
							aGame.append('<div class="awayTeam" />');
							aGame.find('.awayTeam').append('<span class="seed">'+awaySeed+'</span>');
							aGame.find('.awayTeam').append(getTeamPhoto(awayTeam.teamID));
							aGame.find('.awayTeam').append('<a href="'+awayTeam.link+'" class="teamName" title="'+awayTeam.teamName[season]+' ('+awayTeamRecord+')">'+awayTeam.teamName[season]+' <span class="record">( '+awayTeamRecord+' )</span></a>');
							
							if (isNaN(awaySeedScore)) {
							    awaySeedScore = '-';
							} else {
							    awaySeedScore = awaySeedScore.toFixed(1);
							}
							
							aGame.find('.awayTeam').append('<span class="score">'+awaySeedScore+'</span>');
						}

						if (parseInt(game.awaySeedScore) < parseInt(game.homeSeedScore)) {
							aGame.find('.homeTeam').addClass('boom');
						} else if (parseInt(game.awaySeedScore) > parseInt(game.homeSeedScore)) {
							aGame.find('.awayTeam').addClass('boom');
						}
						
						if (!awaySeed && !homeSeed) {
							aGame.addClass('TBD');
							aGame.append('<h1>TBD</h1>');
						}
					}
				}
			});

    		$('.championship').each(function() {
	    		$(this).append('<h1>Super Bowl</h1>');
	    		$(this).append('<div class="game" />');
	    		$(this).find('.game').append('<div class="champTeam leftTeam"></div><div class="champTeam rightTeam"></div>');
	    		
	    		var championshipGame = playoffInfo.rounds.last().championshipGame;
	    		var leftConference = $('.bracket.left').attr('data-conference');
	    		var rightConference = $('.bracket.right').attr('data-conference');

	    		var leftTeamSeed, rightTeamSeed, leftTeamScore, rightTeamScore;
	    		if (championshipGame.homeSeedConference) {
	    			if (championshipGame.homeSeedConference === leftConference) {
	    				leftTeamSeed = championshipGame.homeSeed;
	    				rightTeamSeed = championshipGame.awaySeed;
	    				leftTeamScore = championshipGame.homeSeedScore;
	    				rightTeamScore = championshipGame.awaySeedScore;
	    			} else {
	    				leftTeamSeed = championshipGame.awaySeed;
	    				rightTeamSeed = championshipGame.homeSeed;
	    				leftTeamScore = championshipGame.awaySeedScore;
	    				rightTeamScore = championshipGame.homeSeedScore;
	    			}
	    		} else if (championshipGame.awaySeedConference) {
	    			if (championshipGame.awaySeedConference === leftConference) {
	    				leftTeamSeed = championshipGame.awaySeed;
	    				rightTeamSeed = championshipGame.homeSeed;
	    				leftTeamScore = championshipGame.awaySeedScore;
	    				rightTeamScore = championshipGame.homeSeedScore;
	    			} else {
	    				leftTeamSeed = championshipGame.homeSeed;
	    				rightTeamSeed = championshipGame.awaySeed;
	    				leftTeamScore = championshipGame.homeSeedScore;
	    				rightTeamScore = championshipGame.awaySeedScore;
	    			}
	    		}

	    		var leftTeam = findPlayoffTeam(leftConference, leftTeamSeed, leagueID, season);
	    		var rightTeam = findPlayoffTeam(rightConference, rightTeamSeed, leagueID, season);
	    		var leftTeamRecord = getTeamRecord(leftTeam.teamID, leagueID, season);
	    		var rightTeamRecord = getTeamRecord(rightTeam.teamID, leagueID, season);

	    		var teamDiv = $('.leftTeam')
		    	teamDiv.append(getTeamPhoto(leftTeam.teamID));
		    	teamDiv.append('<a href="'+leftTeam.link+'" class="teamName" title="'+leftTeam.teamName[season]+' ('+leftTeamRecord+')">'+leftTeam.teamName[season]+' <span class="record">( '+leftTeamRecord+' )</span></a>');
		    	teamDiv.append('<div class="score">'+leftTeamScore+"</div>");

	    		teamDiv = $('.rightTeam')
		    	teamDiv.append(getTeamPhoto(rightTeam.teamID));
		    	teamDiv.append('<a href="'+rightTeam.link+'" class="teamName" title="'+rightTeam.teamName[season]+' ('+rightTeamRecord+')">'+rightTeam.teamName[season]+' <span class="record">( '+rightTeamRecord+' )</span></a>');
    			teamDiv.append('<div class="score">'+rightTeamScore+"</div>");
    		});
			
    	});
    	
    	$('#progress').css({'-webkit-animation':'none','animation':'none'}).animate({
		    width: '100%'
		}, 300, function() {
		    $(this).fadeOut(800);
		});
    });
    
    if (FFsession) $('body').trigger('dataReady');
		
   	function sorting(a, b) {
	    a = parseFloat(a);
	    b = parseFloat(b);
	    if (a > b) return -1;
	    if (a < b) return 1;
	    return 0;
	}

	function getLeagueScores(ID, year) {
	    var filter = scores.filter(function (el) {
	      return el.season == year && el.leagueID == ID;
	    });
	    return filter;
    }

	function getLeagueProjections(ID, year) {
	    var filter = projections.filter(function (el) {
	      return el.season == year && el.leagueID == ID;
	    });
	    return filter;
    }
	
    function getLeague(ID) {
	    var filter = leagues.filter(function (el) {
	      return el.leagueID == ID;
	    });
	    return filter[0];
    }
    
    function getLeagueSeasonTeams(ID, year) {
	    var filter = teams.filter(function (el) {
	    	return el.leagueID === ID && (el.seasons.indexOf(year) > -1);
	    });
	    return filter;
    }
    
    function getLeagueTeams(ID, year) {
	    var filter = teams.filter(function (el) {
	    	return el.leagueID === ID;
	    });
	    return filter;
    }
    
    function getLeagueStandings(ID, year) {
	    var filter = standings.filter(function (el) {
	      return el.leagueID == ID && el.season == year;
	    });
	    return filter;
    }
	
    function getLeagueConferences(ID, year) {
	    var filter = conferences.filter(function (el) {
	      return el.leagueID == ID && (el.seasons.indexOf(year) > -1);
	    });
	    return filter;
    }
    
    function getLeaguePlayoffs(ID, year) {
	    var filter = playoffs.filter(function (el) {
	      return el.leagueID == ID && el.season == year;
	    });
	    return filter;
    }
    
    function getLeaguePlayoffTeams(ID, year) {
	    var filter = playoffs.filter(function (el) {
	      return el.leagueID == ID && el.season == year;
	    });
	    return filter;
    }
    
    function getLeaguePlayoffScores(ID, year) {
	    var filter = playoffScores.filter(function (el) {
	      return el.leagueID == ID && el.season == year;
	    });
	    return filter;
    }
    
    function getLeaguePlayoffSchedule(ID, year) {
	    var filter = playoffSchedule.filter(function (el) {
	      return el.leagueID == ID && el.season == year;
	    });
	    return filter;
    }
    
    function getConferenceTeams(ID) {
	    var filter = teams.filter(function (el) {
	      return el.conferenceID == ID;
	    });
	    return filter;
    }
    
    function getConferenceStandings(seasonStandings, ID) {
	    var filter = seasonStandings.filter(function (el) {
	      return el.conferenceID == ID;
	    });
	    return filter;
    }
	
    function getConferenceSchedule(ID) {
	    var filter = schedule.filter(function (el) {
	      return el.conferenceID == ID;
	    });
	    return filter;
    }
	
    function getConferencePlayoffSchedule(ID) {
	    var filter = playoffSchedule.filter(function (el) {
	      return el.conferenceID == ID;
	    });
	    return filter;
    }
	
    function getConferencePlayoffRoundSchedule(conferenceID, round) {
	    var filter = playoffSchedule.filter(function (el) {
	      return el.conferenceID == conferenceID && el.round == round;
	    });
	    return filter;
    }
	
    function getPlayoffRoundSchedule(playoffsSchedule, round) {
	    var filter = playoffsSchedule.filter(function (el) {
	      return el.round == round;
	    });
	    return filter;
    }
	
    function getTeamSchedule(ID) {
	    var filter = schedule.filter(function (el) {
	      return el.awayTeam == ID || el.homeTeam == ID;
	    });
	    return filter;
    }
	
    function getLeagueSchedule(ID, year) {
	    var filter = schedule.filter(function (el) {
	      return el.leagueID == ID && el.season == year;
	    });
	    return filter;
    }
	
    function getWeekSchedule(week, leagueID, year) {
	    var filter = leagues[parseInt(leagueID) - 1].seasons[year].schedule.filter(function (el) {
	      return el.week == week;
	    });
	    return filter;
    }
	
    function getTeamsWeeklyMatchup(ID, week, leagueID, year) {
    	if (week === "next") {
    		week = getLastWeek(leagues[parseInt(leagueID) - 1].seasons[year].scores);
    	}
	    var filter = leagues[parseInt(leagueID) - 1].seasons[year].schedule.filter(function (el) {
	      return el.week == week;
	    });
	    var filter = filter.filter(function (el) {
	      return el.awayTeam == ID || el.homeTeam == ID;
	    });
	    return filter;
    }

    function getMatchup(team1, team2, week, leagueID, year) {
	    var filter = leagues[parseInt(leagueID) - 1].seasons[year].schedule.filter(function (el) {
	      return el.week == week && (el.awayTeam == team1 || el.homeTeam == team1) && (el.awayTeam == team2 || el.homeTeam == team2);
	    });
	    return filter;
    }
	
    function getCurrentWeek(leagueID, year) {
	    return leagues[parseInt(leagueID) - 1].seasons[year].latestWeek;
    }
	
    function getLastWeek(scoreSet) {
	    var sc = scoreSet[0]
    	var week = 1;
    	for (var prop in sc) {
    		if (prop !== 'leagueID' && prop !== 'season' && prop !== 'teamID')
	    	if (parseFloat(sc[prop])) week++
    	}
	    return week;
    }
        
	function getTeam(ID) {
	    var filter = teams.filter(function (el) {
	      return el.teamID == ID;
	    });
	    return filter[0];
	}
    
	function getTeamPhoto(ID) {
		if (ID == "TBA" || ID == undefined) {
			var filter = [{"link": "#", "photo":"default", "teamOwner": "TBA"}];
		} else {
	    	var filter = teams.filter(function (el) {
	    	  return el.teamID == ID;
	    	});
	    }
	    return '<a href="'+filter[0].link+'" class="teamPhoto"><img src="http://assets.ngin.com/site_files/4359/i/'+filter[0].photo+'.jpg" alt="'+filter[0].teamOwner+'" /></a>';
	}
        
	function getPlayoffTeam(conferenceID, seed, leagueID, year) {
	    var filter = playoffs.filter(function (el) {
	      return el.conferenceID == conferenceID && el.seed == seed && el.season == year;
	    });
	    
	    var team = getTeam(filter[0].teamID);
	    
	    return team;
	}
        
	function findPlayoffTeam(conferenceID, seed, leagueID, year) {
	    var filter = leagues[parseInt(leagueID) - 1].seasons[year].playoffs.teams.filter(function (el) {
	      return el.conferenceID == conferenceID && el.seed == seed && el.season == year;
	    });
	    
	    var team = getTeam(filter[0].teamID);
	    
	    return team;
	}
    
	function getTeamLink(ID, year) {
	    var filter = teams.filter(function (el) {
	      return el.teamID == ID;
	    });
	    var teamName = (year) ? filter[0].teamName[year] : filter[0].teamOwner;
	    return '<a href="'+filter[0].link+'" class="teamLink">'+teamName+'</a>';
	}

	function getTeamConference(teamID, season) {
	    var filter = teams.filter(function (el) {
	      return el.teamID == teamID;
	    });

	    return filter[0].seasons[season].conferenceID;
	}
    
	function getTeamWinningPercentage(ID, year) {
	    var filter = standings.filter(function (el) {
	      return el.teamID === ID && el.season === year;
	    });
	    
	    var wins = filter[0].wins;
	    var losses = filter[0].losses;
	    
	    if (!wins)
	    	wins = 0;
	    if (!losses)
	    	losses = 0;
	    	
	    if (wins == 0 && losses == 0) {
		    return (0).toFixed(3);
	    } else {
	    	return parseFloat((wins/(wins+losses))).toFixed(3);
	    }
	}
    
	function getLeagueRecord(ID) {
	    var filter = standings.filter(function (el) {
	      return el.teamID == ID;
	    });
	    
	    var wins = filter[0].leagueWins;
	    var losses = filter[0].leagueLosses;
	    
	    if (!wins)
	    	wins = 0;
	    if (!losses)
	    	losses = 0;
	    
	    return wins+'-'+losses;
	}
    
	function getSeasonRecord(ID, leagueID, year) {
	    var filter = standings.filter(function (el) {
	      return el.teamID === ID && el.leagueID === leagueID && el.season === year;
	    });
	    
	    var wins = filter[0].wins;
	    var losses = filter[0].losses;
	    
	    if (!wins)
	    	wins = 0;
	    if (!losses)
	    	losses = 0;
	    
	    return wins+'-'+losses;
	}
    
	function getLeagueWinningPercentage(ID, year) {
	    var filter = standings.filter(function (el) {
	      return el.teamID === ID && el.season === year;
	    });
	    
	    var wins = filter[0].leagueWins;
	    var losses = filter[0].leagueLosses;
	    
	    if (!wins)
	    	wins = 0;
	    if (!losses)
	    	losses = 0;
	    
	    if (wins == 0 && losses == 0) {
		    return (0).toFixed(3);
	    } else {
	    	return parseFloat((wins/(wins+losses))).toFixed(3);
	    }
	}
    
	function getTeamPoints(ID, leagueID, year) {
	    var standings = findTeamStandings(ID, leagueID, year);
	    var points = standings.pointsScored;
	    
	    if (!points)
	    	return '0.00';
	    
	    return points.toFixed(2);
	}
    
	function getTeamPointsAverage(ID, leagueID, year) {
	    var standings = findTeamStandings(ID, leagueID, year);
	    var points = parseFloat(standings.pointsScored);

	    var weeks = getLastWeek(leagues[parseInt(leagueID) - 1].seasons[year].scores);
	    
	    if (!points)
	    	return '0.00';
	    
	    return (points / (weeks-1)).toFixed(2);
	}
	
	function getTeamPointsAgainstAverage(ID, leagueID, year) {
	    var standings = findTeamStandings(ID, leagueID, year);
	    var points = parseFloat(standings.pointsAgainst);

	    var weeks = getLastWeek(leagues[parseInt(leagueID) - 1].seasons[year].scores);
	    
	    if (!points)
	    	return '0.00';
	    
	    return (points / ((weeks-1) * 2)).toFixed(2);
	}
    
	function getOverallRank(ID, leagueID, year) {
	    var standings = findTeamStandings(ID, leagueID, year);
	    
	    var rank = standings.overallRank;
	    
	    return position(rank);
	}
    
	function getLeagueRank(ID, leagueID, year) {
	    var standings = findTeamStandings(ID, leagueID, year);
	    
	    var rank = standings.leagueRank;
	    
	    return position(rank);
	}
    
	function getDraftPosition(ID) {
	    var filter = standings.filter(function (el) {
	      return el.teamID == ID;
	    });
	    
	    var rank = filter[0].draftPosition;
	    
	    return position(rank);
	}
    
	function getTeamScore(SCORES, ID, week) {
	    var filter = SCORES.filter(function (el) {
	      return el.teamID == ID;
	    });
	    return parseFloat(filter[0]['week'+week]).toFixed(2);
	}
    
	function getTeamProjection(ID, week, leagueID, year) {
	    var filter = leagues[parseInt(leagueID) - 1].seasons[year].projections.filter(function (el) {
	      return el.teamID === ID;
	    });
	    
	    var projection = parseFloat(filter[0]['week'+week]);
	    if (isNaN(projection)) {
		    return ' ';
	    } else {
		    return projection.toFixed(2);
	    }
	}
	
	function getTeamPerformance(teamID, leagueID, year) {
	    var filter = leagues[parseInt(leagueID) - 1].seasons[year].projections.filter(function (el) {
	      return el.teamID == teamID;
	    });
	    
	    var pointsScored = findTeamStandings(teamID, leagueID, year).pointsScored;
	    var lastWeek = getLastWeek(leagues[parseInt(leagueID) - 1].seasons[year].scores);
	    var totalProjections = 0;
    	
    	for (var p = 0; p < filter.length; p++) {
	    	var teamProjections = filter[p];
	    	
	    	for(var score in teamProjections) {
	    		if (score !== 'teamID' && score !== 'week'+currentWeek && score !== 'leagueID' && score !== 'season') {
	    			var week = parseInt(score.slice(4))
	    			if (week < lastWeek){
		    			totalProjections += parseFloat(teamProjections[score]);
	    			}
	    		}
	    	}
    	}
    	
    	if (lastWeek === 1) {
	    	return "0.00%";
    	} else {
	    	return ((pointsScored / totalProjections) * 100).toFixed(2) + '%';
    	}
	}
    
	function getTeamTrophies(ID) {
	    var filter = trophies.filter(function (el) {
	      return el.teamID == ID;
	    });
	    return filter;
	}
    
	function getWeeklyTrophies(week, year, leagueID) {
	    var filter = trophies.filter(function (el) {
	      return el.week === week && el.season === year && el.leagueID === leagueID;
	    });
	    return filter;
	}

	function getTrophyDetails(ID) {
	    var filter = trophyDetails.filter(function (el) {
	      return el.trophyID == ID;
	    });
	    return filter[0];
	}
    
	function getTeamHistory(ID) {
	    var filter = history.filter(function (el) {
	      return el.teamID == ID;
	    });
	    return filter;
	}
    
	function findTeamHistory(ID) {
	    var team = getTeam(ID)
	    return team.historicalRecords.seasons;
	}
    
	function getHistoricalLeagueRecord(teamID,leagueID) {
	    var filter = history.filter(function (el) {
	      return el.teamID == teamID && el.leagueID == leagueID;
	    });
	    
	    var wins = filter[0].wins;
	    var losses = filter[0].losses;
	    
	    if (!wins)
	    	wins = 0;
	    if (!losses)
	    	losses = 0;
	    
	    return wins+'-'+losses;
	}
    
	function getPlayoffRecord(teamID) {
	    var team = getTeam(teamID);
	    var records = team.historicalRecords
	    
	    return records.playoffWins+'-'+records.playoffLosses;
	}

	function getPlayoffAppearance(teamID, leagueID, year) {
	    var filter = leagues[parseInt(leagueID) - 1].seasons[year].playoffs.teams.filter(function (el) {
	      return el.teamID == teamID;
	    });

	    return filter.length;
	}
    
	function getPlayoffAppearances(teamID) {
		var team = getTeam(teamID)	    
	    return team.historicalRecords.madePlayoffs;
	}
	
	function position(ID) {
	    if (ID == 1 || ID == 21) {
		    return ID += 'st'
	    } else if (ID == 2 || ID == 22) {
		    return ID += 'nd'
	    } else if (ID == 3 || ID == 23) {
		    return ID += 'rd'
	    } else {
		    return ID += 'th'
	    }
	}

	// find commands use data already structured, no filtering needed.

	function findLeagueSeasons(ID) {
		return leagues[parseInt(ID) - 1].season // singular holds an array of years, plural is data
	}

	function findLeagueStandings(ID, year) {
		return leagues[parseInt(ID) - 1].seasons[year].standings
	}

	function findLeagueSchedule(ID, year) {
		return leagues[parseInt(ID) - 1].seasons[year].schedule
	}

	function findLeagueTeams(ID, year) {
		return leagues[parseInt(ID) - 1].seasons[year].teams
	}

	function findLeaguePlayoffs(ID, year) {
		return leagues[parseInt(ID) - 1].seasons[year].playoffs
	}

	function findLeagueConference(conferenceID, leagueID, year) {
	    var filter = leagues[parseInt(leagueID) - 1].seasons[year].conferences.filter(function (el) {
	      return el.conferenceID === conferenceID;
	    });
	    return filter[0];
	}
    
	function findTeamStandings(teamID, leagueID, year) {
	    var filter = leagues[parseInt(leagueID) - 1].seasons[year].standings.filter(function (el) {
	      return el.teamID == teamID;
	    });
	    return filter[0];
	}
    
	function findTeamSchedule(teamID, leagueID, year) {
	    var filter = leagues[parseInt(leagueID) - 1].seasons[year].schedule.filter(function (el) {
	      return el.homeTeam === teamID || el.awayTeam === teamID;
	    });
	    return filter;
	}
    
	function findTeamScores(teamID, leagueID, year) {
	    var filter = leagues[parseInt(leagueID) - 1].seasons[year].scores.filter(function (el) {
	      return el.teamID == teamID;
	    });
	    return filter[0];
	}

	function findWeeklyProjections(leagueID, year, week) {
		var filter = leagues[parseInt(leagueID) - 1].seasons[year].projections;
	    filter = filter.sort(function(a,b) {
			return sorting(a["week"+week],b["week"+week])
		});
	    return filter;
    }

	function getTeamRecord(stands, leagueID, year) {
		if (parseInt(stands)) {
			stands = findTeamStandings(stands, leagueID, year);
		}

		var wins = stands.wins;
	    var losses = stands.losses;
	    
	    if (!wins)
	    	wins = 0;
	    if (!losses)
	    	losses = 0;
	    
	    return wins+'-'+losses;
	}
    
	function getOverallRecord(teamID) {
	    var team = getTeam(teamID);
	    return team.historicalRecords.wins+'-'+team.historicalRecords.losses+'-'+team.historicalRecords.ties;
	}

	function getPlayoffScore(seed, conferenceID, round, arrayOfScores) {
	    var filter = arrayOfScores.filter(function (el) {
	      return el.seedID == seed && el.conferenceID == conferenceID;
	    });
	    return filter[0]["round"+round];
	}

	function addHistoricalWin(teamID, leagueID) {
		for (var t = 0; t < teams.length; t++) {
			var team = teams[t];
			if (team.teamID === teamID) {
				team.historicalRecords.wins += 1;
				return;
			}
		}
	}

	function addHistoricalLoss(teamID, leagueID) {
		for (var t = 0; t < teams.length; t++) {
			var team = teams[t];
			if (team.teamID === teamID) {
				team.historicalRecords.losses += 1;
				return;
			}
		}
	}

	function addHead2Head(winningTeam, losingTeam, isPlayoffs, winningScore, losingScore) {
		var winningTeamSet = false;
		var losingTeamSet = false;
		for (var t = 0; t < teams.length; t++) {
			if (winningTeamSet && losingTeamSet) return;

			var team = teams[t];
			if (team.teamID === winningTeam) {
				for (var h = 0; h < team.head2head.length; h++) {
					var h2hOpponent = team.head2head[h];
					if (h2hOpponent.teamID === losingTeam) {
						if (isPlayoffs) {
							h2hOpponent.playoffWins += 1;
							h2hOpponent.playoffpointsScored += winningScore;
							h2hOpponent.playoffpointsAgainst += losingScore;
						} else {
							h2hOpponent.wins += 1;
							h2hOpponent.pointsScored += winningScore;
							h2hOpponent.pointsAgainst += losingScore;
							h2hOpponent.winPct = (parseInt(h2hOpponent.wins) / (parseInt(h2hOpponent.wins) + parseInt(h2hOpponent.losses))).toFixed(3);
						}
						winningTeamSet = true;
						break;
					}
				}
			} else if (team.teamID === losingTeam) {
				for (var h = 0; h < team.head2head.length; h++) {
					var h2hOpponent = team.head2head[h];
					if (h2hOpponent.teamID === winningTeam) {
						if (isPlayoffs) {
							h2hOpponent.playoffLosses += 1;
							h2hOpponent.playoffpointsScored += losingScore;
							h2hOpponent.playoffpointsAgainst += winningScore;
						} else {
							h2hOpponent.losses += 1;
							h2hOpponent.pointsScored += losingScore;
							h2hOpponent.pointsAgainst += winningScore;
							h2hOpponent.winPct = (parseInt(h2hOpponent.wins) / (parseInt(h2hOpponent.wins) + parseInt(h2hOpponent.losses))).toFixed(3);
						}
						losingTeamSet = true;
						break;
					}
				}
			}
		}
	}

	function findTeamHeadToHeadStandings(teamID) {
	    var filter = teams.filter(function (el) {
	      return el.teamID == teamID;
	    });
	    return filter[0].head2head;
	}

	function addPlayoffAppearance(teamID) {
		for (var t = 0; t < teams.length; t++) {
			var team = teams[t];
			if (team.teamID === teamID) {
				team.historicalRecords.madePlayoffs += 1;
				return;
			}
		}
	}

	function addPlayoffWin(teamID) {
		for (var t = 0; t < teams.length; t++) {
			var team = teams[t];
			if (team.teamID === teamID) {
				team.historicalRecords.playoffWins += 1;
				return;
			}
		}
	}

	function addPlayoffLoss(teamID) {
		for (var t = 0; t < teams.length; t++) {
			var team = teams[t];
			if (team.teamID === teamID) {
				team.historicalRecords.playoffLosses += 1;
				return;
			}
		}
	}

	
    function calculateTeamPointsAverage(points) {	    
	    if (isNaN(parseFloat(points)) || parseFloat(points) === 0)
	    	return '0.00';
	    
	    return (points / (currentWeek-1)).toFixed(2);
	}

    function scoringMarginsForSchedule(scheduleGames) {
        var differences = [];
        for (var i = 0; i < scheduleGames.length; i++) {
            var game = scheduleGames[i];
            if (game.homeTeamScore > game.awayTeamScore) {
                differences.push({"difference" : (game.homeTeamScore - game.awayTeamScore).toFixed(2), "winner" : game.homeTeam, "loser" : game.awayTeam, "score" : game.homeTeamScore + "-" + game.awayTeamScore, "week" : game.week, "season" : game.season})
            } else if (game.homeTeamScore < game.awayTeamScore) {
                differences.push({"difference" : (game.awayTeamScore - game. homeTeamScore).toFixed(2), "winner" : game.awayTeam, "loser" : game.homeTeam, "score" : game.awayTeamScore + "-" + game.homeTeamScore, "week" : game.week, "season" : game.season})
            }
        }
        return differences;
    }
	
	// Sport Ngin Platform Work:
	$('.newsAggregatorElement .item').each(function() {

		var $expanded = $(this).find('.newsItemElement').length;
		if ($expanded > 0) {
			$(this).addClass('expanded');
		} else {
			$(this).addClass('condensed');
		}	
														
		var img = $(this).find('img');	
		if(img.length > 0) {		
			if ($(this).hasClass('condensed')) {

			} else {
				var src = img.attr('src');
				// Find and replace the _thumb. so we have a large image to work with
		    	img.attr('src', src.replace(/_thumb\.(png|jpg|jpeg|gif|JPG|JPEG)/, '_large.$1'));
	        	img.load(function() {			
	            	var imgwidth = img.width();
	            	var imgheight = img.height();
	            	var colwidth = img.parent().width();
	            	var colheight = img.parent().height();
	            	var imgRatio = (imgwidth / imgheight);
	            	var colRatio = (colwidth / colheight);

	            	if (imgRatio > colRatio) {
	            		img.css({'height' : '100%'});
	            		var imgwidth = img.width();
	            		var colwidth = img.parent().width();
	            		var width = ((imgwidth-colwidth)/2);
	            		img.css({'margin-left' : '-'+ width +'px'});
	            	} else if (imgRatio < colRatio) {
	            		img.css({'width' : '100%'});
	            		var imgheight = img.height();
	            		var colheight = img.parent().height();
	            		var height = ((imgheight-colheight)/2);
	            		img.css({'margin-top' : '-'+ height +'px'});
	            	}
	        	});
			}
	    } else {
	    	if ($(this).hasClass('condensed')) {
	    		$link = $(this).find('a').first().attr('href');
	    		$(this).prepend('<a href="'+ $link +'" class="no-image"><img src="http://assets.ngin.com/theme_images/minimal/usa_hockey/generic-article.jpg" /></a>');
	    		$(this).find('ul').addClass('details');
	    	} else {
	    		$(this).addClass('no-img');
	    	}
	    }
	});
	
	$('.newsPreviewThumb').each(function() {
		$(this).wrap('<div class="heroWrap" />');
		$(this).load(function() {		
			var img = $(this)
	        var imgwidth = img.width();
	        var imgheight = img.height();
	        var colwidth = img.parent().width();
	        var colheight = img.parent().height();
	        var imgRatio = (imgwidth / imgheight);
	        var colRatio = (colwidth / colheight);
		
	        if (imgRatio > colRatio) {
	        	img.css({'height' : '100%'});
	        	var imgwidth = img.width();
	        	var colwidth = img.parent().width();
	        	var width = ((imgwidth-colwidth)/2);
	        	img.css({'margin-left' : '-'+ width +'px'});
	        } else if (imgRatio < colRatio) {
	        	img.css({'width' : '100%'});
	        	var imgheight = img.height();
	        	var colheight = img.parent().height();
	        	var height = ((imgheight-colheight)/2);
	        	img.css({'margin-top' : '-'+ height +'px'});
	        }
	    });
	});
	
})(jQuery);