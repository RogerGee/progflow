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
    controlPanel.addTextField = function(id) {
        var ed = document.createElement("input");
        this.appendChild(ed);
        ed.type = 'text';
        ed.className = 'control-panel-text-entry';
        ed.id = id;

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

    // create control panel buttons
    controlPanel.addButtonB("new");
    controlPanel.addTextField("flowchart-name");
    controlPanel.addButtonB("save");
    controlPanel.addButtonB("open in new tab");
    controlPanel.addButtonB("close project");
    controlPanel.addBreak();
    controlPanel.addButtonA("in");
    controlPanel.addButtonA("out");
    controlPanel.addButtonA("if");
    controlPanel.addButtonA("while");
    controlPanel.addButtonA("for");
    controlPanel.addButtonA("call");
    controlPanel.addButtonA("proc");
    controlPanel.addButtonA("+");
    controlPanel.addButtonA("-");
    controlPanel.addButtonA("*");
    controlPanel.addButtonA("÷");
    controlPanel.addButtonA("mod");
    controlPanel.addBreak();
    controlPanel.addButtonB("reset");
    controlPanel.addButtonB("C++");
    controlPanel.addButtonB("exec");
    controlPanel.addButtonB("trace");

    // create terminal content
    terminal = new Terminal(terminalView);
    terminal.addLine(PROGNAME + " " + VERSION);
    terminal.addLine(AGENTINFO);

    // create canvas and render context
    var canvas = document.createElement("canvas");
    canvas.appendChild(document.createTextNode("Browser does not support HTML5 Canvas"));
    canvas.setAttribute("id","canvas-main");
    canvasView.appendChild(canvas);
    canvas.width = canvasView.clientWidth;
    canvas.height = canvasView.clientHeight;
    context = new DrawingContext(canvas);
    context.drawScreen();
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
    var canvasView = document.getElementById('div-canvas-view');
    var canvas = document.getElementById('canvas-main');
    canvas.width = canvasView.clientWidth;
    canvas.height = canvasView.clientHeight;
    context.drawScreen();
}

// setup event handlers
window.onload = initPage;
window.onresize = resizePage;
