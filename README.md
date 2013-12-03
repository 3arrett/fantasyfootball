28 person Fantasy Football League
===============

A 28-team league comprised of 2 separate 14-team leagues (held on ESPN Fantasy) playing under the same ruleset and uses combined standings. Utilized for the inaguaral season of the Sport Ngin Cup. This is the collection of assets used for it. Probably a little raw and could easily rewrite a bunch of it.

SNFF loads in JSON data and then stores it in `sessionStorage` for quicker page loads. 

You can see the project in action at http://ff.sportngin.com/

Modular Usage
=============

SNFF is built in a modular fashion to create building blocks for pages. You can leverage these blocks by classing out an HTML Element:

	// Shows a profile card of TeamID. If no TeamID, will list cards of all teams.
    <div class="cards" data-team="1"></div> 

    // Shows the full league schedule in block style.
    <div class="schedule" data-type="full" data-style="block"></div> 

    // Shows the TeamID schedule in list style.
    <div class="schedule" data-team="1" data-style="list"></div> 

    // Highlights TeamID in standings.
    <div class="standings" data-team="1"></div> 

    // Shows the playoff bracket for a League Season.
    <div class="playoffs" data-league="1"></div> 

TODO
====

1. Convert to Google Docs for tables
