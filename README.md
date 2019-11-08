# AutomaticWildShape
Roll20 API for Automatically Wild Shaping using the Roll20 D&amp;D 5th Edition OGL Sheet.

-----

## Installation

1) **You must have a Roll20 Pro subscription to use the Roll20 API.**
2) Navigate to your Roll20 game page. This should be the screen with the big game header and title.
3) Go to Settings > API Scripts.
4) Click "New Script".
5) Name the script anything appropriate, and paste the contents of the AutomaticWildShape_X.X.X.js file into that script.
6) Scroll down and select "Save Script".
7) When a GM joins the campaign all macros will be automatically created.

-----

## Commands
All required commands are created in macros automatically when the API is installed. One command, "~EndWildShape", is an Ability created in the sheet of any creature currently in wild shape. These are the macros and abilities:

#### AutomaticWildShape - `!aws` / `!aws <beast name>`
This command is for transforming the selected token. It produces a list of appropriate CR beasts in chat that the user can click to transform into, or if submitted with a beast's name it will attempt to transform the selected token into the detailed beast (presuming all capitals and spellings are correct). 

#### ~EndWildShape - `!aws end`
A creature in wild shape has this Ability. When their token is selected, check the top-left of the screen for this button. Clicking it or entering the command reverts the selected creature to their normal form (if they have one).

> ##### Health Carry-over
> If a wild-shape token has negative health when this command is run, the excess damage will carry over to the reverted token.

#### AWSadd - `!aws add`
Adds the selected token(s) to the wild shape list if they each represent a character.

#### AWSremove - `!aws remove` / `!aws remove <beast name>`
Removes the selected token(s) from the wild shape list if they each represent a character, or removes beasts from the list by name if all capitals and spelling are correct.

#### AWSlist - `!aws list`
Lists all creatures in the wild shape list, and allows the GM to remove creatures from that list by clicking the appropriate X button.

#### AWSpopulate - `!aws populate`
Automatically populates the wild shape list, adding every Beast type NPC sheet that has a default token.

-----

## Beast WildShape Preperation

1) Make sure the beast has a <b>player-uploaded</b> default token.
2) Make sure you're using a filled out Roll20 D&D 5e Character Sheet.

If its not working with a default SRD monster sheet & blank <b>player-uploaded</b> default token then something has gone wrong. Hit me up in the API thread or at the link below. If you're sure the issue isn't something you're doing, open an issue on this GitHub Repository.

-----

## Class and Level Override for NPCs and PCs

1) Create an attribute on the NPC or PC sheet.
2) Name the attribute "aws_override".
3) Set the attribute value to "1".

If a PC is using the "aws_override" attribute the GM will be notified.

-----

Automatic Wild Shape written by Layton - https://app.roll20.net/users/1519557/layton
