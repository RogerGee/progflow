// app.js - progflow

// globals
var terminal;
var context;

// constants
const VERSION = "0.0";
const PROGNAME = "ProgFlow Simulator";
const AGENTINFO = navigator.userAgent;

// initPage() - create page content programmatically
function initPage() {
    var controlPanel = document.getElementById('div-control-panel');
    var terminalView = document.getElementById('div-terminal-view');
    var canvasView = document.getElementById('div-canvas-view');

    controlPanel.addBreak = function() {
        //this.appendChild(document.createElement("br"));
        this.appendChild(document.createElement("hr"));
    }
    controlPanel.addTextField = function(id,maxLength) {
        var ed = document.createElement("input");
        this.appendChild(ed);
        ed.type = 'text';
        ed.className = 'control-panel-text-entry';
        ed.id = id;
        if (typeof maxLength !== 'undefined')
            ed.maxLength = maxLength;

        var ws = (this.offsetWidth - ed.previousSibling.offsetWidth-12) + "px";
        ed.style.width = ws;
        this.appendChild(document.createElement("br"));
    }
    controlPanel.addButtonA = function(label,callback) {
        var btn = document.createElement("button");
        this.appendChild(btn);
        btn.type = 'button';
        btn.className = 'control-panel-button-a';
        btn.appendChild(document.createTextNode(label));
        btn.onclick = callback;
    }
    controlPanel.addButtonB = function(label,callback) {
        var btn = document.createElement("button");
        this.appendChild(btn);
        btn.type = 'button';
        btn.className = 'control-panel-button-b';
        btn.appendChild(document.createTextNode(label));
        btn.onclick = callback;
    }
    controlPanel.addLabel = function(label) {
        var lbl = document.createTextNode(label);
        this.appendChild(lbl);
        lbl.className = 'control-panel-label';
    }
    controlPanel.removeElement = function(elem) {
        this.removeChild(elem);
    }

    // create control panel buttons
    controlPanel.addButtonB("new",buttonNew);
    controlPanel.addTextField("flowchart-name",16);
    controlPanel.addButtonB("save",buttonSave);
    controlPanel.addButtonB("open in new tab",buttonOpenInNewTab);
    controlPanel.addButtonB("close project",buttonCloseProject);
    controlPanel.addBreak();
    controlPanel.addButtonA("assign",buttonMakeAssignmentNode);
    controlPanel.addButtonA("in");
    controlPanel.addButtonA("out");
    controlPanel.addButtonA("if");
    controlPanel.addButtonA("while");
    controlPanel.addButtonA("for");
    controlPanel.addButtonA("call");
    controlPanel.addButtonA("proc");
    controlPanel.addBreak();
    controlPanel.addButtonB("C++");
    controlPanel.addButtonB("exec");
    controlPanel.addButtonB("trace");
    controlPanel.addButtonB("reset");
    controlPanel.addBreak();

    // create terminal content
    terminal = new Terminal(terminalView);
    terminal.addLine(PROGNAME + " " + VERSION);
    terminal.addLine(AGENTINFO);

    //test
    var f = function(s) {
        context.addBlock(s);
        terminal.inputMode(f);
    };
    terminal.inputMode(f);

    // create canvas and render context
    var canvas = document.createElement("canvas");
    canvas.appendChild(document.createTextNode("Browser does not support HTML5 Canvas"));
    canvas.setAttribute("id","canvas-main");
    canvasView.appendChild(canvas);
    context = new DrawingContext(canvas,canvasView,"program");
}

// resizePage() - handle window resize event
function resizePage() {
    // resize all control panel text areas
    var controlPanel = document.getElementById('div-control-panel');
    var nodes = controlPanel.getElementsByClassName('control-panel-text-entry');
    for (var i = 0;i < nodes.length;i++) {
        var w = controlPanel.offsetWidth-nodes[i].previousSibling.offsetWidth-12;
        nodes[i].style.width = w + "px";
    }

    // resize canvas
    context.resizeCanvas();
}

////////////////////////////////////////////////////////////////////////////////
// Button handlers for main UI
////////////////////////////////////////////////////////////////////////////////

function buttonNew(e) {
    // overwrite the current context with another one
    var canvas = document.getElementById("canvas-main");
    var canvasView = document.getElementById("div-canvas-view");

    // grab the name of the new project from the box
    var name = document.getElementById("flowchart-name").value;
    if (name == "") {
        alert("Please specify a project name in the input field at left.");
        return;
    }

    // TODO: check save state

    context = new DrawingContext(canvas,canvasView,name);
}

function buttonSave(e) {
    // generate a savable representation of the program and download it as a
    // data-URL

}

function buttonOpenInNewTab(e) {

}

function buttonCloseProject(e) {
    // this is really just to help OCD people clear the screen
    var canvas = document.getElementById("canvas-main");
    var canvasView = document.getElementById("div-canvas-view");

    // TODO: check save state

    context = new DrawingContext(canvas,canvasView,"program");
}

function buttonMakeAssignmentNode(e) {
    context.addNode('flowoperation','assign'); //test
}

////////////////////////////////////////////////////////////////////////////////
// Initialization
////////////////////////////////////////////////////////////////////////////////

// setup event handlers
window.onload = initPage;
window.onresize = resizePage;
