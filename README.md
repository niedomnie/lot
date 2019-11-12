# Geodesy library

HTML/JS library to draw flat geolocation positions. 
Purpose of project is to give declarative language (through JSON file) to express transformations. 
Library can be easly use to draw positions of objects (e.g. house) on lot using few major transofrmations.
Positions are float numbers where x positions are on vertical axis (higher on top) and y positions are on horizontal axis (higher on right).
Not special spacial reference used (e.g. EPSC) nor unit definition/conversion.
New project contains 3 files: lot.js (this library), html file with SVG and lot.json defining what needs to be draw.

## Transformations groups

#. position on line
#. position on perpendicular line
#. position on parallel line
#. position based on angle and distance
#. position based on distance from 2 points
#. positions on intersections of 2 lines
#. nearest point between point & line
#. and more minor 

##. Commands 

o - orientation
h - head 
t - tail
b - back
r - right
l - left
v - reverse
c - cross
d - distance
n - nearest
