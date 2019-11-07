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

<h3>Commands</h3>

All required commands are created in macros automatically when the API is installed. One command "!aws revert" is an Ability created on any creature in wild shape. These are the macros and abilities:

1) AutomaticWildShape - This command is for transforming the selected token. It produces a list of appropriate CR beasts in chat that the user can click to transform.
2) "!aws revert" - A creature in wild shape has this Ability. When their token is selected, check the top-left of the screen for this button. Clicking it reverts the creature to their normal form.
3) AWSadd - Adds the selected token(s) to the wild shape list if they each represent a character.
4) AWSremove - Removes the selected token(s) from the wild shape list if they each represent a character.
5) AWSlist - Lists all creatures in the wild shape list, and allows the GM to remove creatures from that list by clicking the appropriate X button.
6) AWSpopulate - Automatically populates the wild shape list, adding every Beast type NPC sheet that has a default token.

-----

<h3>Beast WildShape Preperation</h3>

1) Make sure the beast has a <b>player-uploaded</b> default token.
2) Make sure you're using a filled out Roll20 D&D 5e Character Sheet.
3) ???

If its not working with a default SRD monster sheet & blank <b>player-uploaded</b> default token then something has gone wrong. Hit me up in the API thread or at the link below.

-----

<h3>Class and Level Override for NPCs and PCs</h3>

1) Create an attribute on the NPC or PC sheet.
2) Name the attribute "aws_override".
3) Set the attribute value to "1".

If a PC is using the "aws_override" attribute the GM will be notified.

-----

Automatic Wild Shape written by Layton - https://app.roll20.net/users/1519557/layton
