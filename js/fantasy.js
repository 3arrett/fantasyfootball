(function($){

	var teams, schedule, leagues, conferences, trophies, standings, history, projections, playoffs, playoffSchedule, playoffScores;
	var currentWeek;
	var FFsession = false;
	
	function getData(table){
	    return $.get('http://' + window.location.host + '/page_element/ajax/'+ table +'.json');
	}
	
	if (sessionStorage.leagues) {
		// Using sessionStorage to make it faster. Must JSON.parse twice because browsers only store locally as Strings
		leagues = JSON.parse(JSON.parse(sessionStorage.leagues));
		conferences = JSON.parse(JSON.parse(sessionStorage.conferences));
		teams = JSON.parse(JSON.parse(sessionStorage.teams));
		scores = JSON.parse(JSON.parse(sessionStorage.scores));
		schedule = JSON.parse(JSON.parse(sessionStorage.schedule));
		trophies = JSON.parse(JSON.parse(sessionStorage.trophyWinners));
		trophyDetails = JSON.parse(JSON.parse(sessionStorage.trophies));
		standings = JSON.parse(JSON.parse(sessionStorage.standings));
		history = JSON.parse(JSON.parse(sessionStorage.history));
		projections = JSON.parse(JSON.parse(sessionStorage.projections));
		playoffs = JSON.parse(JSON.parse(sessionStorage.playoffs));
		playoffSchedule = JSON.parse(JSON.parse(sessionStorage.playoffSchedule));
		playoffScores = JSON.parse(JSON.parse(sessionStorage.playoffScores));
		currentWeek = sessionStorage.currentWeek;
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
			currentWeek = getCurrentWeek();
			
			sessionStorage.setItem('leagues', JSON.stringify(leagues));
			sessionStorage.setItem('conferences', JSON.stringify(conferences));
			sessionStorage.setItem('teams', JSON.stringify(teams));
			sessionStorage.setItem('scores', JSON.stringify(scores));
			sessionStorage.setItem('schedule', JSON.stringify(schedule));
			sessionStorage.setItem('trophyWinners', JSON.stringify(trophies));
			sessionStorage.setItem('trophies', JSON.stringify(trophyDetails));
			sessionStorage.setItem('standings', JSON.stringify(standings));
			sessionStorage.setItem('history', JSON.stringify(history));
			sessionStorage.setItem('projections', JSON.stringify(projections));
			sessionStorage.setItem('playoffs', JSON.stringify(playoffs));
			sessionStorage.setItem('playoffSchedule', JSON.stringify(playoffSchedule));
			sessionStorage.setItem('playoffScores', JSON.stringify(playoffScores));
			sessionStorage.setItem('currentWeek', JSON.stringify(currentWeek));
		
			$('body').trigger('dataReady');
		}).fail(function() {
			$('body').prepend('<div class="failure">Shit, that wasn\'t supposed to happen. REFRESH!</div>');
			$('.failure').slideDown();
		});
	}
    
    $(document).on('dataReady','body',function() {	
    	// Load Scores into Team Data
    	for (var s = 0; s < scores.length; s++) {
	    	var teamScores = scores[s];
	    	var totalScore = 0;
	    	
	    	for(var score in teamScores) {
	    		if (score !== 'teamID') 
		    		totalScore += parseFloat(teamScores[score]);
	    	}
	    	
	    	standings[s].pointsScored = totalScore;
    	}
    	
    	
    	// Load Scores into Schedule Data
    	for (var i = 0; i < schedule.length; i++) {
	    	var game = schedule[i];
	    	
	    	game.awayTeamScore = parseFloat(getTeamScore(game.awayTeam,game.week));
	    	game.homeTeamScore = parseFloat(getTeamScore(game.homeTeam,game.week));
	    	
	    	var awayTeam = game.awayTeam - 1;
	    	var homeTeam = game.homeTeam - 1;
	    	var conference = parseInt(game.conferenceID);
	    	
	    	if (parseInt(game.week) < currentWeek) {
	    		var awayTeamPointsAgainst = parseFloat(standings[awayTeam].pointsAgainst);
	    		var homeTeamPointsAgainst = parseFloat(standings[homeTeam].pointsAgainst);
	    		
	    		if (isNaN(awayTeamPointsAgainst)) { awayTeamPointsAgainst = 0 }
	    		if (isNaN(homeTeamPointsAgainst)) { homeTeamPointsAgainst = 0 }
	    		
	    		awayTeamPointsAgainst += game.homeTeamScore;
	    		homeTeamPointsAgainst += game.awayTeamScore;
	    		standings[awayTeam].pointsAgainst = awayTeamPointsAgainst;
	    		standings[homeTeam].pointsAgainst = homeTeamPointsAgainst;
	    	}
	    	
	    	// Build team records
	    	if (game.homeTeamScore > game.awayTeamScore) {
		    	standings[homeTeam].wins += 1;
		    	standings[awayTeam].losses += 1;
		    	if (conference > 0) {
		    		standings[homeTeam].leagueWins += 1;
		    		standings[awayTeam].leagueLosses += 1;
				}
		    		
	    	} else if (game.homeTeamScore < game.awayTeamScore) {
		    	standings[homeTeam].losses += 1;
		    	standings[awayTeam].wins += 1;
		    	if (conference > 0) {
		    		standings[homeTeam].leagueLosses += 1;
		    		standings[awayTeam].leagueWins += 1;
				}
	    	} 
    	}
    	
    	
    	// Load Winning Pct into Standings
    	for (var i = 0; i < standings.length; i++) {
	    	var team = standings[i];
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
	    	
	    	team.winPct = getTeamWinningPercentage(team.teamID);
	    	team.leagueWinPct = getLeagueWinningPercentage(team.teamID);
    	}
    	
    	// Load Wins and Losses against league into Standings
    	for (var i = 1; i < currentWeek; i++) {
	    	var everyRecord = scores;
	    	everyRecord.sort(function(a,b) {
				return sorting(a['week'+i],b['week'+i]);
			});
			
			for (var j = 0; j < everyRecord.length; j++) {
				var team = everyRecord[j];
				var teamID = team.teamID - 1;
				standings[teamID].allPlayWins += 28-(j+1);
				standings[teamID].allPlayLosses += j;
				standings[teamID].allPlayWinPct = (standings[teamID].allPlayWins / (standings[teamID].allPlayLosses + standings[teamID].allPlayWins)).toFixed(3);
			}
    	}
    	
    	function sorting(a, b) {
		    a = parseFloat(a);
		    b = parseFloat(b);
		    if (a > b) return -1;
		    if (a < b) return 1;
		    return 0;
		}
    	
    	// Sort Standings based on Winning Percentage, then sorted by Points Scored		
		standings.sort(function(a,b) {
			return sorting(a.winPct,b.winPct) || sorting(a.pointsScored,b.pointsScored)
		});
    	
    	// Load Overall Ranks into Standings Data
    	for (var i = 0; i < standings.length; i++) {
    		var team = standings[i];
    		team.overallRank = i+1;
    	}
    	
    	// Load Conference Ranks into Standings Data
    	for (var i = 0; i < conferences.length; i++) {
    		var conference = conferences[i];
    		var conferenceStandings = getConferenceStandings(conference.conferenceID);
    		
	    	for (var j = 0; j < conferenceStandings.length; j++) {
			    var team = conferenceStandings[j];
			    team.leagueRank = j+1;
	    	}
    	}
    	
    	
    	$('.standings').each(function() {
	    	var stands = standings;
				
			$(this).append('<table class="dataTable" />');
			var table = $(this).find('table');
			table.append('<thead /><tbody />');
			table.find('thead').append('<tr class="super"><th colspan="3"></th><th colspan="3">Overall</th><th></th><th colspan="3">League</th></tr>');
			table.find('thead').append('<tr><th class="rank">Rank</th><th class="team">Team</th><th class="league">Conference</th><th class="oWins">W</th><th class="oLosses">L</th><th class="oWPct">Pct</th><th class="points">Points</th><th class="lWins">W</th><th class="lLosses">L</th><th class="lWPct">Pct</th><th class="draft">Drafted</th></tr>');
			
			for (var i = 0; i < stands.length; i++) {
				var rank = stands[i];
				var team = getTeam(rank.teamID);
				var conference = getConference(rank.conferenceID);
				var teamPhoto = getTeamPhoto(rank.teamID);
				var teamLink = getTeamLink(rank.teamID);
				
				table.find('tbody').append('<tr class="team'+team.teamID+' '+conference.conferenceName+'"><td class="rank">'+rank.overallRank+'</td><td class="team">'+teamPhoto + teamLink+'</td><td class="league">'+conference.conferenceName+'</td><td class="oWins">'+rank.wins+'</td><td class="oLosses">'+rank.losses+'</td><td class="oWPct">'+rank.winPct+'</td><td class="points">'+rank.pointsScored.toFixed(2)+'</td><td class="lWins">'+rank.leagueWins+'</td><td class="lLosses">'+rank.leagueLosses+'</td><td class="lWPct">'+rank.leagueWinPct+'</td><td class="draft">'+ getDraftPosition(rank.teamID) +'</td></tr>');
			}
			
			if ($(this).attr('data-team')) {
				var team = $(this).attr('data-team');
				$(this).find('.team'+team).addClass('highlight');
			}
			
			$(this).fadeTo(500,1.0);
    	});
    	
    	
    	$('.power').each(function() {
	    	var stands = standings;
				
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
				var conference = getConference(rank.conferenceID);
				var teamPhoto = getTeamPhoto(rank.teamID);
				var teamLink = getTeamLink(rank.teamID);
				var powerRank = i+1;
				rank["powerRank"] = powerRank;
				
				console.log(conference);
				
				table.find('tbody').append('<tr class="team'+team.teamID+' '+conference.conferenceName+'"><td class="rank">'+powerRank+'</td><td class="team">'+teamPhoto + teamLink+'</td><td class="league">'+conference.conferenceName+'</td><td class="leagueWinPct">'+rank.allPlayWinPct+'</td><td class="points">'+ getTeamPointsAverage(rank.teamID) +'</td><td class="pointsAgainst">'+ getTeamPointsAgainstAverage(rank.teamID) +'</td></tr>');
				
				$('.team'+team.teamID+' .teamLink').append(' <span class="record">('+rank.wins+'-'+rank.losses+')</span>');
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
			
			if ($(this).attr('data-team') && $(this).attr('data-type') === 'next') {
				var team = $(this).attr('data-team');
				sched = getTeamsWeeklyMatchup(team,currentWeek);
				$(this).addClass('individual next');
				var individualSchedule = true;
				var nextWeeksSchedule = true;
			} else if ($(this).attr('data-team')) {
				var team = $(this).attr('data-team');
				sched = getTeamSchedule(team);
				$(this).addClass('individual');
				var individualSchedule = true;
			} else if ($(this).attr('data-type') === 'next') {
				var sched = getWeekSchedule(currentWeek);
			} else if ($(this).attr('data-type') === 'full') {
				// Full Schedule
				var sched = schedule;	
				fullSchedule = true;
				$(this).prepend('<div class="weeklyFilter"><ul /></div>');
			}
			
			for (var i = 0; i < sched.length; i++) {
				var week = sched[i].week;
				var conference = getConference(sched[i].conferenceID);
				var awayTeam = getTeam(sched[i].awayTeam);
				var awayTeamScore = parseFloat(sched[i].awayTeamScore);
				var awayTeamProjection = parseFloat(getTeamProjection(awayTeam.teamID,week));
			    var awayTeamRecord = getTeamRecord(sched[i].awayTeam);
				var homeTeam = getTeam(sched[i].homeTeam);
				var homeTeamScore = parseFloat(sched[i].homeTeamScore);
				var homeTeamProjection = parseFloat(getTeamProjection(homeTeam.teamID,week));
			    var homeTeamRecord = getTeamRecord(sched[i].homeTeam);
			    
			    var weekLength = $(this).find('#week'+ week).length;
			    if (weekLength > 0) {
			        $(this).find('#week'+ week).append('<div class="game game'+i+'" />');
			    } else {
			    	if (individualSchedule && nextWeeksSchedule) {
			        	$(this).append('<div id="week'+ week +'" class="week"><h2>Next Matchup <span>Week ' + week + '</span></h2></div>');
			    	} else {
				    	$(this).append('<div id="week'+ week +'" class="week"><h2>Week ' + week + '</h2></div>');
			    	}
			        if (fullSchedule) {
				        $(this).find('.weeklyFilter ul').append('<li><a href="#week'+ week +'" class="weekLink">Week '+ week +'</a></li>');
					}
			        $(this).find('#week'+ week).append('<div class="game game'+i+'" />');
			    }
			    
			    var game = $(this).find('.game'+i);
			    
			    game.append('<div class="awayTeam" /><div class="homeTeam" />');
			    game.find('.awayTeam').append(getTeamPhoto(awayTeam.teamID));
			    game.find('.awayTeam').append('<a href="'+awayTeam.link+'" class="teamName" title="'+awayTeam.teamName+' ('+awayTeamRecord+')">'+awayTeam.teamName+' <span class="record">( '+awayTeamRecord+' )</span></a>');
			    
			    if (isNaN(awayTeamScore)) {
			    	awayTeamScoreText = '-';
			    } else {
			    	awayTeamScoreText = awayTeamScore.toFixed(2);
			    }
			    
			    game.find('.awayTeam').append('<span class="score">'+awayTeamScoreText+'</span>');
			    
			    if (!isNaN(awayTeamProjection)) {
			    	game.find('.awayTeam .score').append('<span class="projected">( '+awayTeamProjection+' )</span>');   
			    }
			    
			    game.find('.homeTeam').append(getTeamPhoto(homeTeam.teamID));
			    game.find('.homeTeam').append('<a href="'+homeTeam.link+'" class="teamName" title="'+homeTeam.teamName+' ('+homeTeamRecord+')">'+homeTeam.teamName+' <span class="record">( '+homeTeamRecord+' )</span></a>');
			    
			    if (isNaN(homeTeamScore)) {
			    	homeTeamScoreText = '-';
			    } else {
			    	homeTeamScoreText = homeTeamScore.toFixed(2);
			    }
			    game.find('.homeTeam').append('<span class="score">'+homeTeamScoreText+'</span>');
			    
			    if (!isNaN(homeTeamProjection)) {
			    	game.find('.homeTeam .score').append('<span class="projected">( '+homeTeamProjection+' )</span>');   
			    }
			    
			    if (homeTeamScore > awayTeamScore) {
				    game.find('.homeTeam').addClass('boom');
				    game.find('.awayTeam').addClass('loser');
			    } else if (homeTeamScore < awayTeamScore) {
				    game.find('.awayTeam').addClass('boom');
				    game.find('.homeTeam').addClass('loser');
			    }
			    
			    // List Style Matchup Stats
				var awayTeamLeague = getConference(awayTeam.conferenceID);
				var awayTeamRank = getOverallRank(sched[i].awayTeam);
				var awayTeamLeagueRank = getLeagueRank(sched[i].awayTeam);
				var awayTeamPoints = getTeamPoints(sched[i].awayTeam);
				var awayTeamAverage = getTeamPointsAverage(sched[i].awayTeam);
				var awayTeamPerformance = getTeamPerformance(sched[i].awayTeam);
				var awayTeamTrophies = getTeamTrophies(sched[i].awayTeam);
				
				var homeTeamLeague = getConference(homeTeam.conferenceID);
				var homeTeamRank = getOverallRank(sched[i].homeTeam);
				var homeTeamLeagueRank = getLeagueRank(sched[i].homeTeam);
				var homeTeamPoints = getTeamPoints(sched[i].homeTeam);
				var homeTeamAverage = getTeamPointsAverage(sched[i].homeTeam);
				var homeTeamPerformance = getTeamPerformance(sched[i].homeTeam);
				var homeTeamTrophies = getTeamTrophies(sched[i].homeTeam);
				
				game.append('<ul class="compare key"><li>League</li><li>Overall Rank</li><li>League Rank</li><li>Total Points</li><li>Weekly Average</li><li>Performance</li><li>Trophies</li></ul>')
				
				game.find('.awayTeam').append('<ul class="compare"><li>'+awayTeamLeague.conferenceName+'</li><li>'+awayTeamRank+'</li><li>'+awayTeamLeagueRank+'</li><li>'+awayTeamPoints+'</li><li>'+awayTeamAverage+'</li><li>'+awayTeamPerformance+'</li><li>'+awayTeamTrophies.length+'</li></ul>');
				
				game.find('.homeTeam').append('<ul class="compare"><li>'+homeTeamLeague.conferenceName+'</li><li>'+homeTeamRank+'</li><li>'+homeTeamLeagueRank+'</li><li>'+homeTeamPoints+'</li><li>'+homeTeamAverage+'</li><li>'+homeTeamPerformance+'</li><li>'+homeTeamTrophies.length+'</li></ul>');
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
	    	var projected = projections.sort(function(a,b) {
			    return sorting(a["week"+week],b["week"+week])
			});;
				
			$(this).append('<table class="dataTable" />');
			var table = $(this).find('table');
			table.append('<thead /><tbody />');
			table.find('thead').append('<tr><th class="rank">Rank</th><th class="team">Team</th><th class="league">Conference</th><th class="points">Projected Points</th></tr>');
			
			for (var i = 0; i < projected.length; i++) {
				var rank = projected[i];
				var team = getTeam(rank.teamID);
				var conference = getConference(team.conferenceID);
				var teamPhoto = getTeamPhoto(rank.teamID);
				var teamLink = getTeamLink(rank.teamID);
				
				table.find('tbody').append('<tr class="team'+team.teamID+' '+conference.conferenceName+'"><td class="rank">'+(i+1)+'.</td><td class="team">'+teamPhoto + teamLink+'</td><td class="league">'+conference.conferenceName+'</td><td class="points">'+rank["week"+week]+'</td></tr>');
			}
			
			$(this).fadeTo(500,1.0);
    	});
		
		$('.cards').each(function() {
			var team = [];
			var individual = false;
			
			if ($(this).attr('data-team')) {
				var teamID = $(this).attr('data-team');
				team.push(getTeam(teamID));	
				$(this).addClass('single');
				var individual = true;
			} else {
				var team = teams;
			}
		
			for (var t = 0; t < team.length; t++) {
				var teamID = team[t].teamID;
				var conference = getConference(team[t].conferenceID);
				var teamName = team[t].teamName;
				var teamOwner = team[t].teamOwner;
				var teamPhoto = getTeamPhoto(teamID);
				var overallRank = getOverallRank(teamID);
				var leagueRank = getLeagueRank(teamID);
				var twitterID = team[t].twitter;
				var espnLink = team[t].espn;
				
				$(this).append('<div class="team'+(t+1)+' card '+ conference.conferenceName +'" />');
				var card = $(this).find('.team'+(t+1));
				card.append(teamPhoto);
				card.append('<h1>'+teamName+'</h1>');
				card.append('<h3>'+teamOwner+'</h3>');
				
				if (individual) {
					if (twitterID) {
						card.find('h3').append('<a href="http://twitter.com/'+twitterID+'" class="twitter">@'+twitterID+'</a>');
					}
					card.find('h3').append('<a href="'+espnLink+'" class="espn"></a>');
				}
				
				card.append('<h5 class="league">Sport Ngin '+conference.conferenceName+'</h5>');
				
				
				card.append('<ul class="ranks"><li>'+overallRank+'<span>Overall Rank</span></li><li>'+leagueRank+'<span>League Rank</span></li></ul>');
				
				card.append('<ul class="stats" />');
				var stats = card.find('.stats');
				var record = getTeamRecord(teamID);
				stats.append('<li class="record">'+record+'<span class="cat">2013 Record</span></li>');
				
				var pointsScored = getTeamPoints(teamID);
				stats.append('<li class="points">'+pointsScored+'<span class="cat">Points</span></li>');
				
				if (individual) {
					stats.append('<li class="weeklyAverage">'+getTeamPointsAverage(teamID)+'<span class="cat">Weekly Avg</span></li>');
					stats.append('<li class="performance">'+getTeamPerformance(teamID)+'<span class="cat">Performance</span></li>');
				}
				
				var teamTrophies = getTeamTrophies(teamID);
				var trophyText = (teamTrophies.length === 1) ? 'Trophy' : 'Trophies';
				stats.append('<li class="trophies">'+teamTrophies.length+'<span class="cat">'+trophyText+'</span></li>');
				
				if (individual) {
					stats.append('<li class="overallRecord">'+getOverallRecord(teamID)+'<span class="cat">Career Record</span></li>');
					stats.append('<li class="playoffAppearances">'+getPlayoffAppearances(teamID)+'<span class="cat">Playoff Apperances</span></li>');
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
			var trophyList = [];
			
			if ($(this).attr('data-team')) {
				var teamID = $(this).attr('data-team');
				trophyList = getTeamTrophies(teamID);
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
				var conference = getConference(trophy.conference);
				var league = getLeague(trophy.leagueID);
				var trophyDeets = getTrophyDetails(trophy.trophyID); 
				var trophyName = trophyDeets.trophyName;
				var trophyDescription = trophyDeets.description;
				var earned = trophy.earned;
				var trophyNameCC = trophyName.replace(/ /g, '');
				var trophyNameCC = trophyNameCC.replace(/\'/g, '');
				var trophyNameCC = trophyNameCC.charAt(0).toLowerCase() + trophyNameCC.slice(1);
				
				list.append('<li class="'+trophyNameCC+'"><span class="trophyWrap"><h2>'+trophyName+'</h2><h3>'+trophyDescription+'</h3><h4>Earned in '+earned+'</h4><h5 class="league">'+league.leagueName+'</h5></span></li>');
				
			}
			
			if ($(this).attr('data-team')) {
				var team = $(this).attr('data-team');
				$(this).find('.team'+team).addClass('highlight');
			}
			
			$(this).fadeTo(500,1.0);
    	});
    	
    	$('.history').each(function() {
	    	var historyList = [];
			
			if ($(this).attr('data-team')) {
				var teamID = $(this).attr('data-team');
				historyList = getTeamHistory(teamID);
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
				
				table.find('tbody').prepend('<tr><td>'+league.season+'</td><td>'+league.leagueName+'</td><td>'+record+' <span class="rank">('+rank+')</span></td></tr>');
				
			}
			
			$(this).fadeTo(500,1.0);
    	});
    	
    	$('.records').each(function() {
    		var record = $(this).attr('data-record');
    	    		
    		var allScores = [];
    		
    		for (var i = 0; i < scores.length; i++) {
    			for(var score in scores[i]) {
				    if (score !== 'teamID') 
		    			allScores.push({'teamID': scores[i].teamID, 'score': scores[i][score], 'week': score});
				}
    		}
    		
    		if (record === "highest") {
				// Sort scores	
				allScores.sort(function(a,b) {
				    return sorting(a.score,b.score)
				});
				$(this).append('<h1>Highest Score</h1>');
    		} else if (record === "lowest") {
				// Sort scores	
				allScores.sort(function(b,a) {
				    return sorting(a.score,b.score)
				});
				$(this).append('<h1>Lowest Score</h1>');
    		}
    		
    		$(this).append('<table class="dataTable" />');
    		
    		for (var i = 0; i < 5; i++) {
    			var recordsTable = $(this).find('.dataTable');
    			var recordTeam = allScores[i];
    			recordsTable.append('<tr class="record'+i+'"><td class="team">'+getTeamPhoto(recordTeam.teamID)+getTeamLink(recordTeam.teamID)+'</td><td class="score">'+recordTeam.score+'</td><td class="week">'+recordTeam.week+'</td></tr>');
	    		
    		}
    	
    	});
    	
    	
    	$('.playoffs').each(function() {
    		var league = $(this).attr('data-league');
    		var leagueInfo = getLeague(league);
    		var playoffInfo = getLeaguePlayoffs(league);
    		
    		var leftBracket = [];
    		var rightBracket = [];
    		
    		var baseConference = playoffInfo[0].conferenceID;
    		
    		for (var i = 0; i < playoffInfo.length; i++) {
	    		if (baseConference === playoffInfo[i].conferenceID) {
		    		leftBracket.push(playoffInfo[i]);
	    		} else {
		    		rightBracket.push(playoffInfo[i]);
	    		}
    		}
    		
    		if (leftBracket.length !== rightBracket.length) {
	    		$(this).prepend('<h1>Playoff Brackets are uneven</h1>');
	    		return;
    		}
    		
    		playoffInfo = [leftBracket, rightBracket];
			
			// Rounds (weeks) of playoffs before Super Bowl. Either is 2 or 3.
			var rounds = (leftBracket.length / 2);
			
    		$(this).append('<div class="bracket left" data-rounds="'+rounds+'"></div><div class="championship"></div><div class="bracket right" data-rounds="'+rounds+'"></div>');
    		
    		$('.championship').each(function() {
	    		$(this).append('<h1>Super Bowl</h1>');
	    		$(this).append('<div class="game" />');
	    		$(this).find('.game').append('<div class="leftTeam"></div><div class="rightTeam"></div>');
	    		
	    		var championshipRound = getPlayoffRoundSchedule(rounds+1);
	    		console.log(championshipRound);
	    		
	    		$.each(championshipRound, function(idx, team) {
	    			var side = "";
		    		if (team.conferenceID == leftBracket[0].conferenceID) {
			    		side = "left";
		    		} else if (team.conferenceID == rightBracket[0].conferenceID) {
			    		side = "right";
		    		} else {
			    		console.log("You gone fucked something up with your playoff schedule");
		    		}
		    		
		    		var teamInfo, teamRecord;
		    		
		    		if (!team.seed) {
			    		teamInfo = {
				    				"link" : "#",
				    				"teamName" : "TBD",
				    				"teamID" : "TBA"
									}
			    		teamRecord = "0-0";
		    		} else {
						teamInfo = getPlayoffTeam(team.conferenceID, team.seed);
						teamRecord = getTeamRecord(teamInfo.teamID);
		    		}
		    		
		    		var aTeam = $('.championship .'+side+'Team');
		    		aTeam.append(getTeamPhoto(teamInfo.teamID));
		    		aTeam.append('<a href="'+teamInfo.link+'" class="teamName" title="'+teamInfo.teamName+' ('+teamRecord+')">'+teamInfo.teamName+' <span class="record">( '+teamRecord+' )</span></a>');
		    		
	    		});
	    		
	    		var championshipGame = $(this).find('.game');
    		});
			
			$('.bracket').each(function(i) {
				var conference = playoffInfo[i][0].conferenceID;
				var conferenceInfo = getConference(conference);
				$(this).append('<h1>'+ conferenceInfo.conferenceName +'</h1>');
				
				var bracketSchedule = getConferencePlayoffSchedule(conference);
				
				for (var j = 1; j <= rounds; j++) {
					$(this).append('<div class="round round'+j+'"></div>');
					var round = $(this).find('.round'+j);
					round.append('<h1>Round '+j+'</h1>');
					var roundSchedule = getConferencePlayoffRoundSchedule(conference, j);
					
					$.each(roundSchedule, function(k, game) {
						round.append('<div class="game game'+(k+1)+'"></div>');
						var aGame = round.find('.game'+(k+1));
						
						var homeSeed = game.homeSeed;
						if (homeSeed) {
							var homeSeedScore = parseInt(game.homeSeedScore);
							var homeTeam = getPlayoffTeam(conference, homeSeed);
							var homeTeamRecord = getTeamRecord(homeTeam.teamID);
						
							aGame.append('<div class="homeTeam" />');
							aGame.find('.homeTeam').append('<span class="seed">'+homeSeed+'</span>');
							aGame.find('.homeTeam').append(getTeamPhoto(homeTeam.teamID));
							aGame.find('.homeTeam').append('<a href="'+homeTeam.link+'" class="teamName" title="'+homeTeam.teamName+' ('+homeTeamRecord+')">'+homeTeam.teamName+' <span class="record">( '+homeTeamRecord+' )</span></a>');
							
							if (isNaN(homeSeedScore)) {
							    homeSeedScore = '-';
							} else {
							    homeSeedScore = homeSeedScore.toFixed(2);
							}
							
							aGame.find('.homeTeam').append('<span class="score">'+homeSeedScore+'</span>');
						}
						
						var awaySeed = game.awaySeed;
						if (awaySeed) {
							var awaySeedScore = parseInt(game.awaySeedScore);
							var awayTeam = getPlayoffTeam(conference, awaySeed);
							var awayTeamRecord = getTeamRecord(awayTeam.teamID);
						
							aGame.append('<div class="awayTeam" />');
							aGame.find('.awayTeam').append('<span class="seed">'+awaySeed+'</span>');
							aGame.find('.awayTeam').append(getTeamPhoto(awayTeam.teamID));
							aGame.find('.awayTeam').append('<a href="'+awayTeam.link+'" class="teamName" title="'+awayTeam.teamName+' ('+awayTeamRecord+')">'+awayTeam.teamName+' <span class="record">( '+awayTeamRecord+' )</span></a>');
							
							if (isNaN(awaySeedScore)) {
							    awaySeedScore = '-';
							} else {
							    awaySeedScore = awaySeedScore.toFixed(2);
							}
							
							aGame.find('.awayTeam').append('<span class="score">'+awaySeedScore+'</span>');
						}
						
						if (!awaySeed && !homeSeed) {
							aGame.addClass('TBD');
							aGame.append('<h1>TBD</h1>');
						}
					});
				}
			});
			
    	});
    	
    	$('#progress').css({'-webkit-animation':'none','animation':'none'}).animate({
		    width: '100%'
		}, 300, function() {
		    $(this).fadeOut(800);
		});
    });
    
    if (FFsession) $('body').trigger('dataReady');

	
    function getLeague(ID) {
	    var filter = leagues.filter(function (el) {
	      return el.leagueID == ID;
	    });
	    return filter[0];
    }
    
    function getLeagueTeams(ID) {
	    var filter = teams.filter(function (el) {
	      return el.leagueID == ID;
	    });
	    return filter;
    }
    
    function getLeagueStandings(ID) {
	    var filter = standings.filter(function (el) {
	      return el.leagueID == ID;
	    });
	    return filter;
    }
    
    function getLeaguePlayoffs(ID) {
	    var filter = playoffs.filter(function (el) {
	      return el.leagueID == ID;
	    });
	    return filter;
    }
    
    function getConference(ID) {
	    var filter = conferences.filter(function (el) {
	      return el.conferenceID == ID;
	    });
	    return filter[0];
    }
    
    function getConferenceTeams(ID) {
	    var filter = teams.filter(function (el) {
	      return el.conferenceID == ID;
	    });
	    return filter;
    }
    
    function getConferenceStandings(ID) {
	    var filter = standings.filter(function (el) {
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
	
    function getPlayoffRoundSchedule(round) {
	    var filter = playoffSchedule.filter(function (el) {
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
	
    function getLeagueSchedule(ID) {
	    var filter = schedule.filter(function (el) {
	      return el.league == ID;
	    });
	    return filter;
    }
	
    function getWeekSchedule(ID) {
	    var filter = schedule.filter(function (el) {
	      return el.week == ID;
	    });
	    return filter;
    }
	
    function getTeamsWeeklyMatchup(ID,week) {
	    var filter = schedule.filter(function (el) {
	      return el.awayTeam == ID || el.homeTeam == ID;
	    });
	    var filter = filter.filter(function (el) {
	      return el.week == week;
	    });
	    return filter;
    }
	
    function getCurrentWeek() {
    	var week = 0;
    	for (var prop in scores[0]) {
	    	week++
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
        
	function getPlayoffTeam(conferenceID, seed) {
	    var filter = playoffs.filter(function (el) {
	      return el.conferenceID == conferenceID && el.seed == seed;
	    });
	    
	    var team = getTeam(filter[0].teamID);
	    
	    return team;
	}
    
	function getTeamLink(ID) {
	    var filter = teams.filter(function (el) {
	      return el.teamID == ID;
	    });
	    return '<a href="'+filter[0].link+'" class="teamLink">'+filter[0].teamName+'</a>';
	}
    
	function getTeamRecord(ID) {
	    var filter = standings.filter(function (el) {
	      return el.teamID == ID;
	    });
	    
	    var wins = filter[0].wins;
	    var losses = filter[0].losses;
	    
	    if (!wins)
	    	wins = 0;
	    if (!losses)
	    	losses = 0;
	    
	    return wins+'-'+losses;
	}
    
	function getOverallRecord(ID) {
	    var season = standings.filter(function (el) {
	      return el.teamID == ID;
	    });
	    
	    var wins = parseInt(season[0].wins);
	    var losses = parseInt(season[0].losses);
	    
	    var teamHistory = getTeamHistory(ID);
	    
	    for (var i = 0; i < teamHistory.length; i++) {
		    var team = teamHistory[i];
		    wins += parseInt(team.wins);
		    losses += parseInt(team.losses);
	    }
	    
	    if (isNaN(wins))
	    	wins = 0;
	    if (isNaN(losses))
	    	losses = 0;
	    
	    return wins+'-'+losses;
	}
    
	function getTeamWinningPercentage(ID) {
	    var filter = standings.filter(function (el) {
	      return el.teamID == ID;
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
    
	function getLeagueWinningPercentage(ID) {
	    var filter = standings.filter(function (el) {
	      return el.teamID == ID;
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
    
	function getTeamPoints(ID) {
	    var filter = standings.filter(function (el) {
	      return el.teamID == ID;
	    });
	    var points = filter[0].pointsScored;
	    
	    if (!points)
	    	return '0.00';
	    
	    return points.toFixed(2);
	}
    
	function getTeamPointsAverage(ID) {
	    var filter = standings.filter(function (el) {
	      return el.teamID == ID;
	    });
	    var points = parseFloat(filter[0].pointsScored);
	    
	    if (!points)
	    	return '0.00';
	    
	    return (points / (currentWeek-1)).toFixed(2);
	}
	
	function getTeamPointsAgainstAverage(ID) {
	    var filter = standings.filter(function (el) {
	      return el.teamID == ID;
	    });
	    var points = parseFloat(filter[0].pointsAgainst);
	    
	    if (!points)
	    	return '0.00';
	    
	    return (points / ((currentWeek-1) * 2)).toFixed(2);
	}
    
	function getOverallRank(ID) {
	    var filter = standings.filter(function (el) {
	      return el.teamID == ID;
	    });
	    
	    var rank = filter[0].overallRank;
	    
	    return position(rank);
	}
    
	function getLeagueRank(ID) {
	    var filter = standings.filter(function (el) {
	      return el.teamID == ID;
	    });
	    
	    var rank = filter[0].leagueRank;
	    
	    return position(rank);
	}
    
	function getDraftPosition(ID) {
	    var filter = standings.filter(function (el) {
	      return el.teamID == ID;
	    });
	    
	    var rank = filter[0].draftPosition;
	    
	    return position(rank);
	}
    
	function getTeamScore(ID,week) {
	    var filter = scores.filter(function (el) {
	      return el.teamID == ID;
	    });
	    return parseFloat(filter[0]['week'+week]).toFixed(2);
	}
    
	function getTeamProjection(ID,week) {
	    var filter = projections.filter(function (el) {
	      return el.teamID == ID;
	    });
	    
	    var projection = parseFloat(filter[0]['week'+week]);
	    if (isNaN(projection)) {
		    return ' ';
	    } else {
		    return projection.toFixed(2);
	    }
	}
	
	function getTeamPerformance(ID) {
	    var filter = projections.filter(function (el) {
	      return el.teamID == ID;
	    });
	    
	    var teamScores = scores.filter(function (el) {
	      return el.teamID == ID;
	    });	
	    
	    var totalProjections = 0;
    	
    	for (var p = 0; p < filter.length; p++) {
	    	var teamProjections = filter[p];
	    	
	    	for(var score in teamProjections) {
	    		if (score !== 'teamID' && score !== 'week'+currentWeek) 
		    		totalProjections += parseFloat(teamProjections[score]);
	    	}
    	}
    	
    	if (currentWeek == 1) {
	    	return "0.00%";
    	} else {
	    	return ((getTeamPoints(ID) / totalProjections) * 100).toFixed(2) + '%';
    	}
	}
    
	function getTeamTrophies(ID) {
	    var filter = trophies.filter(function (el) {
	      return el.teamID == ID;
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
	    var filter = history.filter(function (el) {
	      return el.teamID == teamID && el.playoffs == "1";
	    });
	    
	    var wins = 0;
	    var losses = 0;
	    
	    for (i = 0; i < filter.length; i++) {
		    wins += parseInt(filter[i].playoffWins);
		    losses += parseInt(filter[i].playoffLosses);
	    }
	    
	    return wins+'-'+losses;
	}
    
	function getPlayoffAppearances(teamID) {
	    var filter = history.filter(function (el) {
	      return el.teamID == teamID && el.playoffs == "1";
	    });
	    
	    return filter.length;
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