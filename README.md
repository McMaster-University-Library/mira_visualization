# Overview

This repository contains the a coauthor network visualization for the faculty member within the McMaster Institute of Research in Aging (MIRA).


# Instructions for Mira Admins
Download the src folder onto your computer then follow the sections below.

### Determining Co-ordinates on the Visualization
1.	In the google chrome browser, download the [web-server-for-chrome](https://chrome.google.com/webstore/detail/web-server-for-chrome/ofhbbkphhbklhfoeikjpcbhemlocgigb?hl=en) browser extension and install.
2.	Close Chrome
3.	Open start (windows) or open search (mac)
4.	Search for / Type in “web server for chrome” and open it
5.	Click choose folder, and navigate to the “src” folder
6.	Click the web server url that appears in blue, it will be something like (but maybe not exactly): http://127.0.0.1:8887
7.	Click on mira-coordinates.html
8.	What you have saved in mira_members.csv and project_grant.csv will show up in the webpage
9.	If you hover over any point on the canvas, you will see coordinate locations that you can use in the mira_members.csv file
10.	Update the csv files and refresh the webpage as desired to see changes
11.	When you want to see the final product, in “web server for chrome”, open mira.html

### Mira_members.csv File
Fairly straight forward to fill out. Just want to include a few guidelines here.
1.	The co-ordinates value is somewhere between 0 and 200
2.	The Faculty column must be filled with ONE of the following: Science, Health Sciences, Engineering, Business, Social Sciences, Humanities
3.  Every cell should NOT start or end with a space

### Project_grant.csv File
Fairly straight forward to fill out. Just want to include a few guidelines here.
1. Every project should have 1 or more row with PI set to TRUE.
2. One of those PI rows should have blurb title and blurb filled out. This info appears when you hover over a dot when the project filter is active.
3. For a group of rows to be a part of the same project, they need the same values in cols: level1, level2, level3
4. Every cell should NOT start or end with a space
