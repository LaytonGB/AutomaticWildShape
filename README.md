# AutomaticWildShape
Roll20 API for Automatically Wild Shaping using the Roll20 D&amp;D 5th Edition OGL Sheet.

-----

<h3>Installation</h3>

1) <b>You must have a Roll20 Pro subscription to use the Roll20 API.</b>
2) Navigate to your Roll20 game page. This should be the screen with the big game header and title.
3) Go to Settings > API Scripts.
4) Click "New Script".
5) Name the script anything appropriate, and paste the contents of the AutomaticWildShape_X.X.js file into that script.
6) Scroll down and select "Save Script".
7) When a GM joins the campaign all macros will be automatically created.

-----

<h3>Beast WildShape Preperation</h3>

1) Make sure the beast has a <b>player-uploaded</b> default token.
2) Make sure you're using a filled out Roll20 D&D 5e Character Sheet.
3) ??? - If its not working with a default SRD monster sheet & blank <b>player-uploaded</b> default token then something has gone wrong. Hit me up in the API thread or at the link below.

-----

<h3>Class and Level Override for NPCs and PCs</h3>

1) Create an attribute on the NPC or PC sheet.
2) Name the attribute "aws_override".
3) Set the attribute value to "1".

If a PC is using the "aws_override" attribute the GM will be notified.

-----

Automatic Wild Shape written by Layton - https://app.roll20.net/users/1519557/layton
