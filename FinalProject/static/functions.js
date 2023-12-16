
//
//ZOOM & PAN
//

//zoom code reference: https://www.geeksforgeeks.org/how-to-zoom-an-map-on-scroll-using-javascript/
let currentZoom = 1;
let currentX = 0;
let currentY = 0;
let minZoom = 1; 
let maxZoom = 3; 
let stepSize = 0.08;
let mouseX = 0;
let mouseY = 0;
let panning = false;
let addMode = null;
let map = null;
let addedNPCs = new Array();
let addedLocations = new Array();
let addedTags = new Array();

document.addEventListener("DOMContentLoaded", function() {
    //only run zoom/pan code on map page
    if (window.location.href.includes("/map")) {
        EnableScroll();
    }
});

function EnableScroll()
{
    map = document.getElementById("map");
    map.addEventListener("wheel", function (event) {
        let direction = event.deltaY > 0 ? -1 : 1; 
        ZoomImage(direction); 
    });

    document.addEventListener("mousemove", MoveMap);
    document.addEventListener("mousedown", StartPan);
    document.addEventListener("mouseup", EndPan);
}

function ZoomImage(direction)
{
    let newZoom = currentZoom + direction * stepSize;
    //bound zoom to min and max values
    if (newZoom < minZoom || newZoom > maxZoom || addMode == false) { 
        return; 
    } 

    //scrolling in
    if (direction == 1)
    {
        map.style.transform = 'scale(' + newZoom + ') translate(' + (currentX + ((window.innerWidth/2-mouseX)*0.1/(newZoom**2))) + "px, " + (currentY + ((window.innerHeight/2-mouseY)*0.1/(newZoom**2))) + 'px)';
        currentX += ((window.innerWidth/2-mouseX)*0.1/(newZoom**2));
        currentY += ((window.innerHeight/2-mouseY)*0.1/(newZoom**2));
    }
    //scrolling out
    else {
        map.style.transform = 'scale(' + newZoom + ') translate(' + (currentX - stepSize*currentX/((currentZoom-minZoom)*currentZoom)) + "px, " + (currentY - stepSize*currentY/((currentZoom-minZoom)*currentZoom)) + 'px)';
        currentX += (-stepSize*currentX/((currentZoom-minZoom)*currentZoom));
        currentY += (-stepSize*currentY/((currentZoom-minZoom)*currentZoom));
    }
    currentZoom = newZoom;

    //unscale children
    let pins = map.querySelectorAll(".pin-image");
    for (let i = 0; i < pins.length; i++) {
        pins[i].style.transform = 'scale(' + 1/(1+(currentZoom-1)/2) + ') translate(0px, ' + ((currentZoom-1)*10) + 'px)';
    }

    let popups = map.querySelectorAll(".hidden-popup");
    for (let i = 0; i < popups.length; i++) {
        popups[i].style.transform = 'scale(' + 1/(1+(currentZoom-1)/2) + ') translate(' + ((currentZoom-1)*-20) + 'px, ' + ((currentZoom-1)*-35) + 'px)';
    }
}

//called when user clicks on map
function StartPan() {
    if (!addMode) {
        panning = true;
    }
    else {
        AddLocation();
    }
}

function MoveMap(e)
{
    mouseX = e.clientX;
    mouseY = e.clientY;
    //pin cursor follows regular cursor when adding a pin
    if (addMode == true) {
        document.getElementById("pin-cursor").style.display = "block";
        document.getElementById("pin-cursor").style.transform = 'translate(' + (mouseX-30) + "px, " + (mouseY-110) + "px)";
    }

    if (!panning || addMode == false) {
        return;
    }

    //Horizontal movement
    let newPosX = currentX*currentZoom + e.movementX/currentZoom;
    let allowedMoveX = (map.clientWidth*currentZoom - document.documentElement.clientWidth)/2;
    if (!(newPosX < -allowedMoveX && e.movementX/currentZoom < 0) && !(newPosX > allowedMoveX && e.movementX/currentZoom > 0))
    {
        map.style.cursor = "move";
        map.style.transform = 'scale(' + currentZoom + ') translate(' + (currentX + e.movementX/currentZoom) + 'px, ' + currentY + 'px)';
        currentX += e.movementX/currentZoom;
    }
    //Vertical movement
    let newPosY = currentY*currentZoom + e.movementY/currentZoom + 140; //offset for header
    let allowedMoveY = (map.clientHeight*currentZoom - document.documentElement.clientHeight)/2;
    if (!(newPosY < -allowedMoveY && e.movementY/currentZoom < 0) && !(newPosY > allowedMoveY && e.movementY/currentZoom > 0))
    {
        map.style.cursor = "move";
        map.style.transform = 'scale(' + currentZoom + ') translate(' + currentX + 'px, ' + (currentY + e.movementY/currentZoom) + 'px)';
        currentY += e.movementY/currentZoom;
    }
}

//called when user releases mouse click
function EndPan() {
    panning = false;
    map.style.cursor = "auto";
}


//
//ADD LOCATION
//

//called when user pressed the 'Add Pin' button
function AddMode() {
    //null addMode is the default state of the map -- pannable/zoomable
    //true addMode is waiting for user to place a pin (pin cursor and greyed out map)
    //false addMode is when user is entering info in the sidebar
    if (addMode == null) {
        addMode = true;
        map.style.opacity = 0.7;
    }
}

//called when the X in the sidebar is clicked (cancels add)
function ViewMode() {
    document.getElementById("pin-placeholder").remove();
    addMode = null;
    document.getElementById("location-sidebar").style.display = "none";
}

//called when user clicks on the map to place their pin
function AddLocation()
{
    addMode = false;
    document.getElementById("pin-cursor").style.display = "none";
//TODO: animation of sidebar moving in from off screen
    document.getElementById("location-sidebar").style.display = "block";
    
    //calculate left and top CSS properties of pin -- how much we've panned from center plus how far the mouse is from the center, divided by the total size of the map image
    var leftPct = 50 + 100*(-(currentX+23) + (mouseX-(window.innerWidth/2))/currentZoom)/map.clientWidth;
    var topPct = 50 + 100*(-(currentY+140) + (mouseY-((window.innerHeight)/2))/currentZoom)/map.clientHeight + (-3*(currentZoom-3)**2 + 4) + (currentZoom-1.5); //offsets added manually to counteract observed error (I'm still not entirely sure why the vertical calculation is off)

    //create the placeholder pin
    var pinPlaceholder = document.createElement("img");
    pinPlaceholder.setAttribute('class', 'pin-image');
    pinPlaceholder.setAttribute('id', 'pin-placeholder');
    pinPlaceholder.style.left = leftPct + "%";
    pinPlaceholder.style.top = topPct + "%";
    pinPlaceholder.style.filter = "brightness(100%)";
    pinPlaceholder.style.transform = 'scale(' + 1/(1+(currentZoom-1)/2) + ') translate(0px, ' + ((currentZoom-1)*10) + 'px)';
    pinPlaceholder.setAttribute('src', 'https://www.freepnglogos.com/uploads/pin-png/map-pin-png-apex-dance-studio-16.png');
    map.appendChild(pinPlaceholder);

    document.getElementById("left-coord").setAttribute('value', leftPct);
    document.getElementById("top-coord").setAttribute('value', topPct);
    map.style.opacity = 1;
}

function AddRelatedNPC(name)
{
    var image = document.getElementById(name);
    var hidden = document.getElementById(name + "-hidden");

    //if already added, remove
    if (addedNPCs.includes(name))
    {
        const index = addedNPCs.indexOf(name);
        addedNPCs.splice(index, 1);
        image.style.opacity = 0.4;
        hidden.setAttribute('value', 'false');
    }
    //otherwise, add
    else
    {
        addedNPCs.push(name);
        image.style.opacity = 1;
        hidden.setAttribute('value', 'true');
    }
}


//
//ADD NPC
//

function StyleButton(button, turnOn)
{
    if (turnOn) {
        button.style.backgroundColor = "rgb(255, 245, 230)";
        button.style.borderWidth = "2px";
        button.style.opacity = 1;
    }
    else {
        button.style.backgroundColor = "rgb(230, 230, 230)";
        button.style.borderWidth = "1px";
        button.style.opacity = 0.3;
    }
}

function AddRelatedLocation(name)
{
    var button = document.getElementById(name);
    var hidden = document.getElementById(name + "-hidden");

    //if already added, remove
    if (addedLocations.includes(name))
    {
        const index = addedLocations.indexOf(name);
        addedTags.splice(index, 1);
        StyleButton(button, false);
        hidden.setAttribute('value', 'false');
    }
    //otherwise add
    else
    {
        addedLocations.push(name);
        StyleButton(button, true);
        hidden.setAttribute('value', 'true');
    }
}

//TODO: change to textbox where user can type in tags
function AddRelatedTag(name)
{
    var button = document.getElementById(name);
    var hidden = document.getElementById(name + "-hidden");

    //if already added, remove
    if (addedTags.includes(name))
    {
        const index = addedTags.indexOf(name);
        addedTags.splice(index, 1);
        StyleButton(button, false);
        hidden.setAttribute('value', 'false');
    }
    //otherwise add
    else
    {
        addedTags.push(name);
        StyleButton(button, true);
        hidden.setAttribute('value', 'true');
    }
}


//
//FILTERING
//

function changeFilter(tag)
{
    var button = document.getElementById(tag);
    
    //excluded --> ignored
    if (button.style.backgroundColor == 'rgba(240, 120, 110, 0.3)')
    {
        button.style.opacity = 0.4;
        button.style.backgroundColor = "rgb(230, 230, 230)";
        button.style.color = 'black';
        button.style.textDecoration = 'none';
        FilterList(tag, "ignore")
    }
    //included --> excluded
    else if (button.style.opacity == 1)
    {
        button.style.backgroundColor = 'rgba(240, 120, 110, 0.3)';
        button.style.color = 'rgb(180, 30, 20)';
        button.style.textDecoration = 'line-through';
        button.style.borderWidth = 'thin';
        FilterList(tag, "exclude")
    }
    //ignored --> included
    else
    {
        button.style.opacity = 1;
        button.style.borderWidth = '2px';
        FilterList(tag, "include")
    }
}

function FilterList(tag, type)
{
    const tagBlocks = document.getElementsByClassName("tag-icon");
    var tagFound = false;
    for (let i = 0; i < tagBlocks.length; i++)
    {
        tagBlock = tagBlocks[i];
        if (tagBlock.innerHTML == tag)
        {
            tagFound = true;
        }

        //last element
        if (i == tagBlocks.length-1)
        {
            FilterBlock(type, tagBlock, tagFound, tag)
        }

        //changing divs
        else if ((tagBlock.parentNode != tagBlocks[i+1].parentNode))
        {
            FilterBlock(type, tagBlock, tagFound, tag)
            tagFound = false
        }
    }

    const npcBlocks = document.getElementsByClassName("content-block");
    for (let i = 0; i < npcBlocks.length; i++)
    {
        block = npcBlocks[i]
        //If an NPC has no tags...
        if (block.getElementsByClassName('tag-icon').length == 0)
        {
            if (type == "include") {
                block.classList.add("hide-"+tag);
            }
            else if (type == "exclude" || type == "ignore") {
                block.classList.remove("hide-"+tag);
            }
        }
    }
}

function FilterBlock(type, block, tagFound, tag)
{
    if (type == "include" && tagFound == false) {
        block.parentNode.classList.add("hide-"+tag);
    }
    else if (type == "exclude" && tagFound == true) {
        block.parentNode.classList.add("hide-"+tag);
    }
    else if (type == "exclude" && tagFound == false) {
        block.parentNode.classList.remove("hide-"+tag);
    }
    else if (type == "ignore") {
        block.parentNode.classList.remove("hide-"+tag);
    }
}