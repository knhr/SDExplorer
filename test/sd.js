(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.sd = {})));
}(this, (function (exports) { 'use strict';

var ELEMENT_HEIGHT$2 = 40;
var ELEMENT_CH_WIDTH$2 = 10;
var PADDING$2 = 20;

function Element(rawElement) {
    this.id = rawElement.id;
    this.name = rawElement.name;
    this.parent = -1;
    this.children = [];
    this.x = 0;
    this.y = 0;
    this.height = ELEMENT_HEIGHT$2;
    this.width = this.name.length * ELEMENT_CH_WIDTH$2 + PADDING$2 * 2;
    this.fold = true;
}

Element.prototype.isGroup = function () {
    if(this.children.length == 0)
        return false;
    else
        return true;
};

var ELEMENT_CH_WIDTH$1 = 10;
var PADDING$1 = 20;
var PADDING_GROUP$1 = 10;

var total$1 = [];
var display$1 = [];

function initElement(objects, groups) {
    var total = new Map();
    objects.forEach(function(object) {
        object.name = object.name + ":" + object.type;
        var e = new Element(object);
        total.set(e.id, e);
    });

    groups.forEach(function(group) {
        var e = new Element(group);
        e.children = group.objs;
        total.set(e.id, e);
    });

    groups.forEach(function(group) {
        objects = group.objs;
        for(var i = 0; i < objects.length; i++) {
            var thisElement = total.get(objects[i]);
            thisElement.parent = group.id;
        }
    });

    return total;
}

function ElementController(objects, groups){
    total$1 = initElement(objects, groups);
    total$1.forEach(function(element, key, map){
        if(element.parent == -1)
            display$1.push(element);
    });

    display$1.sort(function(a, b){
        var ida = a.id;
        var idb = b.id;
        if(a.isGroup()) ida = a.children[0];
        if(b.isGroup()) idb = b.children[0];
        return ida - idb;
    });

    var dist = PADDING$1;
    for(var i = 0; i < display$1.length; i++){
        display$1[i].x = dist;
        dist += (display$1[i].width + PADDING$1);
    }

    this.total = total$1;
    this.display = display$1;
}

ElementController.prototype.unfoldUpdateStatus = function(groupId){
//function unfoldUpdateStatus(groupId) {
    var thisGroup = total$1.get(groupId);
    if(!thisGroup.fold)
        return;
    var elementIds = thisGroup.children;
    var dist = PADDING_GROUP$1;
    var index = display$1.indexOf(thisGroup) + 1;
    for(var i = 0; i < elementIds.length; i++){
        var thisElement = total$1.get(elementIds[i]);
        thisElement.x = dist + thisGroup.x;
        display$1.splice(index, 0, thisElement);
        index++;
        dist += (thisElement.width + PADDING$1);
    }

    var diff = dist - PADDING$1 + PADDING_GROUP$1 - thisGroup.width;
    while(index < display$1.length){
        display$1[index].x += diff;
        index++;
    }

    thisGroup.width += diff;
    thisGroup.y -= PADDING_GROUP$1;
    thisGroup.height += (2 * PADDING_GROUP$1);
    thisGroup.fold = false;

    // If there are parent groups
    var tempGroup = thisGroup;
    while(tempGroup.parent != -1){
        tempGroup = total$1.get(tempGroup.parent);
        tempGroup.width += diff;
        tempGroup.height += (2 * PADDING_GROUP$1);
        tempGroup.y -= PADDING_GROUP$1;
    }
};

ElementController.prototype.foldUpdateStatus = function(groupId){
//function foldUpdateStatus(groupId) {
    var thisGroup = total$1.get(groupId);
    if(thisGroup.fold)
        return;
    var elementIds = thisGroup.children;
    var index = 0;
    for(var i = 0; i < elementIds.length; i++){
        var thisElement = total$1.get(elementIds[i]);
        index = display$1.indexOf(thisElement);
        display$1.splice(index, 1); // Remove elements in group from display
    }

    var diff = thisGroup.width - (thisGroup.name.length * ELEMENT_CH_WIDTH$1 + PADDING$1 * 2);
    while(index < display$1.length){
        display$1[index].x -= diff;
        index++;
    }

    thisGroup.width -= diff;
    thisGroup.y += PADDING_GROUP$1;
    thisGroup.height -= (2 * PADDING_GROUP$1);
    thisGroup.fold = true;

    // If there are parent groups
    var tempGroup = thisGroup;
    while(tempGroup.parent != -1){
        tempGroup = total$1.get(tempGroup.parent);
        tempGroup.width -= diff;
        tempGroup.height -= (2 * PADDING_GROUP$1);
        tempGroup.y += PADDING_GROUP$1;
    }
};

function Message(rawMessage){
    this.from = rawMessage.from;
    this.to = rawMessage.to;
    this.message = rawMessage.message;
    this.callee = rawMessage.callee;
    this.id = -1;
    this.valid = false;
    this.scale = 1;
    this.position = 0;
}

Message.prototype.equals = function(another){
    // position doesn't need to be same
    return (this.from == another.from && this.to == another.to && this.message == another.message && this.callee == another.callee && this.scale == another.scale);
};

var MSG_HEIGHT$1 = 80;
function MessageController(messages, mainThreads){
    this.messages = [];
    this.origin = [];
    this.mainThreads = mainThreads;
    for(var i = 0; i < messages.length; i++){
        var thisMsg = new Message(messages[i]);
        thisMsg.id = i;
        this.messages.push(thisMsg);
        this.origin.push({from:thisMsg.from, to:thisMsg.to});
    }

    this.updateStatus();
}

MessageController.prototype.updateStatus = function(){
    var activeSet = new Set();
    var activeStartMsgId;
    var position = 0;
    var validMessageNum = 0;
    for(var i = 0; i < this.messages.length; i++){
        var thisMsg = this.messages[i];

        if(this.mainThreads.has(thisMsg.from)){
            activeSet.clear();
            activeSet.add(thisMsg.to);
            thisMsg.valid = true;
            thisMsg.scale = 1;
            position += MSG_HEIGHT$1;
            thisMsg.position = position;
            activeStartMsgId = thisMsg.id;
            validMessageNum ++;
        }
        else if(activeSet.has(thisMsg.from)){
            activeSet.add(thisMsg.to);
            thisMsg.valid = true;
            thisMsg.scale = 1;
            // Decide the position
            var lastMsg = this.messages[i - 1];
            if(thisMsg.from == lastMsg.to){
                position += MSG_HEIGHT$1 / 2;
                thisMsg.position = position;
                position += MSG_HEIGHT$1 / 2;
            }
            else{
                position += MSG_HEIGHT$1;
                thisMsg.position = position;
            }
            // Change the scale of messages from main thread
            for(var j = activeStartMsgId; j < i; j++){
                this.messages[j].scale += 1;
                if(this.messages[j].to == thisMsg.from)
                    break;
            }
            validMessageNum ++;
        }
        else{ // not valid message
            thisMsg.valid = false;
        }
    }

    this.validMessageNum = validMessageNum;
};

var ELEMENT_CH_HEIGHT = 4;
var PADDING_GROUP = 10;

var MSG_ACTIVE_WIDTH = 10;
var MSG_HEIGHT = 80;
var MSG_PADDING = MSG_HEIGHT / 8;

var total = [];
var display = [];
var elementController;
var messages = [];
var origin = [];
var mainThread; //TODO add multi-thread
var messageController;

function SDViewer(objects, groups, msgs){
    var ec = new ElementController(objects, groups);
    elementController = ec;
    total = ec.total;
    display = ec.display;

    // TODO add multi-thread
    var mainThreadSet = new Set();
    mainThreadSet.add(0);
    mainThread = mainThreadSet;

    var mc = new MessageController(msgs, mainThreadSet);
    messages = mc.messages;
    origin = mc.origin;
    messageController = mc;
}

SDViewer.prototype.drawAll = function() {
    // Draw base line
    display.forEach(function(object){
        if(!(object.isGroup() && !object.fold)){
            var x = object.x + object.width / 2;
            var y1 = object.y;
            var y2 = y1 + (messageController.validMessageNum + 1) * MSG_HEIGHT;
            d3.select("svg").append("line")
                .attr("x1", x)
                .attr("y1", y1)
                .attr("x2", x)
                .attr("y2", y2)
                .style("stroke", "black")
                .style("stroke-dasharray", "2,2,2");
        }
    });

    // Draw elements (groups and objects)
    display.forEach(function(element){
        drawElement(element);
    });

    // Draw main thread's active block
    var h = messageController.validMessageNum * MSG_HEIGHT;
    mainThread.forEach(function(id){
        var mainThreadObj = total.get(id);
        var x = mainThreadObj.x + mainThreadObj.width / 2 - MSG_ACTIVE_WIDTH / 2;
        var y = MSG_HEIGHT;
        d3.select("svg").append("rect")
                .attr("class", "mainThreadActiveBar")
                .attr({x: 0, y: 0, width: MSG_ACTIVE_WIDTH, height: h})
                .attr("transform", "translate(" + x + "," + y + ")")
                .style("stroke", "black")
                .style("fill", "#CCC");
    });

    // Draw messages
    messages.forEach(function(message){
        if(message.valid)
            drawMessage(message);
    });
};

function unfold(group){
    elementController.unfoldUpdateStatus(group.id);
    unfoldUpdateSVG(group);
}

function fold(group){
    elementController.foldUpdateStatus(group.id);
    foldUpdateSVG(group);
}

function drawMessage(message) {
    var from = total.get(message.from);
    var to = total.get(message.to);
    // left active bar
    var x1 = from.x + from.width / 2 - MSG_ACTIVE_WIDTH / 2;
    var y1 = message.position + MSG_PADDING;
    var h1 = message.scale * MSG_HEIGHT - 2 * MSG_PADDING;

    // left side of the right active bar
    var x2 = to.x + to.width / 2 - MSG_ACTIVE_WIDTH / 2;
    var y2 = y1 + MSG_PADDING;
    var h2 = h1 - 2 * MSG_PADDING;

    var tempG = d3.select("svg").append("g");
    // Draw left active bar if needed
    if(!mainThread.has(message.from)){
        tempG.append("rect")
            .attr("class", "leftActiveBlock")
            .attr({x: 0, y: 0, width: MSG_ACTIVE_WIDTH, height: h1})
            .attr("transform", "translate(" + x1 + "," + y1 + ")")
            .style("stroke", "black")
		    .style("fill", "#CCC");
    }

    // Draw call line
    tempG.append("line")
			.attr("class", "callLine")
            .style("stroke", "black")
            .attr("x1", (message.from < message.to) ? x1 + MSG_ACTIVE_WIDTH : x1)
            .attr("y1", y2)
            .attr("x2", (message.from < message.to) ? x2 : x2 + MSG_ACTIVE_WIDTH)
            .attr("y2", y2)
            .attr("marker-end", "url(#end)");

    // Draw callback line
    tempG.append("line")
			.attr("class", "callBackLine")
            .style("stroke", "black")
            .style("stroke-dasharray", "5, 5, 5")
            .attr("x1", (message.from < message.to) ? x2 : x2 + MSG_ACTIVE_WIDTH)
            .attr("y1", y2 + h2)
            .attr("x2", (message.from < message.to) ? x1 + MSG_ACTIVE_WIDTH : x1)
            .attr("y2", y2 + h2)
            .attr("marker-end", "url(#end)");

    // Draw right active block
    tempG.append("rect")
        	.attr("class", "rightActiveBlock")
        	.attr({x: 0, y: 0, width: MSG_ACTIVE_WIDTH, height: h2})
        	.attr("transform", "translate(" + x2 + "," + y2 + ")")
			.style("stroke", "black")
			.style("fill", "#CCC");
}

function allFolded(group) {
    for(var i = 0; i < group.children.length; i++){
        var e = total.get(group.children[i]);
        if(e.isGroup() && !e.fold)
            return false;
    }
    return true;
}

function drawElement(element) {
    var tempG = d3.select("svg").append("g");

    // Draw rectangles
    var rect = tempG.append("rect")
                .attr({x: 0, y: 0, width: element.width, height: element.height})
                .style("stroke", "black");
    if(element.isGroup())
        rect.style("fill", "yellow");
    else
        rect.style("fill", "white");

    // Write names of objects
    tempG.append("text")
        .text(function(d){ return element.name; })
        .attr("transform", "translate(" + element.width / 2 + "," + (element.height / 2 + ELEMENT_CH_HEIGHT) + ")")
        .attr("text-anchor", "middle");

    // Move the object to where it should be
    tempG.attr("class", "element-rectangle")
        .datum(element)
        .attr("transform", "translate(" + element.x + ", " + element.y + ")");

    // If element is group, add mouse event to it
    if(element.isGroup()){
        tempG.on("click", function(thisGroup){
            // unfold the group
            if(thisGroup.fold){
                unfold(thisGroup);
            }
            // fold the group
            else{
                // If there are unfold groups in the group, fold them
                var stack = [];
                stack.push(thisGroup);
                while(stack.length != 0){
                    var tempGroup = stack[stack.length - 1];
                    if(allFolded(tempGroup)){
                        fold(tempGroup);
                        stack.splice(stack.length - 1, 1);
                    }
                    else{
                        for(var i = 0; i < tempGroup.children.length; i++){
                            var t = total.get(tempGroup.children[i]);
                            if(t.isGroup()){
                                if(allFolded(t)){
                                    fold(t);
                                }
                                else {
                                    stack.push(t);
                                }
                            }
                        }
                    }
                }
            }
        });
    }
    return tempG;
}

function unfoldUpdateSVG(thisGroup) {
    d3.selectAll(".element-rectangle")
        .each(function(element){
            if(element.isGroup()){
                d3.select(this).select("rect")
                    .transition()
                    .attr({width: element.width, height:element.height});
                if(element == thisGroup){
                    d3.select(this)
                        .transition()
                        .style("fill-opacity", "0")
                        .attr("transform", "translate(" + element.x + ", " + element.y + ")");
                }
                else{
                    d3.select(this)
                        .transition()
                        .attr("transform", "translate(" + element.x + ", " + element.y + ")");
                }
            }
            else{
                d3.select(this)
                    .transition()
                    .attr("transform", "translate(" + element.x + ", " + element.y + ")");
            }
        });

    for(var i = 0; i < thisGroup.children.length; i++){
        var elementId = thisGroup.children[i];
        var thisElement = total.get(elementId);
        var temp = drawElement(thisElement);
        temp.attr("transform", "translate(" + thisGroup.x + ", " + (thisGroup.y + PADDING_GROUP) + ")");
        temp.transition()
            .attr("transform", "translate(" + thisElement.x + ", " + thisElement.y + ")");
    }
}

function foldUpdateSVG(thisGroup) {
    d3.selectAll(".element-rectangle")
        .each(function(element){
            if(thisGroup.children.indexOf(element.id) != -1){
                d3.select(this).remove();
            }
            else if(element.isGroup()){
                d3.select(this).select("rect")
                    .transition()
                    .attr({width: element.width, height:element.height});

                if(element == thisGroup){
                    d3.select(this)
                        .transition()
                        .style("fill-opacity", "1")
                        .attr("transform", "translate(" + element.x + ", " + element.y + ")");
                }
                else{
                    d3.select(this)
                        .transition()
                        .attr("transform", "translate(" + element.x + ", " + element.y + ")");
                }
            }
            else{
                d3.select(this)
                    .transition()
                    .attr("transform", "translate(" + element.x + ", " + element.y + ")");
            }
        });
}

exports.SDViewer = SDViewer;

Object.defineProperty(exports, '__esModule', { value: true });

})));
